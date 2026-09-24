import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../../lib/clerk'
import {
  getPlanWithMatrix,
  updatePlanStatus,
  editPlan,
  resetPlan,
  pickDate,
} from '../../../lib/plans'
import { sendApiError } from '../../../lib/api-errors'
import { isValidUUID } from '../../../lib/validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userId = await requireAuth(req)
    const planId = req.query.planId as string | undefined

    if (!isValidUUID(planId)) {
      return res.status(400).json({ error: 'Missing or invalid planId parameter' })
    }

    if (req.method === 'GET') {
      const result = await getPlanWithMatrix(planId, userId)
      return res.status(200).json(result)
    }

    if (req.method === 'PATCH') {
      const { status, title, dates, reset, pickDateId } = req.body

      // Ensure only one operation type per request
      const opCount = [
        reset === true,
        !!status,
        title !== undefined || dates !== undefined,
        pickDateId !== undefined,
      ].filter(Boolean).length
      if (opCount > 1) {
        return res.status(400).json({ error: 'Only one operation allowed per request: reset, status change, pick, or edit' })
      }

      if (pickDateId !== undefined) {
        if (!isValidUUID(pickDateId)) {
          return res.status(400).json({ error: 'Invalid pickDateId' })
        }
        const result = await pickDate(planId, pickDateId, userId)
        return res.status(200).json(result)
      }

      if (reset === true) {
        const result = await resetPlan(planId, userId)
        return res.status(200).json(result)
      }

      if (status) {
        if (status !== 'locked' && status !== 'deleted' && status !== 'active') {
          return res.status(400).json({ error: 'Status must be "locked", "active", or "deleted"' })
        }
        const result = await updatePlanStatus(planId, userId, status)
        return res.status(200).json(result)
      }

      if (title !== undefined || dates !== undefined) {
        const result = await editPlan(planId, userId, { title, dates })
        return res.status(200).json(result)
      }

      return res.status(400).json({ error: 'No valid fields provided' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return sendApiError(res, error, { route: 'plans/manage', planId: req.query.planId as string })
  }
}
