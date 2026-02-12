# Which Days — Operations Guide

## Architecture

| Service | Purpose | Dashboard |
|---------|---------|-----------|
| **Vercel** | Hosting, serverless functions, CDN | vercel.com/dashboard |
| **Supabase** | PostgreSQL database | supabase.com/dashboard |
| **Clerk** | Authentication (Google/Apple OAuth) | clerk.com/dashboard |
| **Upstash** | Redis for rate limiting | console.upstash.com |

## Environment Variables

| Variable | Required | Where | Purpose |
|----------|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Vercel + local | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Vercel + local | Supabase anon key (RLS blocks it; service role used server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Vercel + local | Supabase service role key (bypasses RLS) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Vercel + local | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Vercel + local | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Yes | Vercel + local | Svix webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Yes | Vercel + local | App base URL |
| `UPSTASH_REDIS_REST_URL` | No | Vercel | Upstash Redis URL (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Vercel | Upstash Redis token (rate limiting) |

**Note:** If Upstash env vars are missing, rate limiting is silently skipped.

## Backups

Supabase provides daily automatic backups with 7-day retention (free tier). Access via:
**Supabase Dashboard > Project > Settings > Database > Backups**

No custom backup scripts are needed.

## Logs

All API routes emit structured JSON logs. In Vercel:

1. Go to **Vercel Dashboard > Project > Logs**
2. Filter by JSON fields: `level`, `route`, `planId`, `participantId`, `userId`
3. Error logs include serialized error objects with `name` and `message`

In development, error stacks are included in log output.

## Rate Limiting

- **Scope:** 6 unauthenticated participant endpoints
- **Limit:** 20 requests per 10 seconds per IP (sliding window)
- **Response:** 429 with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers

To adjust the limit, edit `lib/rate-limit.ts` and change the `slidingWindow()` parameters.

## CI

GitHub Actions runs on push to `main` and on PRs:
1. `npm run type-check` (TypeScript)
2. `npm run lint` (ESLint via Next.js)

## Common Issues

### Webhook failures (Clerk -> Supabase user sync)
- **Symptom:** Plan creation fails with FK constraint error
- **Check:** Clerk Dashboard > Webhooks > delivery logs
- **Fix:** Verify `CLERK_WEBHOOK_SECRET` matches in Vercel env vars. Re-send failed webhook from Clerk dashboard.

### Rate limit too aggressive
- **Symptom:** Users get 429 errors during normal use
- **Fix:** Increase the limit in `lib/rate-limit.ts` (e.g., `slidingWindow(40, '10 s')`)

### Quota issues
- **Symptom:** User cannot create plans despite having fewer than 3
- **Check:** `plans` table for `status = 'active'` rows for that user — deleted/locked plans don't count
- **Fix:** Lock or delete stale plans via the owner dashboard
