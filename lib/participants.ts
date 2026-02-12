import { supabaseAdmin } from './supabase-admin'

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

  const { data: dates, error: datesError } = await supabaseAdmin
    .from('plan_dates')
    .select()
    .eq('plan_id', plan.id)
    .order('date', { ascending: true })

  if (datesError) {
    console.error('Error fetching plan dates:', datesError)
    throw datesError
  }

  const { data: participants, error: participantsError } = await supabaseAdmin
    .from('participants')
    .select()
    .eq('plan_id', plan.id)
    .order('created_at', { ascending: true })

  if (participantsError) {
    console.error('Error fetching participants:', participantsError)
    throw participantsError
  }

  return { plan, dates: dates ?? [], participants: participants ?? [] }
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
    console.error('Error inserting participant:', insertError)
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
