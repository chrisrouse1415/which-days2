import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../../lib/clerk'
import {
  forceReopenDate,
  PlanNotFoundError,
  NotOwnerError,
  ValidationError,
} from '../../../lib/plans'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = await requireAuth(req)
    const { planId, planDateId } = req.body

    if (!planId || !planDateId) {
      return res.status(400).json({ error: 'Missing planId or planDateId' })
    }

    const result = await forceReopenDate(planId, planDateId, userId)

    return res.status(200).json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (error instanceof PlanNotFoundError || error instanceof NotOwnerError) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message })
    }

    logger.error('Unexpected error force-reopening date', { route: 'plans/force-reopen', planId: req.body?.planId, planDateId: req.body?.planDateId }, error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
