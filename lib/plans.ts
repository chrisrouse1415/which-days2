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
