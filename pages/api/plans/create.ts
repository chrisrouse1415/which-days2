import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getCurrentUser, syncUserToSupabase } from '../../../lib/clerk'
import { createPlan, QuotaExceededError, ValidationError } from '../../../lib/plans'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = await requireAuth(req)

    // Ensure user exists in Supabase before creating plan (FK constraint)
    const user = await getCurrentUser(req)
    if (user) {
      await syncUserToSupabase(userId, user)
    }

    const { title, dates } = req.body

    const result = await createPlan(userId, { title, dates })

    return res.status(201).json({
      plan: result.plan,
      planDates: result.planDates,
      shareUrl: result.shareUrl,
      manageUrl: result.manageUrl,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message })
    }
    if (error instanceof QuotaExceededError) {
      return res.status(409).json({ error: error.message })
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return res.status(401).json({ error: 'Authentication required' })
    }

    console.error('Unexpected error creating plan:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
