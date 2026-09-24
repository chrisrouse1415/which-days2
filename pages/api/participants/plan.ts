import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuth } from '@clerk/nextjs/server'
import { PlanNotFoundError } from '../../../lib/errors'
import { sendApiError } from '../../../lib/api-errors'
import { supabaseAdmin } from '../../../lib/supabase-admin'
import { logger } from '../../../lib/logger'
import { checkRateLimit } from '../../../lib/rate-limit'
import { isValidShareId, isValidUUID } from '../../../lib/validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await checkRateLimit(req, res))) return

  try {
    const shareId = req.query.shareId as string | undefined
    const participantId = req.query.participantId as string | undefined

    if (!shareId || !isValidShareId(shareId)) {
      return res.status(400).json({ error: 'Invalid or missing shareId parameter' })
    }

    if (participantId && !isValidUUID(participantId)) {
      return res.status(400).json({ error: 'Invalid participantId parameter' })
    }

    // One round trip: the plan with its owner's name, dates (+ availability) and participants
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select(
        `id, title, share_id, status, created_at, owner_clerk_id,
        owner:users(first_name),
        plan_dates(id, date, status, availability(id, participant_id, status)),
        participants(id, display_name, is_done, needs_review, created_at)`
      )
      .eq('share_id', shareId)
      .order('date', { referencedTable: 'plan_dates', ascending: true })
      .order('created_at', { referencedTable: 'participants', ascending: true })
      .maybeSingle()

    if (planError) {
      logger.error('Error fetching plan', { shareId }, planError)
      throw planError
    }
    if (!plan) {
      throw new PlanNotFoundError()
    }

    const dates = plan.plan_dates ?? []
    const participants = plan.participants ?? []
    const ownerName = plan.owner?.first_name || null
    const allAvailability = dates.flatMap((d) =>
      (d.availability ?? []).map((a) => ({ ...a, plan_date_id: d.id }))
    )

    // Build participant name map for summary
    const participantMap: Record<string, string> = {}
    for (const p of participants) {
      participantMap[p.id] = p.display_name
    }

    // Build availability summary from fetched data (replaces getPlanAvailabilitySummary)
    const summary = dates.map((date) => {
      const dateUnavailable = (date.availability ?? []).filter((a) => a.status === 'unavailable')
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

    // Extract participant's own availability (replaces getParticipantAvailability)
    let myAvailability = null
    let needsReview = false
    if (participantId) {
      myAvailability = allAvailability.filter((a) => a.participant_id === participantId)
      const me = participants.find((p) => p.id === participantId)
      if (me) {
        needsReview = me.needs_review
      }
    }

    const doneCount = participants.filter((p) => p.is_done).length

    const safeParticipants = participants.map((p) => ({
      id: p.id,
      display_name: p.display_name,
      is_done: p.is_done,
      needs_review: p.needs_review,
    }))

    // Strip sensitive fields from plan before sending to participants
    const safePlan = {
      id: plan.id,
      title: plan.title,
      share_id: plan.share_id,
      status: plan.status,
      created_at: plan.created_at,
    }

    // Lets a signed-in organizer view their own plan without joining it.
    // Only the boolean leaves the server, never the owner's id.
    const { userId } = getAuth(req)
    const isOwner = !!userId && userId === plan.owner_clerk_id

    return res.status(200).json({
      plan: safePlan,
      isOwner,
      ownerName,
      participants: safeParticipants,
      availabilitySummary: summary,
      myAvailability,
      doneCount,
      needsReview,
    })
  } catch (error) {
    return sendApiError(res, error, { route: 'participants/plan', shareId: req.query.shareId as string })
  }
}
