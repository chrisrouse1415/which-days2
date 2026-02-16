import { nanoid } from 'nanoid'
import { supabaseAdmin } from './supabase-admin'
import { checkQuota } from './quota'
import { logger } from './logger'

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

interface PlanInput {
  title: string
  dates: string[] // ISO date strings (YYYY-MM-DD)
}

interface EditPlanInput {
  title?: string
  dates?: string[]
}

export async function createPlan(ownerClerkId: string, input: PlanInput) {
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
    logger.error('Error creating plan', { userId: ownerClerkId }, planError)
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
    logger.error('Error creating plan dates', { planId: plan.id, userId: ownerClerkId }, datesError)
    // Clean up the plan if dates fail
    await supabaseAdmin.from('plans').delete().eq('id', plan.id)
    throw datesError
  }

  // Log event
  await supabaseAdmin.from('event_log').insert({
    plan_id: plan.id,
    event_type: 'plan_created',
    metadata: { title: trimmedTitle, dateCount: uniqueDates.length },
  })

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
    logger.error('Error fetching owner plans', { userId: clerkId }, error)
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
    logger.error('Error fetching participants for owner plans', { userId: clerkId }, pErr)
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
    logger.error('Error fetching plan dates', { planId }, datesErr)
    throw datesErr
  }

  const { data: participants, error: pErr } = await supabaseAdmin
    .from('participants')
    .select()
    .eq('plan_id', planId)
    .order('created_at', { ascending: true })

  if (pErr) {
    logger.error('Error fetching participants', { planId }, pErr)
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
    logger.error('Error fetching plan dates for matrix', { planId }, datesErr)
    throw datesErr
  }

  if (!dates || dates.length === 0) return { dates: [], participants: [], matrix: {} }

  const { data: participants, error: pErr } = await supabaseAdmin
    .from('participants')
    .select()
    .eq('plan_id', planId)
    .order('created_at', { ascending: true })

  if (pErr) {
    logger.error('Error fetching participants for matrix', { planId }, pErr)
    throw pErr
  }

  const dateIds = dates.map((d) => d.id)
  const { data: availability, error: aErr } = await supabaseAdmin
    .from('availability')
    .select()
    .in('plan_date_id', dateIds)

  if (aErr) {
    logger.error('Error fetching availability for matrix', { planId }, aErr)
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
  status: 'locked' | 'deleted' | 'active'
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
    logger.error('Error updating plan status', { planId, userId: clerkId }, updateErr)
    throw updateErr
  }

  // Log event
  const eventType = status === 'locked' ? 'plan_locked' : status === 'active' ? 'plan_unlocked' : 'plan_deleted'
  await supabaseAdmin.from('event_log').insert({
    plan_id: planId,
    event_type: eventType,
    metadata: {},
  })

  return { status }
}

export async function editPlan(planId: string, clerkId: string, input: EditPlanInput) {
  // Verify ownership + active status
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
    throw new ValidationError('Only active plans can be edited')
  }

  const { title, dates } = input

  // Validate title if provided
  if (title !== undefined) {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      throw new ValidationError('Title is required')
    }
    if (trimmedTitle.length > 100) {
      throw new ValidationError('Title must be 100 characters or fewer')
    }

    const { error: titleErr } = await supabaseAdmin
      .from('plans')
      .update({ title: trimmedTitle, updated_at: new Date().toISOString() })
      .eq('id', planId)

    if (titleErr) {
      logger.error('Error updating plan title', { planId, userId: clerkId }, titleErr)
      throw titleErr
    }
  }

  // Diff and update dates if provided
  let datesChanged = false
  if (dates !== undefined) {
    // Validate dates
    if (!dates || dates.length === 0) {
      throw new ValidationError('At least one date is required')
    }
    if (dates.length > 30) {
      throw new ValidationError('Maximum 30 dates allowed')
    }

    const uniqueDates = Array.from(new Set(dates))
    if (uniqueDates.length !== dates.length) {
      throw new ValidationError('Duplicate dates are not allowed')
    }

    for (const date of uniqueDates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ValidationError(`Invalid date format: ${date}`)
      }
      const parsed = new Date(date + 'T00:00:00')
      if (isNaN(parsed.getTime())) {
        throw new ValidationError(`Invalid date: ${date}`)
      }
    }

    // Fetch current dates
    const { data: currentDates, error: cdErr } = await supabaseAdmin
      .from('plan_dates')
      .select()
      .eq('plan_id', planId)

    if (cdErr) {
      logger.error('Error fetching current plan dates', { planId }, cdErr)
      throw cdErr
    }

    const currentDateStrings = new Set((currentDates ?? []).map((d) => d.date))
    const newDateStrings = new Set(uniqueDates)

    // Dates to remove: in current but not in new
    const datesToRemove = (currentDates ?? []).filter((d) => !newDateStrings.has(d.date))
    // Dates to add: in new but not in current
    const datesToAdd = uniqueDates.filter((d) => !currentDateStrings.has(d))

    if (datesToRemove.length > 0 || datesToAdd.length > 0) {
      datesChanged = true

      // Remove dates (availability cascades via ON DELETE CASCADE)
      if (datesToRemove.length > 0) {
        const removeIds = datesToRemove.map((d) => d.id)
        const { error: delErr } = await supabaseAdmin
          .from('plan_dates')
          .delete()
          .in('id', removeIds)

        if (delErr) {
          logger.error('Error removing plan dates', { planId, removeIds }, delErr)
          throw delErr
        }
      }

      // Add new dates
      if (datesToAdd.length > 0) {
        const dateRows = datesToAdd.sort().map((date) => ({
          plan_id: planId,
          date,
        }))

        const { error: insErr } = await supabaseAdmin
          .from('plan_dates')
          .insert(dateRows)

        if (insErr) {
          logger.error('Error inserting new plan dates', { planId }, insErr)
          throw insErr
        }
      }

      // Flag done participants as needs_review
      const { error: flagErr } = await supabaseAdmin
        .from('participants')
        .update({ needs_review: true, updated_at: new Date().toISOString() })
        .eq('plan_id', planId)
        .eq('is_done', true)

      if (flagErr) {
        logger.error('Error flagging participants for review after edit', { planId }, flagErr)
        throw flagErr
      }
    }
  }

  // Log event
  await supabaseAdmin.from('event_log').insert({
    plan_id: planId,
    event_type: 'plan_edited',
    metadata: {
      titleChanged: title !== undefined,
      datesChanged,
    },
  })

  return getPlanForOwner(planId, clerkId)
}

