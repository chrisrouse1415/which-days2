import type { NextApiRequest, NextApiResponse } from 'next'
import { getPlanByShareId, PlanNotFoundError } from '../../../lib/participants'
import { getParticipantAvailability, getPlanAvailabilitySummary } from '../../../lib/availability'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const shareId = req.query.shareId as string | undefined
    const participantId = req.query.participantId as string | undefined

    if (!shareId) {
      return res.status(400).json({ error: 'Missing shareId parameter' })
    }

    const { plan, dates, participants } = await getPlanByShareId(shareId)

    const summary = await getPlanAvailabilitySummary(plan.id)

    let myAvailability = null
    let needsReview = false
    if (participantId) {
      myAvailability = await getParticipantAvailability(participantId, plan.id)
      const me = participants.find((p) => p.id === participantId)
      if (me) {
        needsReview = me.needs_review
      }
    }

    const doneCount = participants.filter((p) => p.is_done).length

    return res.status(200).json({
      plan,
      dates,
      participants,
      availabilitySummary: summary,
      myAvailability,
      doneCount,
      needsReview,
    })
  } catch (error) {
    if (error instanceof PlanNotFoundError) {
      return res.status(404).json({ error: error.message })
    }

    console.error('Unexpected error fetching plan:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
