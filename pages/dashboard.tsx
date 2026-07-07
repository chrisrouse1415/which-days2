import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import Link from 'next/link'
import useSWR from 'swr'
import LoginButton from '../components/LoginButton'
import Layout, { CenteredPage } from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { MAX_PLANS } from '../lib/constants'

interface PlanSummary {
  id: string
  title: string
  share_id: string
  status: 'active' | 'locked' | 'deleted'
  created_at: string
  participantCount: number
  doneCount: number
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to load plans')
    return res.json()
  })

function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-40 animate-pulse rounded-lg bg-stone-200" />
              <div className="h-4 w-28 animate-pulse rounded-lg bg-stone-100" />
            </div>
            <div className="h-6 w-14 animate-pulse rounded-lg bg-stone-100" />
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
      <CenteredPage>
        <p className="text-stone-400">Loading&hellip;</p>
      </CenteredPage>
    )
  }

  if (!isSignedIn) {
    return null
  }

  const plans = data?.plans ?? []
  const countedPlans = plans.filter((p) => p.status === 'active' || p.status === 'locked')

  return (
    <Layout headerRight={<LoginButton />}>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">My plans</h1>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: MAX_PLANS }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i < countedPlans.length ? 'bg-pine-600' : 'bg-stone-200'
                }`}
              />
            ))}
          </div>
          <span className="ml-1 text-xs text-stone-500">
            {countedPlans.length}/{MAX_PLANS}
          </span>
        </div>
      </div>

      {error ? (
        <p className="py-8 text-center text-cut-600">Failed to load plans. Please try again.</p>
      ) : isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/manage/${plan.id}`}
              className="card block p-5 transition-shadow duration-150 hover:shadow-raised"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-ink">{plan.title}</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {plan.participantCount} participant{plan.participantCount !== 1 ? 's' : ''}
                    {plan.participantCount > 0 && (
                      <span className="text-stone-400"> &middot; {plan.doneCount} done</span>
                    )}
                  </p>
                </div>
                <StatusBadge status={plan.status} />
              </div>
            </Link>
          ))}

          {/* Create new plan card */}
          {countedPlans.length < MAX_PLANS ? (
            <Link
              href="/create"
              className="group block rounded-xl border-2 border-dashed border-stone-300 p-5 transition-colors duration-150 hover:border-pine-500 hover:bg-pine-50/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-500 transition-colors duration-150 group-hover:bg-pine-100 group-hover:text-pine-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink transition-colors group-hover:text-pine-800">
                    {plans.length === 0 ? 'Create your first plan' : 'Create a new plan'}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {countedPlans.length} of {MAX_PLANS} slots used
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-stone-200 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-50 text-stone-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-400">Plan limit reached</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    Lock or delete a plan to free up a slot
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