export async function resetPlan(planId: string, clerkId: string) {
  // Verify ownership + active status
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
    throw new ValidationError('Only active plans can be reset')
  }

  // Delete all participants (availability cascades via ON DELETE CASCADE)
  const { error: delErr } = await supabaseAdmin
    .from('participants')
    .delete()
    .eq('plan_id', planId)

  if (delErr) {
    logger.error('Error deleting participants during reset', { planId }, delErr)
    throw delErr
  }

  // Reset all plan_dates back to viable
  const { error: dateErr } = await supabaseAdmin
    .from('plan_dates')
    .update({ status: 'viable' as const, reopen_version: 0, updated_at: new Date().toISOString() })
    .eq('plan_id', planId)

  if (dateErr) {
    logger.error('Error resetting plan dates during reset', { planId }, dateErr)
    throw dateErr
  }

  // Log event
  await supabaseAdmin.from('event_log').insert({
    plan_id: planId,
    event_type: 'plan_reset',
    metadata: {},
  })

  return getPlanForOwner(planId, clerkId)
}

export async function getPlanWithMatrix(planId: string, clerkId: string) {
  // Query 1: Fetch plan + verify ownership
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

  // Queries 2 & 3: Fetch dates + participants in parallel
  const [datesResult, participantsResult] = await Promise.all([
    supabaseAdmin
      .from('plan_dates')
      .select()
      .eq('plan_id', planId)
      .order('date', { ascending: true }),
    supabaseAdmin
      .from('participants')
      .select()
      .eq('plan_id', planId)
      .order('created_at', { ascending: true }),
  ])

  if (datesResult.error) {
    logger.error('Error fetching plan dates', { planId }, datesResult.error)
    throw datesResult.error
  }
  if (participantsResult.error) {
    logger.error('Error fetching participants', { planId }, participantsResult.error)
    throw participantsResult.error
  }

  const dates = datesResult.data ?? []
  const participants = participantsResult.data ?? []

  // Query 4: Fetch availability
  const dateIds = dates.map((d) => d.id)
  let matrix: Record<string, Record<string, string>> = {}

  if (dateIds.length > 0) {
    const { data: availability, error: aErr } = await supabaseAdmin
      .from('availability')
      .select()
      .in('plan_date_id', dateIds)

    if (aErr) {
      logger.error('Error fetching availability for matrix', { planId }, aErr)
      throw aErr
    }

    // Build matrix: { [planDateId]: { [participantId]: 'available' | 'unavailable' } }
    for (const d of dates) {
      matrix[d.id] = {}
      for (const p of participants) {
        matrix[d.id][p.id] = 'available'
      }
    }
    for (const a of availability ?? []) {
      if (matrix[a.plan_date_id]) {
        matrix[a.plan_date_id][a.participant_id] = a.status
      }
    }
  }

  return { plan, dates, participants, matrix }
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
    logger.error('Error reopening date', { planId, planDateId }, dateUpdateErr)
    throw dateUpdateErr
  }

  // Clear all availability rows for this date (reset everyone to available)
  const { error: clearErr } = await supabaseAdmin
    .from('availability')
    .delete()
    .eq('plan_date_id', planDateId)

  if (clearErr) {
    logger.error('Error clearing availability for reopened date', { planId, planDateId }, clearErr)
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
    logger.error('Error flagging participants for review', { planId, planDateId }, flagErr)
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
