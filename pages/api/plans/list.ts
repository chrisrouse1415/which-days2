import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../../lib/clerk'
import { getOwnerPlans } from '../../../lib/plans'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = await requireAuth(req)
    const plans = await getOwnerPlans(userId)

    return res.status(200).json({ plans })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return res.status(401).json({ error: 'Authentication required' })
    }

    console.error('Unexpected error listing plans:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
