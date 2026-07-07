import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getCurrentUser, syncUserToSupabase } from '../../../lib/clerk'
import { createPlan } from '../../../lib/plans'
import { sendApiError } from '../../../lib/api-errors'

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
    return sendApiError(res, error, { route: 'plans/create' })
  }
}
