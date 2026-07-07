import type { NextApiRequest, NextApiResponse } from 'next'
import { clearNeedsReview } from '../../../lib/participants'
import { sendApiError } from '../../../lib/api-errors'
import { checkRateLimit } from '../../../lib/rate-limit'
import { isValidUUID } from '../../../lib/validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await checkRateLimit(req, res))) return

  try {
    const { participantId } = req.body

    if (!isValidUUID(participantId)) {
      return res.status(400).json({ error: 'Missing or invalid participantId' })
    }

    await clearNeedsReview(participantId)

    return res.status(200).json({ needs_review: false })
  } catch (error) {
    return sendApiError(res, error, { route: 'participants/review', participantId: req.body?.participantId })
  }
}
