import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'

export class PlanNotFoundError extends Error {
  constructor(message = 'Plan not found') {
    super(message)
    this.name = 'PlanNotFoundError'
  }
}

export class PlanNotActiveError extends Error {
  constructor(message = 'Plan is no longer active') {
    super(message)
    this.name = 'PlanNotActiveError'
  }
}

export class DuplicateNameError extends Error {
  constructor(message = 'That name is already taken') {
    super(message)
    this.name = 'DuplicateNameError'
  }
}

export class ParticipantNotFoundError extends Error {
  constructor(message = 'Participant not found') {
    super(message)
    this.name = 'ParticipantNotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export async function getPlanByShareId(shareId: string) {
  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .select()
    .eq('share_id', shareId)
    .single()

  if (planError || !plan) {
    throw new PlanNotFoundError()
  }

  // Fetch dates and participants in parallel
  const [datesResult, participantsResult] = await Promise.all([
    supabaseAdmin
      .from('plan_dates')
      .select()
      .eq('plan_id', plan.id)
      .order('date', { ascending: true }),
    supabaseAdmin
      .from('participants')
      .select()
      .eq('plan_id', plan.id)
      .order('created_at', { ascending: true }),
  ])

  if (datesResult.error) {
    logger.error('Error fetching plan dates', { shareId, planId: plan.id }, datesResult.error)
    throw datesResult.error
  }

  if (participantsResult.error) {
    logger.error('Error fetching participants', { shareId, planId: plan.id }, participantsResult.error)
    throw participantsResult.error
  }

  return { plan, dates: datesResult.data ?? [], participants: participantsResult.data ?? [] }
}

export async function joinPlan(shareId: string, displayName: string) {
  // Validate name
  const trimmedName = displayName.trim()
  if (!trimmedName) {
    throw new ValidationError('Display name is required')
  }
  if (trimmedName.length > 50) {
    throw new ValidationError('Display name must be 50 characters or fewer')
  }

  // Fetch plan
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

  // Insert participant
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

  // Log event
  await supabaseAdmin.from('event_log').insert({
    plan_id: plan.id,
    participant_id: participant.id,
    event_type: 'participant_joined',
    metadata: { display_name: trimmedName },
  })

  return participant
}

export async function toggleDone(participantId: string) {
  // Fetch participant
  const { data: participant, error: pErr } = await supabaseAdmin
    .from('participants')
    .select()
    .eq('id', participantId)
    .single()

  if (pErr || !participant) {
    throw new ParticipantNotFoundError()
  }

  // Verify plan is active
  const { data: plan, error: planErr } = await supabaseAdmin
    .from('plans')
    .select('status')
    .eq('id', participant.plan_id)
    .single()

  if (planErr || !plan) {
    throw new Error('Plan not found')
  }

  if (plan.status !== 'active') {
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

  // When marking done, expire all active undo deadlines for this participant
  // so eliminated dates stay eliminated permanently
  if (newIsDone) {
    const { error: expireErr } = await supabaseAdmin
      .from('event_log')
      .update({ undo_deadline: null })
      .eq('participant_id', participantId)
      .gt('undo_deadline', new Date().toISOString())

    if (expireErr) {
      logger.error('Error expiring undo deadlines on done', { participantId }, expireErr)
      // Non-fatal — don't throw, the done toggle already succeeded
    }
  }

  // Log event
  await supabaseAdmin.from('event_log').insert({
    plan_id: participant.plan_id,
    participant_id: participantId,
    event_type: newIsDone ? 'participant_done' : 'participant_undone',
    metadata: {},
  })

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
