import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'

const MAX_ACTIVE_PLANS = 3

export async function getActivePlanCount(ownerClerkId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('plans')
    .select('*', { count: 'exact', head: true })
    .eq('owner_clerk_id', ownerClerkId)
    .eq('status', 'active')

  if (error) {
    logger.error('Error counting active plans', { userId: ownerClerkId }, error)
    throw error
  }

  return count ?? 0
}

export async function checkQuota(ownerClerkId: string) {
  const activePlanCount = await getActivePlanCount(ownerClerkId)

  return {
    activePlanCount,
    maxPlans: MAX_ACTIVE_PLANS,
    canCreate: activePlanCount < MAX_ACTIVE_PLANS,
  }
}
