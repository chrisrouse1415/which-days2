import { nanoid } from 'nanoid'
import { supabaseAdmin } from './supabase-admin'
import { checkQuota } from './quota'

export class QuotaExceededError extends Error {
  constructor(message = 'Plan quota exceeded') {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

interface CreatePlanInput {
  title: string
  dates: string[] // ISO date strings (YYYY-MM-DD)
}

export async function createPlan(ownerClerkId: string, input: CreatePlanInput) {
  const { title, dates } = input

  // Validate title
  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    throw new ValidationError('Title is required')
  }
  if (trimmedTitle.length > 100) {
    throw new ValidationError('Title must be 100 characters or fewer')
  }

  // Validate dates
  if (!dates || dates.length === 0) {
    throw new ValidationError('At least one date is required')
  }
  if (dates.length > 30) {
    throw new ValidationError('Maximum 30 dates allowed')
  }

  // Check for duplicate dates
  const uniqueDates = Array.from(new Set(dates))
  if (uniqueDates.length !== dates.length) {
    throw new ValidationError('Duplicate dates are not allowed')
  }

  // Validate date format
  for (const date of uniqueDates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError(`Invalid date format: ${date}`)
    }
    const parsed = new Date(date + 'T00:00:00')
    if (isNaN(parsed.getTime())) {
      throw new ValidationError(`Invalid date: ${date}`)
    }
  }

  // Check quota
  const quota = await checkQuota(ownerClerkId)
  if (!quota.canCreate) {
    throw new QuotaExceededError(
      `You have reached the maximum of ${quota.maxPlans} active plans. Delete or lock an existing plan to create a new one.`
    )
  }

  // Generate share ID
  const shareId = nanoid(10)

  // Insert plan
  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .insert({
      owner_clerk_id: ownerClerkId,
      title: trimmedTitle,
      share_id: shareId,
    })
    .select()
    .single()

  if (planError) {
    console.error('Error creating plan:', planError)
    throw planError
  }

  // Insert dates
  const dateRows = uniqueDates.sort().map((date) => ({
    plan_id: plan.id,
    date,
  }))

  const { data: planDates, error: datesError } = await supabaseAdmin
    .from('plan_dates')
    .insert(dateRows)
    .select()

  if (datesError) {
    console.error('Error creating plan dates:', datesError)
    // Clean up the plan if dates fail
    await supabaseAdmin.from('plans').delete().eq('id', plan.id)
    throw datesError
  }

  return {
    plan,
    planDates,
    shareUrl: `/plan/${shareId}`,
    manageUrl: `/manage/${plan.id}`,
  }
}

export class PlanNotFoundError extends Error {
  constructor(message = 'Plan not found') {
    super(message)
    this.name = 'PlanNotFoundError'
  }
}

export class NotOwnerError extends Error {
  constructor(message = 'You do not own this plan') {
    super(message)
    this.name = 'NotOwnerError'
  }
}

export async function getOwnerPlans(clerkId: string) {
  const { data: plans, error } = await supabaseAdmin
    .from('plans')
    .select()
    .eq('owner_clerk_id', clerkId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching owner plans:', error)
    throw error
  }

  if (!plans || plans.length === 0) return []

  const planIds = plans.map((p) => p.id)

  // Fetch participant counts and done counts per plan
  const { data: participants, error: pErr } = await supabaseAdmin
    .from('participants')
    .select('plan_id, is_done')
    .in('plan_id', planIds)

  if (pErr) {
    console.error('Error fetching participants for owner plans:', pErr)
    throw pErr
  }

  const countMap: Record<string, { total: number; done: number }> = {}
  for (const p of participants ?? []) {
    if (!countMap[p.plan_id]) {
      countMap[p.plan_id] = { total: 0, done: 0 }
    }
    countMap[p.plan_id].total++
    if (p.is_done) countMap[p.plan_id].done++
  }

  return plans.map((plan) => ({
    ...plan,
    participantCount: countMap[plan.id]?.total ?? 0,
    doneCount: countMap[plan.id]?.done ?? 0,
  }))
}

export async function getPlanForOwner(planId: string, clerkId: string) {
  const { data: plan, error: planErr } = await supabaseAdmin
    .from('plans')
    .select()
    .eq('id', planId)
    .single()

  if (planErr || !plan) {
    throw new PlanNotFoundError()
  }

  if (plan.owner_clerk_id !== clerkId) {
    throw new NotOwnerError()
  }

  const { data: dates, error: datesErr } = await supabaseAdmin
    .from('plan_dates')
    .select()
    .eq('plan_id', planId)
    .order('date', { ascending: true })

  if (datesErr) {
    console.error('Error fetching plan dates:', datesErr)
    throw datesErr
  }

  const { data: participants, error: pErr } = await supabaseAdmin
    .from('participants')
    .select()
    .eq('plan_id', planId)
    .order('created_at', { ascending: true })

  if (pErr) {
    console.error('Error fetching participants:', pErr)
    throw pErr
  }

  return { plan, dates: dates ?? [], participants: participants ?? [] }
}

