import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from './logger'

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress ?? 'unknown'
}

let ratelimit: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(20, '10 s'),
    analytics: false,
  })
}

/**
 * Check rate limit for a request. Returns true if allowed, false if rate limited.
 * When rate limited, sends a 429 response automatically.
 * If Upstash is not configured (local dev), always allows.
 */
export async function checkRateLimit(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  if (!ratelimit) return true

  const ip = getClientIp(req)

  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(ip)

    res.setHeader('X-RateLimit-Limit', limit)
    res.setHeader('X-RateLimit-Remaining', remaining)
    res.setHeader('X-RateLimit-Reset', reset)

    if (!success) {
      logger.warn('Rate limit exceeded', { route: req.url ?? '', ip })
      res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
      return false
    }

    return true
  } catch (error) {
    // If rate limiting fails, allow the request through (fail open)
    logger.error('Rate limit check failed', { route: req.url ?? '' }, error)
    return true
  }
}
