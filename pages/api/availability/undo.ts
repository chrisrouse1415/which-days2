import type { NextApiRequest, NextApiResponse } from 'next'
import { undoUnavailable } from '../../../lib/availability'
import { sendApiError } from '../../../lib/api-errors'
import { checkRateLimit } from '../../../lib/rate-limit'
import { isValidUUID } from '../../../lib/validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await checkRateLimit(req, res))) return

  try {
    const { participantId, eventLogId } = req.body

    if (!isValidUUID(participantId) || !isValidUUID(eventLogId)) {
      return res.status(400).json({ error: 'Missing or invalid participantId or eventLogId' })
    }

    const result = await undoUnavailable(participantId, eventLogId)

    return res.status(200).json(result)
  } catch (error) {
    return sendApiError(res, error, { route: 'availability/undo', participantId: req.body?.participantId })
  }
}
