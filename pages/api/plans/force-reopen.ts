import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../../lib/clerk'
import { forceReopenDate } from '../../../lib/plans'
import { sendApiError } from '../../../lib/api-errors'
import { isValidUUID } from '../../../lib/validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = await requireAuth(req)
    const { planId, planDateId } = req.body

    if (!isValidUUID(planId) || !isValidUUID(planDateId)) {
      return res.status(400).json({ error: 'Missing or invalid planId or planDateId' })
    }

    const result = await forceReopenDate(planId, planDateId, userId)

    return res.status(200).json(result)
  } catch (error) {
    return sendApiError(res, error, {
      route: 'plans/force-reopen',
      planId: req.body?.planId,
      planDateId: req.body?.planDateId,
    })
  }
}
