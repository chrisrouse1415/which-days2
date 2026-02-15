import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import Link from 'next/link'
import useSWR from 'swr'
import LoginButton from '../../../components/LoginButton'
import ShareLink from '../../../components/ShareLink'
import PlanStatusControls from '../../../components/PlanStatusControls'
import ResultsMatrix from '../../../components/ResultsMatrix'

interface PlanDate {
  id: string
  date: string
  status: 'viable' | 'eliminated' | 'locked' | 'reopened'
}

interface Participant {
  id: string
  display_name: string
  is_done: boolean
}

interface ManageData {
  plan: {
    id: string
    title: string
    share_id: string
    status: 'active' | 'locked' | 'deleted'
  }
  dates: PlanDate[]
  participants: Participant[]
  matrix: Record<string, Record<string, string>>
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (res.status === 401) throw new Error('unauthorized')
  if (res.status === 403) throw new Error('forbidden')
  if (res.status === 404) throw new Error('not_found')
  if (!res.ok) throw new Error('Failed to load plan')
  return res.json()
})

function ManageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Title + status */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-6 w-16 bg-slate-100 rounded-lg animate-pulse" />
      </div>

      {/* Share link */}
      <div className="space-y-2">
        <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 w-full bg-white/80 rounded-xl animate-pulse" />
      </div>

      {/* Controls */}
      <div className="space-y-2">
        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 w-48 bg-white/80 rounded-xl animate-pulse" />
      </div>

      {/* Results matrix */}
      <div className="space-y-2">
        <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
        <div className="h-48 w-full bg-white/80 rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}

export default function ManagePlan() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const planId = router.query.planId as string | undefined

  const apiUrl = planId ? `/api/plans/manage?planId=${planId}` : null
  const { data, error, isLoading, mutate } = useSWR<ManageData>(
    isLoaded && isSignedIn && planId ? apiUrl : null,
    fetcher
  )

  function handleStatusChanged(newStatus: string) {
    if (newStatus === 'deleted') {
      router.replace('/dashboard')
      return
    }
    if (data) {
      mutate(
        { ...data, plan: { ...data.plan, status: newStatus as ManageData['plan']['status'] } },
        false
      )
    }
  }

  function handleDataRefresh() {
    mutate()
  }

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

  // Handle specific error types
  const errorMessage = error
    ? error.message === 'unauthorized'
      ? null // will redirect
      : error.message === 'forbidden'
      ? 'You do not own this plan.'
      : error.message === 'not_found'
      ? 'Plan not found.'
      : 'Failed to load plan.'
    : null

  if (error?.message === 'unauthorized') {
    router.replace('/')
    return null
  }

  return (
    <div className="min-h-screen bg-warm-gradient bg-question-pattern bg-grain">
      <header className="glass-header border-b border-teal-100/50 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <Link href="/dashboard" className="text-xl font-display font-semibold text-teal-900 hover:text-teal-700 transition-colors tracking-tight">
            Which Days?
          </Link>
          <LoginButton />
        </div>
      </header>

      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8">
        {errorMessage ? (
          <div className="text-center py-16">
            <p className="text-rose-600 mb-4">{errorMessage}</p>
            <Link href="/dashboard" className="text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors">
              Back to dashboard
            </Link>
          </div>
        ) : isLoading ? (
          <ManageSkeleton />
        ) : data ? (
          <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">{data.plan.title}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {data.participants.length} participant{data.participants.length !== 1 ? 's' : ''}
                  {data.participants.length > 0 && (
                    <span className="text-slate-400">
                      {' '}&middot; {data.participants.filter((p) => p.is_done).length} done
                    </span>
                  )}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  data.plan.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : data.plan.status === 'locked'
                    ? 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
                    : 'bg-rose-50 text-rose-500 ring-1 ring-rose-200'
                }`}
              >
                {data.plan.status}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Share Link
              </h3>
              <ShareLink shareId={data.plan.share_id} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Plan Controls
              </h3>
              <PlanStatusControls
                planId={data.plan.id}
                currentStatus={data.plan.status}
                onStatusChanged={handleStatusChanged}
                onDataRefresh={handleDataRefresh}
                editHref={`/manage/${planId}/edit`}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Results
              </h3>
              <ResultsMatrix
                planId={data.plan.id}
                planStatus={data.plan.status}
                dates={data.dates}
                participants={data.participants}
                matrix={data.matrix}
                onDataRefresh={handleDataRefresh}
              />
            </div>

            <div className="pt-4 border-t border-slate-200/60">
              <Link href="/dashboard" className="text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors">
                &larr; Back to dashboard
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
