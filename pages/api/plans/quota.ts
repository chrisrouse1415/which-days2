import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../../lib/clerk'
import { checkQuota } from '../../../lib/quota'
import { sendApiError } from '../../../lib/api-errors'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = await requireAuth(req)
    const quota = await checkQuota(userId)

    return res.status(200).json(quota)
  } catch (error) {
    return sendApiError(res, error, { route: 'plans/quota' })
  }
}
