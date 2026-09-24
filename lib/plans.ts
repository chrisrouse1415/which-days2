import { nanoid } from 'nanoid'
import { supabaseAdmin } from './supabase-admin'
import { checkQuota } from './quota'
import { logger } from './logger'
import { MAX_DATES, MAX_TITLE_LENGTH } from './constants'
import {
  NotOwnerError,
  PlanNotFoundError,
  QuotaExceededError,
  ValidationError,
} from './errors'

interface PlanInput {
  title: string
  dates: string[] // ISO date strings (YYYY-MM-DD)
}

interface EditPlanInput {
  title?: string
  dates?: string[]
}

function validateTitle(title: unknown): string {
  if (typeof title !== 'string') {
    throw new ValidationError('Title is required')
  }
  const trimmed = title.trim()
  if (!trimmed) {
    throw new ValidationError('Title is required')
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`Title must be ${MAX_TITLE_LENGTH} characters or fewer`)
  }
  return trimmed
}

function validateDates(dates: unknown): string[] {
  if (!Array.isArray(dates) || dates.length === 0) {
    throw new ValidationError('At least one date is required')
  }
  if (dates.length > MAX_DATES) {
    throw new ValidationError(`Maximum ${MAX_DATES} dates allowed`)
  }

  const uniqueDates = Array.from(new Set(dates))
  if (uniqueDates.length !== dates.length) {
    throw new ValidationError('Duplicate dates are not allowed')
  }

  for (const date of uniqueDates) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError(`Invalid date format: ${String(date)}`)
    }
    const parsed = new Date(date + 'T00:00:00')
    if (isNaN(parsed.getTime())) {
      throw new ValidationError(`Invalid date: ${date}`)
    }
  }

  return uniqueDates as string[]
}

/**
 * Reject dates before yesterday (UTC). The one-day slack covers organizers whose
 * local "today" is behind UTC.
 */
function assertNotPast(dates: string[]) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const past = dates.find((d) => d < cutoff)
  if (past) {
    throw new ValidationError(`Dates in the past can't be added: ${past}`)
  }
}

async function getOwnedPlan(planId: string, clerkId: string) {
  const { data: plan, error } = await supabaseAdmin
    .from('plans')
    .select()
    .eq('id', planId)
    .single()

  if (error || !plan) {
    throw new PlanNotFoundError()
  }
  if (plan.owner_clerk_id !== clerkId) {
    throw new NotOwnerError()
  }
  return plan
}

