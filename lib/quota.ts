import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'

const MAX_PLANS = 5

export async function getPlanCount(ownerClerkId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('plans')
    .select('*', { count: 'exact', head: true })
    .eq('owner_clerk_id', ownerClerkId)
    .in('status', ['active', 'locked'])

  if (error) {
    logger.error('Error counting plans', { userId: ownerClerkId }, error)
    throw error
  }

  return count ?? 0
}

export async function checkQuota(ownerClerkId: string) {
  const planCount = await getPlanCount(ownerClerkId)

  return {
    planCount,
    maxPlans: MAX_PLANS,
    canCreate: planCount < MAX_PLANS,
  }
}
