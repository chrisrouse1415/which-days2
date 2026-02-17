import { getAuth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'
import type { NextApiRequest } from 'next'

interface UserSyncData {
  emailAddresses?: Array<{ emailAddress: string }>
  firstName?: string | null
  lastName?: string | null
  email_addresses?: Array<{ email_address: string }>
  first_name?: string | null
  last_name?: string | null
}

export async function syncUserToSupabase(userId: string, userData: UserSyncData) {
  // Handle both camelCase (Clerk SDK) and snake_case (webhook payload) formats
  const email =
    userData.emailAddresses?.[0]?.emailAddress ??
    userData.email_addresses?.[0]?.email_address
  const firstName = userData.firstName ?? userData.first_name
  const lastName = userData.lastName ?? userData.last_name

  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        clerk_id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
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
