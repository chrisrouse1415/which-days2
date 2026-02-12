import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../../lib/clerk'
import { checkQuota } from '../../../lib/quota'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = await requireAuth(req)
    const quota = await checkQuota(userId)

    return res.status(200).json(quota)
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return res.status(401).json({ error: 'Authentication required' })
    }

    logger.error('Unexpected error checking quota', { route: 'plans/quota' }, error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