export async function getAvailabilityMatrix(planId: string) {
  const { data: dates, error: datesErr } = await supabaseAdmin
    .from('plan_dates')
    .select()
    .eq('plan_id', planId)
    .order('date', { ascending: true })

  if (datesErr) {
    console.error('Error fetching plan dates for matrix:', datesErr)
    throw datesErr
  }

  if (!dates || dates.length === 0) return { dates: [], participants: [], matrix: {} }

  const { data: participants, error: pErr } = await supabaseAdmin
    .from('participants')
    .select()
    .eq('plan_id', planId)
    .order('created_at', { ascending: true })

  if (pErr) {
    console.error('Error fetching participants for matrix:', pErr)
    throw pErr
  }

  const dateIds = dates.map((d) => d.id)
  const { data: availability, error: aErr } = await supabaseAdmin
    .from('availability')
    .select()
    .in('plan_date_id', dateIds)

  if (aErr) {
    console.error('Error fetching availability for matrix:', aErr)
    throw aErr
  }

  // Build matrix: { [planDateId]: { [participantId]: 'available' | 'unavailable' } }
  const matrix: Record<string, Record<string, string>> = {}
  for (const d of dates) {
    matrix[d.id] = {}
    for (const p of participants ?? []) {
      matrix[d.id][p.id] = 'available'
    }
  }
  for (const a of availability ?? []) {
    if (matrix[a.plan_date_id]) {
      matrix[a.plan_date_id][a.participant_id] = a.status
    }
  }

  return { dates, participants: participants ?? [], matrix }
}

export async function updatePlanStatus(
  planId: string,
  clerkId: string,
  status: 'locked' | 'deleted'
) {
  const { data: plan, error: planErr } = await supabaseAdmin
    .from('plans')
    .select()
    .eq('id', planId)
    .single()

  if (planErr || !plan) {
    throw new PlanNotFoundError()
  }

  if (plan.owner_clerk_id !== clerkId) {
    throw new NotOwnerError()
  }

  const { error: updateErr } = await supabaseAdmin
    .from('plans')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', planId)

  if (updateErr) {
    console.error('Error updating plan status:', updateErr)
    throw updateErr
  }

  return { status }
}

export async function forceReopenDate(planId: string, planDateId: string, clerkId: string) {
  // Verify ownership
  const { data: plan, error: planErr } = await supabaseAdmin
    .from('plans')
    .select()
    .eq('id', planId)
    .single()

  if (planErr || !plan) {
    throw new PlanNotFoundError()
  }

  if (plan.owner_clerk_id !== clerkId) {
    throw new NotOwnerError()
  }

  if (plan.status !== 'active') {
    throw new ValidationError('Plan is not active')
  }

  // Verify date belongs to plan and is eliminated
  const { data: planDate, error: pdErr } = await supabaseAdmin
    .from('plan_dates')
    .select()
    .eq('id', planDateId)
    .eq('plan_id', planId)
    .single()

  if (pdErr || !planDate) {
    throw new ValidationError('Date not found in this plan')
  }

  if (planDate.status !== 'eliminated') {
    throw new ValidationError('Date is not eliminated')
  }

  // Update date: status -> reopened, bump reopen_version
  const newVersion = (planDate.reopen_version ?? 0) + 1
  const { error: dateUpdateErr } = await supabaseAdmin
    .from('plan_dates')
    .update({
      status: 'reopened' as const,
      reopen_version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planDateId)

  if (dateUpdateErr) {
    console.error('Error reopening date:', dateUpdateErr)
    throw dateUpdateErr
  }

  // Clear all availability rows for this date (reset everyone to available)
  const { error: clearErr } = await supabaseAdmin
    .from('availability')
    .delete()
    .eq('plan_date_id', planDateId)

  if (clearErr) {
    console.error('Error clearing availability for reopened date:', clearErr)
    throw clearErr
  }

  // Flag all done participants with needs_review = true
  const { data: flagged, error: flagErr } = await supabaseAdmin
    .from('participants')
    .update({ needs_review: true, updated_at: new Date().toISOString() })
    .eq('plan_id', planId)
    .eq('is_done', true)
    .select('id')

  if (flagErr) {
    console.error('Error flagging participants for review:', flagErr)
    throw flagErr
  }

  // Log event
  await supabaseAdmin.from('event_log').insert({
    plan_id: planId,
    event_type: 'date_force_reopened',
    metadata: { plan_date_id: planDateId, reopen_version: newVersion },
  })

  return {
    date: { ...planDate, status: 'reopened' as const, reopen_version: newVersion },
    reopenVersion: newVersion,
    reviewFlaggedCount: flagged?.length ?? 0,
  }
}
