import type { NextApiRequest, NextApiResponse } from 'next'
import { toggleUnavailable } from '../../../lib/availability'
import { sendApiError } from '../../../lib/api-errors'
import { checkRateLimit } from '../../../lib/rate-limit'
import { isValidUUID } from '../../../lib/validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await checkRateLimit(req, res))) return

  try {
    const { participantId, planDateId } = req.body

    if (!isValidUUID(participantId) || !isValidUUID(planDateId)) {
      return res.status(400).json({ error: 'Missing or invalid participantId or planDateId' })
    }

    const result = await toggleUnavailable(participantId, planDateId)

    return res.status(200).json(result)
  } catch (error) {
    return sendApiError(res, error, {
      route: 'availability/toggle',
      participantId: req.body?.participantId,
      planDateId: req.body?.planDateId,
    })
  }
}
