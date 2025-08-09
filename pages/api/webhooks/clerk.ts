import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { syncUserToSupabase } from '../../../lib/clerk'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Get the headers
  const headersList = headers()
  const svix_id = headersList.get('svix-id')
  const svix_timestamp = headersList.get('svix-timestamp')
  const svix_signature = headersList.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Error occurred -- no svix headers' })
  }

  // Get the body
  const body = JSON.stringify(req.body)

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return res.status(400).json({ error: 'Error occurred' })
  }

  // Handle the webhook
  const { id, type } = evt
  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    try {
      await syncUserToSupabase(evt.data.id, evt.data)
      console.log(`User ${evt.data.id} synced to Supabase`)
    } catch (error) {
      console.error('Error syncing user to Supabase:', error)
      return res.status(500).json({ error: 'Error syncing user' })
    }
  }

  return res.status(200).json({ message: 'Success' })
}