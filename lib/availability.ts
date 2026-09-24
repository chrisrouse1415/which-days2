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
    supabaseAdmin.from('participants').select('*, plan:plans(status)').eq('id', participantId).single(),
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

  if (!participant.plan) {
    throw new PlanNotFoundError()
  }

  if (participant.plan.status !== 'active') {
    throw new PlanNotActiveError()
  }

  const now = new Date().toISOString()
  const undoDeadline = new Date(Date.now() + UNDO_WINDOW_MS).toISOString()

  // Independent writes — run together to save round trips
  const [availabilityResult, dateResult, logResult] = await Promise.all([
    supabaseAdmin
      .from('availability')
      .upsert(
        {
          participant_id: participantId,
          plan_date_id: planDateId,
          status: 'unavailable' as const,
          updated_at: now,
        },
        { onConflict: 'participant_id,plan_date_id' }
      )
      .select()
      .single(),
    // Never overwrite a day the organizer picked in the meantime
    supabaseAdmin
      .from('plan_dates')
      .update({ status: 'eliminated' as const, updated_at: now })
      .eq('id', planDateId)
      .neq('status', 'locked'),
    supabaseAdmin
      .from('event_log')
      .insert({
        plan_id: participant.plan_id,
        participant_id: participantId,
        event_type: 'date_marked_unavailable',
        metadata: { plan_date_id: planDateId },
        undo_deadline: undoDeadline,
      })
      .select()
      .single(),
  ])

  const { data: availability, error: upsertErr } = availabilityResult
  if (upsertErr) {
    logger.error('Error upserting availability', { participantId, planDateId }, upsertErr)
    throw upsertErr
  }

  if (dateResult.error) {
    logger.error('Error updating date status', { participantId, planDateId }, dateResult.error)
    throw dateResult.error
  }

  const { data: eventLog, error: logErr } = logResult
  if (logErr || !eventLog) {
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
    .select('*, plan:plans(status)')
    .eq('id', eventLogId)
    .single()

  if (eventErr || !event) {
    throw new UndoNotAllowedError('Event not found')
  }

  // Once the organizer has picked a day (or closed the plan), nothing can change
  if (event.plan?.status !== 'active') {
    throw new PlanNotActiveError()
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

  // If no other unavailable marks, the date is open again. Clearing the undo
  // deadline doesn't depend on that, so both writes go together.
  const reopen = (count ?? 0) === 0
  const dateStatus: 'viable' | 'eliminated' = reopen ? 'viable' : 'eliminated'
  const [dateResult] = await Promise.all([
    reopen
      ? supabaseAdmin
          .from('plan_dates')
          .update({ status: 'viable' as const, updated_at: new Date().toISOString() })
          .eq('id', planDateId)
          .eq('status', 'eliminated')
      : Promise.resolve({ error: null }),
    supabaseAdmin.from('event_log').update({ undo_deadline: null }).eq('id', eventLogId),
  ])

  if (dateResult.error) {
    logger.error('Error restoring date status', { participantId, planDateId }, dateResult.error)
    throw dateResult.error
  }

  return { availability, dateStatus }
}
