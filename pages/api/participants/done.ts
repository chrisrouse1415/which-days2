import type { NextApiRequest, NextApiResponse } from 'next'
import { toggleDone, ParticipantNotFoundError, PlanNotActiveError } from '../../../lib/participants'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { participantId } = req.body

    if (!participantId) {
      return res.status(400).json({ error: 'Missing participantId' })
    }

    const result = await toggleDone(participantId)

    return res.status(200).json(result)
  } catch (error) {
    if (error instanceof ParticipantNotFoundError) {
      return res.status(404).json({ error: error.message })
    }
    if (error instanceof PlanNotActiveError) {
      return res.status(410).json({ error: error.message })
    }

    console.error('Unexpected error toggling done:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
