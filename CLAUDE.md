# Which Days? — notes for Claude

Group scheduling app: an organizer creates a plan with candidate days, shares a link,
and participants (no account needed) cross off days they can't make.

- **Stack:** Next.js 14 (pages router) + TypeScript, Clerk (organizer auth), Supabase
  Postgres (accessed server-side with the service role key), Upstash (rate limiting),
  deployed on Vercel from `main`.
- **Package manager:** Bun. Use `bun install` / `bun run <script>`, never npm, and
  keep `bun.lock` as the only lockfile.
- **Where the logic lives:** business rules are in `lib/` (`plans.ts`,
  `availability.ts`, `participants.ts`, `quota.ts`); `pages/api/` routes are thin
  wrappers. The schema is `supabase/migrations/`.
- **Docs:** `docs/TRD.md` (design), `docs/OPERATIONS.md` (running it).

## Testing — do this before every commit

1. `bun run db:start` — starts a throwaway local Supabase in Docker (needs Docker
   running). Leave it running between test runs; `bun run db:stop` when finished.
2. `bun run type-check`
3. `bun run lint`
4. `bun test`

All four must pass before committing. CI runs the same steps on every push and PR,
and `main` only accepts changes through a PR whose checks pass.

- Tests live in `tests/*.test.ts` and use Bun's built-in runner (`bun:test`), not
  Vitest or Jest.
- They call the `lib/` functions directly against the local database.
  `tests/setup.ts` forces them onto local Supabase and refuses any non-local URL, so
  they can never touch production data.
- Each test creates its own organizer via `createOwner()` / `setupPlan()` in
  `tests/helpers.ts`, so tests don't depend on each other or on existing data.
- When you change a rule in `lib/`, add or update a test that fails without your
  change. When you fix a bug, add a test that reproduces it first.
- If the database can't be started (for example, no Docker), say so plainly. Don't
  skip the tests or report them as passing.

## Git workflow

Never push directly to `main`. Work on a branch, open a PR, and let CI go green;
Vercel gives each PR a preview deployment to check by hand before merging.
