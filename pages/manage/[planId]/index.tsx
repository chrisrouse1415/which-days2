import { useEffect } from 'react'
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

          <div className="space-y-2">
            <h3 className="section-label">Share link</h3>
            <ShareLink shareId={data.plan.share_id} />
          </div>

          <div className="space-y-2">
            <h3 className="section-label">Plan controls</h3>
            <PlanStatusControls
              planId={data.plan.id}
              currentStatus={data.plan.status}
              onStatusChanged={handleStatusChanged}
              onDataRefresh={handleDataRefresh}
              editHref={`/manage/${planId}/edit`}
            />
          </div>

          <div className="space-y-2">
            <h3 className="section-label">Responses</h3>
            <ResultsMatrix
              planId={data.plan.id}
              planStatus={data.plan.status}
              dates={data.dates}
              participants={data.participants}
              matrix={data.matrix}
              onDataRefresh={handleDataRefresh}
            />
          </div>

          <div className="border-t border-stone-200 pt-4">
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