export async function createPlan(ownerClerkId: string, input: PlanInput) {
  const trimmedTitle = validateTitle(input.title)
  const uniqueDates = validateDates(input.dates)
  assertNotPast(uniqueDates)

  const quota = await checkQuota(ownerClerkId)
  if (!quota.canCreate) {
    throw new QuotaExceededError(
      `You have reached the maximum of ${quota.maxPlans} plans. Delete an existing plan to create a new one.`
    )
  }

  const shareId = nanoid(10)

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

export async function getOwnerPlans(clerkId: string) {
  // One round trip: plans with just enough of their participants and dates to summarise
  const { data: plans, error } = await supabaseAdmin
    .from('plans')
    .select('*, participants(is_done), plan_dates(date, status)')
    .eq('owner_clerk_id', clerkId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching owner plans', { userId: clerkId }, error)
    throw error
  }

  return (plans ?? []).map(({ participants, plan_dates: planDates, ...plan }) => {
    let openCount = 0
    let pickedDate: string | null = null
    for (const d of planDates ?? []) {
      if (d.status === 'viable' || d.status === 'reopened') openCount++
      if (d.status === 'locked') pickedDate = d.date
    }
    return {
      ...plan,
      participantCount: participants?.length ?? 0,
      doneCount: participants?.filter((p) => p.is_done).length ?? 0,
      dateCount: planDates?.length ?? 0,
      openCount,
      pickedDate,
    }
  })
}

export async function getPlanForOwner(planId: string, clerkId: string) {
  const plan = await getOwnedPlan(planId, clerkId)

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

  return { plan, dates: datesResult.data ?? [], participants: participantsResult.data ?? [] }
}

export async function updatePlanStatus(
  planId: string,
  clerkId: string,
  status: 'locked' | 'deleted' | 'active'
) {
  const plan = await getOwnedPlan(planId, clerkId)

  // Prevent re-activating deleted plans
  if (plan.status === 'deleted') {
    throw new ValidationError('Deleted plans cannot be modified')
  }

  // Only locked plans can be unlocked (set to active)
  if (status === 'active' && plan.status !== 'locked') {
    throw new ValidationError('Only locked plans can be unlocked')
  }

  const { error: updateErr } = await supabaseAdmin
    .from('plans')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', planId)

  if (updateErr) {
    logger.error('Error updating plan status', { planId, userId: clerkId }, updateErr)
    throw updateErr
  }

  // Reopening a decided plan un-picks its day so it can be crossed off or picked again
  if (status === 'active') {
    const { error: unpickErr } = await supabaseAdmin
      .from('plan_dates')
      .update({ status: 'viable' as const, updated_at: new Date().toISOString() })
      .eq('plan_id', planId)
      .eq('status', 'locked')

    if (unpickErr) {
      logger.error('Error un-picking plan date', { planId }, unpickErr)
      throw unpickErr
    }
  }

  const eventType = status === 'locked' ? 'plan_locked' : status === 'active' ? 'plan_unlocked' : 'plan_deleted'
  await supabaseAdmin.from('event_log').insert({
    plan_id: planId,
    event_type: eventType,
    metadata: {},
  })

  return { status }
}

/**
 * Organizer picks the final day: that date becomes "locked" (shown as Picked) and
 * the plan closes to further changes. Unlocking the plan (status → active) undoes it.
 */
export async function pickDate(planId: string, planDateId: string, clerkId: string) {
  const plan = await getOwnedPlan(planId, clerkId)

  if (plan.status !== 'active') {
    throw new ValidationError('Only open plans can have a day picked')
  }

  const { data: planDate, error: pdErr } = await supabaseAdmin
    .from('plan_dates')
    .select()
    .eq('id', planDateId)
    .single()

  if (pdErr || !planDate || planDate.plan_id !== planId) {
    throw new ValidationError('Date not found in this plan')
  }
  if (planDate.status !== 'viable' && planDate.status !== 'reopened') {
    throw new ValidationError('Only open days can be picked')
  }

  const now = new Date().toISOString()
  // Guarded on status so a cross-off landing at the same moment can't be overwritten
  const { data: picked, error: dateErr } = await supabaseAdmin
    .from('plan_dates')
    .update({ status: 'locked' as const, updated_at: now })
    .eq('id', planDateId)
    .in('status', ['viable', 'reopened'])
    .select('id')

  if (dateErr) {
    logger.error('Error picking date', { planId, planDateId }, dateErr)
    throw dateErr
  }
  if (!picked || picked.length === 0) {
    throw new ValidationError('That day was just crossed off — pick another')
  }

  const [planResult] = await Promise.all([
    supabaseAdmin.from('plans').update({ status: 'locked' as const, updated_at: now }).eq('id', planId),
    supabaseAdmin.from('event_log').insert({
      plan_id: planId,
      event_type: 'date_picked',
      metadata: { plan_date_id: planDateId },
    }),
  ])

  if (planResult.error) {
    logger.error('Error locking plan after pick', { planId }, planResult.error)
    throw planResult.error
  }

  return { status: 'locked' as const, pickedDateId: planDateId }
}

export async function editPlan(planId: string, clerkId: string, input: EditPlanInput) {
  const plan = await getOwnedPlan(planId, clerkId)

  if (plan.status !== 'active') {
    throw new ValidationError('Only active plans can be edited')
  }

  const { title, dates } = input

  if (title !== undefined) {
    const trimmedTitle = validateTitle(title)

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
    const uniqueDates = validateDates(dates)

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

    const datesToRemove = (currentDates ?? []).filter((d) => !newDateStrings.has(d.date))
    const datesToAdd = uniqueDates.filter((d) => !currentDateStrings.has(d))
    // Existing dates may have passed; only newly added ones must be upcoming
    assertNotPast(datesToAdd)

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
  const plan = await getOwnedPlan(planId, clerkId)

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

  const { error: dateErr } = await supabaseAdmin
    .from('plan_dates')
    .update({ status: 'viable' as const, reopen_version: 0, updated_at: new Date().toISOString() })
    .eq('plan_id', planId)

  if (dateErr) {
    logger.error('Error resetting plan dates during reset', { planId }, dateErr)
    throw dateErr
  }

  await supabaseAdmin.from('event_log').insert({
    plan_id: planId,
    event_type: 'plan_reset',
    metadata: {},
  })

  return getPlanForOwner(planId, clerkId)
}

export async function getPlanWithMatrix(planId: string, clerkId: string) {
  // One round trip for the plan, its dates (+ availability) and participants;
  // ownership is checked on the result before anything is returned
  const { data, error } = await supabaseAdmin
    .from('plans')
    .select('*, plan_dates(*, availability(participant_id, status)), participants(*)')
    .eq('id', planId)
    .order('date', { referencedTable: 'plan_dates', ascending: true })
    .order('created_at', { referencedTable: 'participants', ascending: true })
    .maybeSingle()

  if (error) {
    logger.error('Error fetching plan with matrix', { planId }, error)
    throw error
  }
  if (!data) {
    throw new PlanNotFoundError()
  }
  if (data.owner_clerk_id !== clerkId) {
    throw new NotOwnerError()
  }

  const { plan_dates: planDates, participants: participantRows, ...plan } = data
  const participants = participantRows ?? []

  // Matrix: { [planDateId]: { [participantId]: 'available' | 'unavailable' } }
  const matrix: Record<string, Record<string, string>> = {}
  const dates = (planDates ?? []).map(({ availability, ...date }) => {
    const row: Record<string, string> = {}
    for (const p of participants) row[p.id] = 'available'
    for (const a of availability ?? []) {
      if (a.participant_id in row) row[a.participant_id] = a.status
    }
    matrix[date.id] = row
    return date
  })

  return { plan, dates, participants, matrix }
}

export async function forceReopenDate(planId: string, planDateId: string, clerkId: string) {
  const plan = await getOwnedPlan(planId, clerkId)

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
