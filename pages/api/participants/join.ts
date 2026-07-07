import type { NextApiRequest, NextApiResponse } from 'next'
import { joinPlan } from '../../../lib/participants'
import { sendApiError } from '../../../lib/api-errors'
import { checkRateLimit } from '../../../lib/rate-limit'
import { isValidShareId, isNonEmptyString } from '../../../lib/validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await checkRateLimit(req, res))) return

  try {
    const { shareId, displayName } = req.body

    if (!isValidShareId(shareId) || !isNonEmptyString(displayName)) {
      return res.status(400).json({ error: 'Missing or invalid shareId or displayName' })
    }

    const participant = await joinPlan(shareId, displayName)

    return res.status(201).json(participant)
  } catch (error) {
    return sendApiError(res, error, { route: 'participants/join', shareId: req.body?.shareId })
  }
}
