import type { NextApiRequest, NextApiResponse } from 'next'
import { clearNeedsReview, ParticipantNotFoundError } from '../../../lib/participants'
import { logger } from '../../../lib/logger'
import { checkRateLimit } from '../../../lib/rate-limit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await checkRateLimit(req, res))) return

  try {
    const { participantId } = req.body

    if (!participantId) {
      return res.status(400).json({ error: 'Missing participantId' })
    }

    await clearNeedsReview(participantId)

    return res.status(200).json({ needs_review: false })
  } catch (error) {
    if (error instanceof ParticipantNotFoundError) {
      return res.status(404).json({ error: error.message })
    }

    logger.error('Unexpected error clearing needs_review', { route: 'participants/review', participantId: req.body?.participantId }, error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
