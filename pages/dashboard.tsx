import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import Link from 'next/link'
import useSWR from 'swr'
import LoginButton from '../components/LoginButton'

interface PlanSummary {
  id: string
  title: string
  share_id: string
  status: 'active' | 'locked' | 'deleted'
  created_at: string
  participantCount: number
  doneCount: number
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to load plans')
  return res.json()
})

function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white/80 backdrop-blur-sm border border-white/80 rounded-2xl p-5 shadow-warm"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-4 w-28 bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-6 w-14 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  const { data, error, isLoading } = useSWR<{ plans: PlanSummary[] }>(
    isLoaded && isSignedIn ? '/api/plans/list' : null,
    fetcher
  )

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-warm-gradient flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (isLoaded && !isSignedIn) {
    router.replace('/')
    return null
  }

  const plans = data?.plans ?? []
  const activePlans = plans.filter((p) => p.status === 'active')
  const maxPlans = 3

  return (
    <div className="min-h-screen bg-warm-gradient bg-question-pattern bg-grain">
      <header className="glass-header border-b border-teal-100/50 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <Link href="/" className="text-xl font-display font-semibold text-teal-900 hover:text-teal-700 transition-colors tracking-tight">
            Which Days?
          </Link>
          <LoginButton />
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">My Plans</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: maxPlans }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < activePlans.length ? 'bg-teal-500' : 'bg-slate-200'
                  }`}
                />
              ))}
              <span className="text-xs text-slate-400 ml-1">
                {activePlans.length}/{maxPlans}
              </span>
            </div>
            {activePlans.length < maxPlans && (
              <Link
                href="/create"
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-600/25 hover:-translate-y-0.5 transition-all duration-200"
              >
                Create a Plan
              </Link>
            )}
          </div>
        </div>

        {error ? (
          <p className="text-rose-600 text-center py-8">Failed to load plans. Please try again.</p>
        ) : isLoading ? (
          <DashboardSkeleton />
        ) : plans.length === 0 ? (
          <div className="text-center py-20">
            <span className="inline-block text-4xl mb-4" role="img" aria-label="Calendar">🗓️</span>
            <p className="text-slate-500 mb-6">You haven&apos;t created any plans yet.</p>
            <Link
              href="/create"
              className="inline-block px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              Create your first plan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/manage/${plan.id}`}
                className="block bg-white/80 backdrop-blur-sm border border-white/80 rounded-2xl p-5 shadow-warm hover:shadow-warm-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{plan.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {plan.participantCount} participant{plan.participantCount !== 1 ? 's' : ''}
                      {plan.participantCount > 0 && (
                        <span className="text-slate-400">
                          {' '}&middot; {plan.doneCount} done
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      plan.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
