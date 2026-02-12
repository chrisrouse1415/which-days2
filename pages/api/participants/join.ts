import type { NextApiRequest, NextApiResponse } from 'next'
import {
  joinPlan,
  PlanNotFoundError,
  PlanNotActiveError,
  DuplicateNameError,
  ValidationError,
} from '../../../lib/participants'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { shareId, displayName } = req.body

    if (!shareId || !displayName) {
      return res.status(400).json({ error: 'Missing shareId or displayName' })
    }

    const participant = await joinPlan(shareId, displayName)

    return res.status(201).json(participant)
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message })
    }
    if (error instanceof PlanNotFoundError) {
      return res.status(404).json({ error: error.message })
    }
    if (error instanceof DuplicateNameError) {
      return res.status(409).json({ error: error.message })
    }
    if (error instanceof PlanNotActiveError) {
      return res.status(410).json({ error: error.message })
    }

    logger.error('Unexpected error joining plan', { route: 'participants/join', shareId: req.body?.shareId }, error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
