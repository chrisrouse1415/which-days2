import type { NextApiRequest, NextApiResponse } from 'next'
import { undoUnavailable, UndoExpiredError, UndoNotAllowedError } from '../../../lib/availability'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { participantId, eventLogId } = req.body

    if (!participantId || !eventLogId) {
      return res.status(400).json({ error: 'Missing participantId or eventLogId' })
    }

    const result = await undoUnavailable(participantId, eventLogId)

    return res.status(200).json(result)
  } catch (error) {
    if (error instanceof UndoNotAllowedError) {
      return res.status(403).json({ error: error.message })
    }
    if (error instanceof UndoExpiredError) {
      return res.status(410).json({ error: error.message })
    }

    logger.error('Unexpected error undoing availability', { route: 'availability/undo', participantId: req.body?.participantId }, error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
