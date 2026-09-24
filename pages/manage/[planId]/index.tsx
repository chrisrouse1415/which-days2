import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import Link from 'next/link'
import useSWR from 'swr'
import LoginButton from '../../../components/LoginButton'
import Layout, { CenteredPage } from '../../../components/Layout'
import ShareLink from '../../../components/ShareLink'
import PlanStatusControls from '../../../components/PlanStatusControls'
import ResultsMatrix from '../../../components/ResultsMatrix'
import StatusBadge from '../../../components/StatusBadge'
import PickedDay from '../../../components/PickedDay'

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

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (res.status === 401) throw new Error('unauthorized')
    if (res.status === 403) throw new Error('forbidden')
    if (res.status === 404) throw new Error('not_found')
    if (!res.ok) throw new Error('Failed to load plan')
    return res.json()
  })

function ManageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 animate-pulse rounded-lg bg-stone-200" />
          <div className="h-4 w-32 animate-pulse rounded-lg bg-stone-100" />
        </div>
        <div className="h-6 w-16 animate-pulse rounded-lg bg-stone-100" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-stone-100" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-white" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-stone-100" />
        <div className="h-10 w-48 animate-pulse rounded-lg bg-white" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-16 animate-pulse rounded bg-stone-100" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-white" />
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
    fetcher,
    // Keep responses live while people are still crossing off days
    { refreshInterval: (latest) => (latest?.plan.status === 'active' ? 30000 : 0) }
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

  const [reopening, setReopening] = useState(false)
  const [reopenError, setReopenError] = useState<string | null>(null)

  // Un-picks the day and lets people cross off / the organizer pick again
  async function handleReopen() {
    if (!planId) return
    setReopening(true)
    setReopenError(null)
    try {
      const res = await fetch(`/api/plans/manage?planId=${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (res.ok) {
        await mutate()
      } else {
        setReopenError('Couldn’t reopen the plan. Please try again.')
      }
    } catch {
      setReopenError('Network error. Please try again.')
    } finally {
      setReopening(false)
    }
  }

  const justCreated = router.query.new === '1'

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/')
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (error?.message === 'unauthorized') {
      router.replace('/')
    }
  }, [error, router])

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

  const pickedDate = data?.dates.find((d) => d.status === 'locked')

  const errorMessage = error
    ? error.message === 'unauthorized'
      ? null // will redirect
      : error.message === 'forbidden'
        ? 'You do not own this plan.'
        : error.message === 'not_found'
          ? 'Plan not found.'
          : 'Failed to load plan.'
    : null

  return (
    <Layout wide homeHref="/dashboard" headerRight={<LoginButton />}>
      {errorMessage ? (
        <div className="py-16 text-center">
          <p className="mb-4 text-cut-600">{errorMessage}</p>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-pine-700 transition-colors hover:text-pine-800"
          >
            Back to dashboard
          </Link>
        </div>
      ) : isLoading ? (
        <ManageSkeleton />
      ) : data ? (
        <div className="space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                {data.plan.title}
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                {data.participants.length} participant{data.participants.length !== 1 ? 's' : ''}
                {data.participants.length > 0 && (
                  <span className="text-stone-400">
                    {' '}
                    &middot; {data.participants.filter((p) => p.is_done).length} done
                  </span>
                )}
              </p>
            </div>
            <div className="shrink-0">
              <StatusBadge status={data.plan.status} />
            </div>
          </div>

          {data.plan.status === 'locked' &&
            (pickedDate ? (
              <PickedDay date={pickedDate.date} label="You picked">
                <p className="mt-4 text-sm text-stone-500">
                  Everyone with the link can see it&rsquo;s decided.
                </p>
                <button onClick={handleReopen} disabled={reopening} className="btn-secondary mt-5 !py-2">
                  {reopening ? 'Reopening…' : 'Change day'}
                </button>
                {reopenError && (
                  <p className="mt-2 text-xs text-cut-600" role="alert">
                    {reopenError}
                  </p>
                )}
              </PickedDay>
            ) : (
              <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
                <p className="text-sm text-stone-600">This plan is closed, so nobody can cross off days.</p>
                <button onClick={handleReopen} disabled={reopening} className="btn-secondary !py-2">
                  {reopening ? 'Reopening…' : 'Reopen plan'}
                </button>
              </div>
            ))}

          {data.plan.status === 'active' && justCreated && (
            <div className="rounded-xl border border-pine-200 bg-pine-50 p-4">
              <p className="text-sm font-semibold text-pine-800">Your plan is ready</p>
              <p className="mt-1 text-sm text-pine-800/80">
                Send the link below to your group. As people cross off days, you&rsquo;ll see what&rsquo;s
                left here.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="section-label">
              {data.plan.status === 'active' ? 'Share with your group' : 'Share link'}
            </h3>
            <ShareLink shareId={data.plan.share_id} title={data.plan.title} />
            {data.plan.status === 'active' && (
              <p className="text-xs text-stone-500">
                You chose these dates, so you&rsquo;re counted as free on all of them &mdash; no need to
                fill it in yourself.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="section-label">Responses</h3>
            <ResultsMatrix
              planId={data.plan.id}
              planStatus={data.plan.status}
              dates={data.dates}
              participants={data.participants}
              matrix={data.matrix}
              editHref={`/manage/${planId}/edit`}
              onDataRefresh={handleDataRefresh}
            />
          </div>

          <div className="space-y-2 border-t border-stone-200 pt-6">
            <h3 className="section-label">Plan settings</h3>
            <PlanStatusControls
              planId={data.plan.id}
              currentStatus={data.plan.status}
              onStatusChanged={handleStatusChanged}
              onDataRefresh={handleDataRefresh}
              editHref={`/manage/${planId}/edit`}
            />
          </div>

          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-pine-700 transition-colors hover:text-pine-800"
            >
              &larr; Back to dashboard
            </Link>
          </div>
        </div>
      ) : null}
    </Layout>
  )
}
