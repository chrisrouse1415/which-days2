import type { NextApiRequest, NextApiResponse } from 'next'
import { PlanNotFoundError } from '../../../lib/participants'
import { supabaseAdmin } from '../../../lib/supabase-admin'
import { logger } from '../../../lib/logger'
import { checkRateLimit } from '../../../lib/rate-limit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await checkRateLimit(req, res))) return

  try {
    const shareId = req.query.shareId as string | undefined
    const participantId = req.query.participantId as string | undefined

    if (!shareId) {
      return res.status(400).json({ error: 'Missing shareId parameter' })
    }

    // Query 1: Fetch plan by share ID
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select()
      .eq('share_id', shareId)
      .single()

    if (planError || !plan) {
      throw new PlanNotFoundError()
    }

    // Queries 2-4: Fetch dates, participants, and owner in parallel
    const [datesResult, participantsResult, ownerResult] = await Promise.all([
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
      supabaseAdmin
        .from('users')
        .select('first_name')
        .eq('clerk_id', plan.owner_clerk_id)
        .single(),
    ])

    if (datesResult.error) {
      logger.error('Error fetching plan dates', { shareId, planId: plan.id }, datesResult.error)
      throw datesResult.error
    }
    if (participantsResult.error) {
      logger.error('Error fetching participants', { shareId, planId: plan.id }, participantsResult.error)
      throw participantsResult.error
    }

    const dates = datesResult.data ?? []
    const participants = participantsResult.data ?? []
    const ownerName = ownerResult.data?.first_name || null

    // Query 5: Fetch all availability rows for plan dates in one query
    const dateIds = dates.map((d) => d.id)
    let allAvailability: Array<{
      participant_id: string
      plan_date_id: string
      status: string
      id: string
    }> = []

    if (dateIds.length > 0) {
      const { data: avail, error: availErr } = await supabaseAdmin
        .from('availability')
        .select()
        .in('plan_date_id', dateIds)

      if (availErr) {
        logger.error('Error fetching availability', { shareId, planId: plan.id }, availErr)
        throw availErr
      }
      allAvailability = avail ?? []
    }

    // Build participant name map for summary
    const participantMap: Record<string, string> = {}
    for (const p of participants) {
      participantMap[p.id] = p.display_name
    }

    // Build availability summary from fetched data (replaces getPlanAvailabilitySummary)
    const summary = dates.map((date) => {
      const dateUnavailable = allAvailability.filter(
        (a) => a.plan_date_id === date.id && a.status === 'unavailable'
      )
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

    return res.status(200).json({
      plan,
      ownerName,
      dates,
      participants: safeParticipants,
      availabilitySummary: summary,
      myAvailability,
      doneCount,
      needsReview,
    })
  } catch (error) {
    if (error instanceof PlanNotFoundError) {
      return res.status(404).json({ error: error.message })
    }

    logger.error('Unexpected error fetching plan', { route: 'participants/plan', shareId: req.query.shareId as string }, error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
