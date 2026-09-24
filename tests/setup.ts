// Runs before every `bun test`. Points lib/supabase-admin at the LOCAL Supabase
// started by `bun run db:start`, never at the real project, whatever .env.local says.

function readLocalSupabase(): { url: string; key: string } {
  // Escape hatch for environments that run the database some other way
  if (process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SERVICE_ROLE_KEY) {
    return { url: process.env.TEST_SUPABASE_URL, key: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY }
  }

  const result = Bun.spawnSync(['bunx', 'supabase', 'status', '-o', 'env'], { stderr: 'pipe' })
  const vars: Record<string, string> = {}
  for (const line of result.stdout.toString().split('\n')) {
    const match = line.match(/^([A-Z_]+)="?(.*?)"?$/)
    if (match) vars[match[1]] = match[2]
  }
  const url = vars.API_URL
  const key = vars.SERVICE_ROLE_KEY || vars.SECRET_KEY
  if (result.exitCode !== 0 || !url || !key) {
    throw new Error('Local Supabase is not running. Start it with `bun run db:start`, then re-run `bun test`.')
  }
  return { url, key }
}

const { url, key } = readLocalSupabase()

const host = new URL(url).hostname
if (host !== '127.0.0.1' && host !== 'localhost') {
  throw new Error(`Refusing to run tests against non-local Supabase at ${host}`)
}

process.env.NEXT_PUBLIC_SUPABASE_URL = url
process.env.SUPABASE_SERVICE_ROLE_KEY = key
