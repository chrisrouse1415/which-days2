import { getAuth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'
import type { NextApiRequest } from 'next'

export async function syncUserToSupabase(userId: string, userData: any) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        clerk_id: userId,
        email: userData.emailAddresses?.[0]?.emailAddress,
        first_name: userData.firstName,
        last_name: userData.lastName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clerk_id' }
    )
    .select()

  if (error) {
    logger.error('Error syncing user to Supabase', { userId }, error)
    throw error
  }

  return data
}

export async function getCurrentUser(req: NextApiRequest) {
  const { userId } = getAuth(req)

  if (!userId) {
    return null
  }

  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    return user
  } catch (error) {
    logger.error('Error fetching user from Clerk', { userId }, error)
    return null
  }
}

export async function requireAuth(req: NextApiRequest): Promise<string> {
  const { userId } = getAuth(req)

  if (!userId) {
    throw new Error('Authentication required')
  }

  return userId
}
