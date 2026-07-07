import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'
import { UNDO_WINDOW_MS } from './constants'
import {
  DateLockedError,
  ParticipantNotFoundError,
  PlanNotActiveError,
  PlanNotFoundError,
  UndoExpiredError,
  UndoNotAllowedError,
  ValidationError,
} from './errors'

export async function toggleUnavailable(participantId: string, planDateId: string) {
  const [participantResult, planDateResult] = await Promise.all([
    supabaseAdmin.from('participants').select().eq('id', participantId).single(),
    supabaseAdmin.from('plan_dates').select().eq('id', planDateId).single(),
  ])

  const { data: participant, error: pErr } = participantResult
  if (pErr || !participant) {
    throw new ParticipantNotFoundError()
  }

  // Participants who have marked "done" cannot change availability
  if (participant.is_done) {
    throw new PlanNotActiveError('You must un-mark "done" before changing availability')
  }

  const { data: planDate, error: pdErr } = planDateResult
  if (pdErr || !planDate) {
    throw new ValidationError('Date not found')
  }

  if (planDate.plan_id !== participant.plan_id) {
    throw new ValidationError('Date does not belong to this plan')
  }

  if (planDate.status === 'locked') {
    throw new DateLockedError()
  }

  const { data: plan, error: planErr } = await supabaseAdmin
    .from('plans')
    .select('status')
    .eq('id', participant.plan_id)
    .single()

  if (planErr || !plan) {
    throw new PlanNotFoundError()
  }

  if (plan.status !== 'active') {
    throw new PlanNotActiveError()
  }

  const { data: availability, error: upsertErr } = await supabaseAdmin
    .from('availability')
    .upsert(
      {
        participant_id: participantId,
        plan_date_id: planDateId,
        status: 'unavailable' as const,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'participant_id,plan_date_id' }
    )
    .select()
    .single()

  if (upsertErr) {
    logger.error('Error upserting availability', { participantId, planDateId }, upsertErr)
    throw upsertErr
  }

  const { error: dateUpdateErr } = await supabaseAdmin
    .from('plan_dates')
    .update({ status: 'eliminated' as const, updated_at: new Date().toISOString() })
    .eq('id', planDateId)

  if (dateUpdateErr) {
    logger.error('Error updating date status', { participantId, planDateId }, dateUpdateErr)
    throw dateUpdateErr
  }

  const undoDeadline = new Date(Date.now() + UNDO_WINDOW_MS).toISOString()

  const { data: eventLog, error: logErr } = await supabaseAdmin
    .from('event_log')
    .insert({
      plan_id: participant.plan_id,
      participant_id: participantId,
      event_type: 'date_marked_unavailable',
      metadata: { plan_date_id: planDateId },
      undo_deadline: undoDeadline,
    })
    .select()
    .single()

  if (logErr) {
    logger.error('Error inserting event log', { participantId, planDateId }, logErr)
    throw logErr
  }

  return {
    availability,
    dateStatus: 'eliminated' as const,
    eventLogId: eventLog.id,
    undoDeadline,
  }
}

export async function undoUnavailable(participantId: string, eventLogId: string) {
  const { data: event, error: eventErr } = await supabaseAdmin
    .from('event_log')
    .select()
    .eq('id', eventLogId)
    .single()

  if (eventErr || !event) {
    throw new UndoNotAllowedError('Event not found')
  }

  // Verify actor matches
  if (event.participant_id !== participantId) {
    throw new UndoNotAllowedError()
  }

  // Check deadline
  if (!event.undo_deadline || new Date(event.undo_deadline) < new Date()) {
    throw new UndoExpiredError()
  }

  const metadata = event.metadata as { plan_date_id?: string }
  const planDateId = metadata.plan_date_id
  if (!planDateId) {
    throw new UndoNotAllowedError('Event metadata missing plan_date_id')
  }

  const { data: availability, error: availErr } = await supabaseAdmin
    .from('availability')
    .update({ status: 'available' as const, updated_at: new Date().toISOString() })
    .eq('participant_id', participantId)
    .eq('plan_date_id', planDateId)
    .select()
    .single()

  if (availErr) {
    logger.error('Error reverting availability', { participantId, planDateId }, availErr)
    throw availErr
  }

  // Check if any OTHER unavailable marks remain on this date
  const { count, error: countErr } = await supabaseAdmin
    .from('availability')
    .select('*', { count: 'exact', head: true })
    .eq('plan_date_id', planDateId)
    .eq('status', 'unavailable')

  if (countErr) {
    logger.error('Error counting unavailable marks', { participantId, planDateId }, countErr)
    throw countErr
  }

  // If no other unavailable marks, restore date to viable
  let dateStatus: 'viable' | 'eliminated' = 'eliminated'
  if ((count ?? 0) === 0) {
    dateStatus = 'viable'
    const { error: dateUpdateErr } = await supabaseAdmin
      .from('plan_dates')
      .update({ status: 'viable' as const, updated_at: new Date().toISOString() })
      .eq('id', planDateId)

    if (dateUpdateErr) {
      logger.error('Error restoring date status', { participantId, planDateId }, dateUpdateErr)
      throw dateUpdateErr
    }
  }

  // Null out undo_deadline on the original event
  await supabaseAdmin
    .from('event_log')
    .update({ undo_deadline: null })
    .eq('id', eventLogId)

  return { availability, dateStatus }
}
