import { supabaseAdmin } from './supabase-admin'
import { ParticipantNotFoundError, PlanNotActiveError } from './participants'

export class UndoExpiredError extends Error {
  constructor(message = 'Undo window has expired') {
    super(message)
    this.name = 'UndoExpiredError'
  }
}

export class UndoNotAllowedError extends Error {
  constructor(message = 'You cannot undo this action') {
    super(message)
    this.name = 'UndoNotAllowedError'
  }
}

export class DateLockedError extends Error {
  constructor(message = 'This date is locked') {
    super(message)
    this.name = 'DateLockedError'
  }
}

export async function toggleUnavailable(participantId: string, planDateId: string) {
  // Fetch participant
  const { data: participant, error: pErr } = await supabaseAdmin
    .from('participants')
    .select()
    .eq('id', participantId)
    .single()

  if (pErr || !participant) {
    throw new ParticipantNotFoundError()
  }

  // Fetch plan date and verify same plan
  const { data: planDate, error: pdErr } = await supabaseAdmin
    .from('plan_dates')
    .select()
    .eq('id', planDateId)
    .single()

  if (pdErr || !planDate) {
    throw new Error('Date not found')
  }

  if (planDate.plan_id !== participant.plan_id) {
    throw new Error('Date does not belong to this plan')
  }

  // Check date is not locked
  if (planDate.status === 'locked') {
    throw new DateLockedError()
  }

  // Check plan is active
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

  // Upsert availability as unavailable
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
    console.error('Error upserting availability:', upsertErr)
    throw upsertErr
  }

  // Set date status to eliminated
  const { error: dateUpdateErr } = await supabaseAdmin
    .from('plan_dates')
    .update({ status: 'eliminated' as const, updated_at: new Date().toISOString() })
    .eq('id', planDateId)

  if (dateUpdateErr) {
    console.error('Error updating date status:', dateUpdateErr)
    throw dateUpdateErr
  }

  // Insert event log with undo deadline
  const undoDeadline = new Date(Date.now() + 30_000).toISOString()

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
    console.error('Error inserting event log:', logErr)
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
  // Fetch event log
  const { data: event, error: eventErr } = await supabaseAdmin
    .from('event_log')
    .select()
    .eq('id', eventLogId)
    .single()

  if (eventErr || !event) {
    throw new Error('Event not found')
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
    throw new Error('Event metadata missing plan_date_id')
  }

  // Set availability back to available
  const { data: availability, error: availErr } = await supabaseAdmin
    .from('availability')
    .update({ status: 'available' as const, updated_at: new Date().toISOString() })
    .eq('participant_id', participantId)
    .eq('plan_date_id', planDateId)
    .select()
    .single()

  if (availErr) {
    console.error('Error reverting availability:', availErr)
    throw availErr
  }

  // Check if any OTHER unavailable marks remain on this date
  const { count, error: countErr } = await supabaseAdmin
    .from('availability')
    .select('*', { count: 'exact', head: true })
    .eq('plan_date_id', planDateId)
    .eq('status', 'unavailable')

  if (countErr) {
    console.error('Error counting unavailable marks:', countErr)
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
      console.error('Error restoring date status:', dateUpdateErr)
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

export async function getParticipantAvailability(participantId: string, planId: string) {
  // Get all plan_date IDs for this plan
  const { data: planDates, error: pdErr } = await supabaseAdmin
    .from('plan_dates')
    .select('id')
    .eq('plan_id', planId)

  if (pdErr) {
    console.error('Error fetching plan dates:', pdErr)
    throw pdErr
  }

  const dateIds = (planDates ?? []).map((d) => d.id)
  if (dateIds.length === 0) return []

  const { data, error } = await supabaseAdmin
    .from('availability')
    .select()
    .eq('participant_id', participantId)
    .in('plan_date_id', dateIds)

  if (error) {
    console.error('Error fetching availability:', error)
    throw error
  }

  return data ?? []
}

export async function getPlanAvailabilitySummary(planId: string) {
  // Fetch all plan dates
  const { data: planDates, error: pdErr } = await supabaseAdmin
    .from('plan_dates')
    .select()
    .eq('plan_id', planId)
    .order('date', { ascending: true })

  if (pdErr) {
    console.error('Error fetching plan dates:', pdErr)
    throw pdErr
  }

  if (!planDates || planDates.length === 0) return []

  const dateIds = planDates.map((d) => d.id)

  // Fetch all unavailable availability rows for these dates
  const { data: unavailable, error: availErr } = await supabaseAdmin
    .from('availability')
    .select('plan_date_id, participant_id')
    .in('plan_date_id', dateIds)
    .eq('status', 'unavailable')

  if (availErr) {
    console.error('Error fetching availability summary:', availErr)
    throw availErr
  }

  // Fetch participant names for display
  const participantIds = Array.from(new Set((unavailable ?? []).map((a) => a.participant_id)))
  let participantMap: Record<string, string> = {}

  if (participantIds.length > 0) {
    const { data: participants, error: pErr } = await supabaseAdmin
      .from('participants')
      .select('id, display_name')
      .in('id', participantIds)

    if (!pErr && participants) {
      for (const p of participants) {
        participantMap[p.id] = p.display_name
      }
    }
  }

  // Build summary per date
  return planDates.map((date) => {
    const dateUnavailable = (unavailable ?? []).filter((a) => a.plan_date_id === date.id)
    return {
      planDateId: date.id,
      date: date.date,
      status: date.status,
      unavailableCount: dateUnavailable.length,
      unavailableBy: dateUnavailable.map((a) => ({
        participantId: a.participant_id,
        displayName: participantMap[a.participant_id] ?? 'Unknown',
      })),
    }
  })
}
