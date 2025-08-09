import { auth, clerkClient } from '@clerk/nextjs'
import { supabase } from './supabase'

export async function syncUserToSupabase(userId: string, userData: any) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      clerk_id: userId,
      email: userData.emailAddresses?.[0]?.emailAddress,
      first_name: userData.firstName,
      last_name: userData.lastName,
      updated_at: new Date().toISOString()
    })
    .select()
  
  if (error) {
    console.error('Error syncing user to Supabase:', error)
    throw error
  }
  
  return data
}

export async function getCurrentUser() {
  const { userId } = auth()
  
  if (!userId) {
    return null
  }
  
  try {
    const user = await clerkClient.users.getUser(userId)
    return user
  } catch (error) {
    console.error('Error fetching user from Clerk:', error)
    return null
  }
}

export async function requireAuth() {
  const { userId } = auth()
  
  if (!userId) {
    throw new Error('Authentication required')
  }
  
  return userId
}