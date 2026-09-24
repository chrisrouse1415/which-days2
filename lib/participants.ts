import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'
import { MAX_NAME_LENGTH, MAX_PARTICIPANTS_PER_PLAN } from './constants'
import {
  DuplicateNameError,
  ParticipantNotFoundError,
  PlanFullError,
  PlanNotActiveError,
  PlanNotFoundError,
  ValidationError,
} from './errors'

export async function joinPlan(shareId: string, displayName: string) {
  const trimmedName = displayName.trim()
  if (!trimmedName) {
    throw new ValidationError('Display name is required')
  }
  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new ValidationError(`Display name must be ${MAX_NAME_LENGTH} characters or fewer`)
  }

  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .select()
    .eq('share_id', shareId)
    .single()

  if (planError || !plan) {
    throw new PlanNotFoundError()
  }

  if (plan.status !== 'active') {
    throw new PlanNotActiveError()
  }

  // Cap participants per plan so a leaked link can't be used to flood a plan
  const { count, error: countErr } = await supabaseAdmin
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', plan.id)

  if (countErr) {
    logger.error('Error counting participants', { shareId, planId: plan.id }, countErr)
    throw countErr
  }

  if ((count ?? 0) >= MAX_PARTICIPANTS_PER_PLAN) {
    throw new PlanFullError()
  }

  const { data: participant, error: insertError } = await supabaseAdmin
    .from('participants')
    .insert({
      plan_id: plan.id,
      display_name: trimmedName,
    })
    .select()
    .single()

  if (insertError) {
    // Postgres unique violation = duplicate name in this plan
    if (insertError.code === '23505') {
      throw new DuplicateNameError()
    }
    logger.error('Error inserting participant', { shareId, planId: plan.id }, insertError)
    throw insertError
  }

  await supabaseAdmin.from('event_log').insert({
    plan_id: plan.id,
    participant_id: participant.id,
    event_type: 'participant_joined',
    metadata: { display_name: trimmedName },
  })

  return participant
}

export async function toggleDone(participantId: string) {
  const { data: participant, error: pErr } = await supabaseAdmin
    .from('participants')
    .select('*, plan:plans(status)')
    .eq('id', participantId)
    .single()

  if (pErr || !participant) {
    throw new ParticipantNotFoundError()
  }

  if (!participant.plan) {
    throw new PlanNotFoundError()
  }

  if (participant.plan.status !== 'active') {
    throw new PlanNotActiveError()
  }

  const newIsDone = !participant.is_done

  const { error: updateErr } = await supabaseAdmin
    .from('participants')
    .update({ is_done: newIsDone, updated_at: new Date().toISOString() })
    .eq('id', participantId)

  if (updateErr) {
    logger.error('Error toggling done', { participantId }, updateErr)
    throw updateErr
  }

  // When marking done, expire all active undo deadlines for this participant so
  // crossed-off dates stay crossed off. Independent of the log insert, so run together.
  const [expireResult] = await Promise.all([
    newIsDone
      ? supabaseAdmin
          .from('event_log')
          .update({ undo_deadline: null })
          .eq('participant_id', participantId)
          .gt('undo_deadline', new Date().toISOString())
      : Promise.resolve({ error: null }),
    supabaseAdmin.from('event_log').insert({
      plan_id: participant.plan_id,
      participant_id: participantId,
      event_type: newIsDone ? 'participant_done' : 'participant_undone',
      metadata: {},
    }),
  ])

  if (expireResult.error) {
    logger.error('Error expiring undo deadlines on done', { participantId }, expireResult.error)
    // Non-fatal — the done toggle already succeeded
  }

  return { is_done: newIsDone }
}

export async function clearNeedsReview(participantId: string) {
  const { data: participant, error: pErr } = await supabaseAdmin
    .from('participants')
    .select()
    .eq('id', participantId)
    .single()

  if (pErr || !participant) {
    throw new ParticipantNotFoundError()
  }

  const { error: updateErr } = await supabaseAdmin
    .from('participants')
    .update({ needs_review: false, updated_at: new Date().toISOString() })
    .eq('id', participantId)

  if (updateErr) {
    logger.error('Error clearing needs_review', { participantId }, updateErr)
    throw updateErr
  }

  await supabaseAdmin.from('event_log').insert({
    plan_id: participant.plan_id,
    participant_id: participantId,
    event_type: 'needs_review_cleared',
    metadata: {},
  })
}
