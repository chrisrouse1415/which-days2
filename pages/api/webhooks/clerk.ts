import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { syncUserToSupabase } from '../../../lib/clerk'
import { logger } from '../../../lib/logger'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Get the headers from the request object (Pages Router)
  const svix_id = req.headers['svix-id'] as string | undefined
  const svix_timestamp = req.headers['svix-timestamp'] as string | undefined
  const svix_signature = req.headers['svix-signature'] as string | undefined

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Error occurred -- no svix headers' })
  }

  // Get the body
  const body = JSON.stringify(req.body)

  // Verify webhook secret is configured
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    logger.error('CLERK_WEBHOOK_SECRET not configured', { route: 'webhooks/clerk' })
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  const wh = new Webhook(secret)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    logger.error('Error verifying webhook', { route: 'webhooks/clerk' }, err)
    return res.status(400).json({ error: 'Error occurred' })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    try {
      await syncUserToSupabase(evt.data.id, evt.data)
      logger.info('User synced to Supabase', { route: 'webhooks/clerk', userId: evt.data.id })
    } catch (error) {
      logger.error('Error syncing user to Supabase', { route: 'webhooks/clerk', userId: evt.data.id }, error)
      return res.status(500).json({ error: 'Error syncing user' })
    }
  }

  return res.status(200).json({ message: 'Success' })
}