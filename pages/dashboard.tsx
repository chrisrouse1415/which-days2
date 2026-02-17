import { useEffect } from 'react'
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

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-warm-gradient flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  const plans = data?.plans ?? []
  const countedPlans = plans.filter((p) => p.status === 'active' || p.status === 'locked')
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
                    i < countedPlans.length ? 'bg-teal-500' : 'bg-slate-200'
                  }`}
                />
              ))}
              <span className="text-xs text-slate-400 ml-1">
                {countedPlans.length}/{maxPlans}
              </span>
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-rose-600 text-center py-8">Failed to load plans. Please try again.</p>
        ) : isLoading ? (
          <DashboardSkeleton />
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

            {/* Create new plan card */}
            {countedPlans.length < maxPlans ? (
              <Link
                href="/create"
                className="group block rounded-2xl border-2 border-dashed border-teal-200/60 p-5 hover:border-teal-300 hover:bg-teal-50/30 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-50 text-teal-500 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-teal-700 group-hover:text-teal-800 transition-colors">
                      {plans.length === 0 ? 'Create your first plan' : 'Create a new plan'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {countedPlans.length} of {maxPlans} slots used
                    </p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200/60 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-400">Plan limit reached</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Lock or delete a plan to free up a slot
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
