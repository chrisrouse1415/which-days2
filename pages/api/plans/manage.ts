import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../../lib/clerk'
import {
  getPlanForOwner,
  getAvailabilityMatrix,
  updatePlanStatus,
  PlanNotFoundError,
  NotOwnerError,
  ValidationError,
} from '../../../lib/plans'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userId = await requireAuth(req)
    const planId = req.query.planId as string | undefined

    if (!planId) {
      return res.status(400).json({ error: 'Missing planId parameter' })
    }

    if (req.method === 'GET') {
      const { plan, dates, participants } = await getPlanForOwner(planId, userId)
      const { matrix } = await getAvailabilityMatrix(planId)

      return res.status(200).json({ plan, dates, participants, matrix })
    }

    if (req.method === 'PATCH') {
      const { status } = req.body

      if (status !== 'locked' && status !== 'deleted') {
        return res.status(400).json({ error: 'Status must be "locked" or "deleted"' })
      }

      const result = await updatePlanStatus(planId, userId, status)
      return res.status(200).json(result)
    }

    return res.status(405).json({ error: 'Method not allowed' })
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

    logger.error('Unexpected error in plan management', { route: 'plans/manage', planId: req.query.planId as string }, error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
