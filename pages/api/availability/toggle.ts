import type { NextApiRequest, NextApiResponse } from 'next'
import { toggleUnavailable, DateLockedError } from '../../../lib/availability'
import { ParticipantNotFoundError, PlanNotActiveError } from '../../../lib/participants'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { participantId, planDateId } = req.body

    if (!participantId || !planDateId) {
      return res.status(400).json({ error: 'Missing participantId or planDateId' })
    }

    const result = await toggleUnavailable(participantId, planDateId)

    return res.status(200).json(result)
  } catch (error) {
    if (error instanceof ParticipantNotFoundError) {
      return res.status(404).json({ error: error.message })
    }
    if (error instanceof PlanNotActiveError) {
      return res.status(410).json({ error: error.message })
    }
    if (error instanceof DateLockedError) {
      return res.status(410).json({ error: error.message })
    }
    if (error instanceof Error && error.message === 'Date not found') {
      return res.status(404).json({ error: error.message })
    }

    logger.error('Unexpected error toggling availability', { route: 'availability/toggle', participantId: req.body?.participantId, planDateId: req.body?.planDateId }, error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
