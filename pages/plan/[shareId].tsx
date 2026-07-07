import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import useSWR from 'swr'
import type { GetServerSideProps } from 'next'
import { supabaseAdmin } from '../../lib/supabase-admin'
import JoinForm from '../../components/JoinForm'
import AvailabilityGrid from '../../components/AvailabilityGrid'
import DoneButton from '../../components/DoneButton'
import LiveSummary from '../../components/LiveSummary'
import NeedsReviewBanner from '../../components/NeedsReviewBanner'
import Layout from '../../components/Layout'

interface PlanData {
  plan: {
    id: string
    title: string
    status: string
  }
  ownerName: string | null
  participants: Array<{
    id: string
    display_name: string
    is_done: boolean
    needs_review: boolean
  }>
  availabilitySummary: Array<{
    planDateId: string
    date: string
    status: 'viable' | 'eliminated' | 'locked' | 'reopened'
    unavailableCount: number
    unavailableBy: Array<{ participantId: string; displayName: string }>
  }>
  myAvailability: Array<{
    id: string
    participant_id: string
    plan_date_id: string
    status: 'available' | 'unavailable'
  }> | null
  doneCount: number
  needsReview: boolean
}

interface OgMeta {
  title: string
  description: string
  image: string
}

interface PlanShareProps {
  og: OgMeta
}

export const getServerSideProps: GetServerSideProps<PlanShareProps> = async (ctx) => {
  const shareId = ctx.params?.shareId as string
  // Only trust the forwarded proto if it's a known scheme
  const forwardedProto = ctx.req.headers['x-forwarded-proto']
  const proto = forwardedProto === 'http' ? 'http' : 'https'
  const host = `${proto}://${ctx.req.headers.host}`

  const { data: plan } = await supabaseAdmin
    .from('plans')
    .select('title, owner_clerk_id')
    .eq('share_id', shareId)
    .single()

  if (!plan) {
    return {
      props: {
        og: {
          title: 'Which Days?',
          description: 'When are you free?',
          image: `${host}/og-image.jpg`,
        },
      },
    }
  }

  const { data: owner } = await supabaseAdmin
    .from('users')
    .select('first_name')
    .eq('clerk_id', plan.owner_clerk_id)
    .single()

  const ownerName = owner?.first_name
  const title = ownerName ? `Join ${ownerName}'s plan: ${plan.title}` : plan.title
  const description = 'When are you free?'

  return { props: { og: { title, description, image: `${host}/og-image.jpg` } } }
}

function getStorageKey(shareId: string) {
  return `whichdays_participant_${shareId}`
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (res.status === 404) throw new Error('not_found')
    if (!res.ok) throw new Error('Failed to load plan')
    return res.json()
  })

function PlanSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-48 animate-pulse rounded-lg bg-stone-200" />

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-2.5">
            <div className="mx-auto h-5 w-12 animate-pulse rounded bg-stone-200" />
            <div className="mx-auto mt-1.5 h-3 w-14 animate-pulse rounded bg-stone-100" />
            <div className="mt-3 h-8 w-full animate-pulse rounded-lg bg-stone-100" />
          </div>
        ))}
      </div>

      <div className="h-11 w-full animate-pulse rounded-lg bg-stone-100" />

      <div className="card p-5">
        <div className="mb-3 h-5 w-36 animate-pulse rounded-lg bg-stone-200" />
        <div className="space-y-2">
          <div className="h-4 w-48 animate-pulse rounded-lg bg-stone-100" />
          <div className="h-4 w-40 animate-pulse rounded-lg bg-stone-100" />
        </div>
      </div>
    </div>
  )
}

export default function PlanShare({ og }: PlanShareProps) {
  const router = useRouter()
  const shareId = router.query.shareId as string | undefined

  // undefined = localStorage not checked yet, null = checked and not joined
  const [participantId, setParticipantId] = useState<string | null | undefined>(undefined)
  const [isDone, setIsDone] = useState(false)
  const [needsReview, setNeedsReview] = useState(false)

  // Resolve stored participant session once the router provides shareId,
  // before the first fetch — avoids a duplicate request on load
  useEffect(() => {
    if (!shareId) return
    setParticipantId(localStorage.getItem(getStorageKey(shareId)))
  }, [shareId])

  const swrKey =
    shareId && participantId !== undefined
      ? `/api/participants/plan?shareId=${shareId}${participantId ? `&participantId=${participantId}` : ''}`
      : null

  const { data: planData, error, isLoading, mutate } = useSWR<PlanData>(swrKey, fetcher, {
    refreshInterval: 30000, // Poll every 30s for other participants' changes
    onSuccess: (data) => {
      if (participantId) {
        const me = data.participants.find((p) => p.id === participantId)
        if (me) {
          setIsDone(me.is_done)
          setNeedsReview(data.needsReview)
        } else {
          // Stored participant not found — clear and show join
          if (shareId) localStorage.removeItem(getStorageKey(shareId))
          setParticipantId(null)
        }
      }
    },
  })

  function handleJoined(newParticipantId: string) {
    if (!shareId) return
    localStorage.setItem(getStorageKey(shareId), newParticipantId)
    setParticipantId(newParticipantId)
    // SWR key changes automatically, triggering a new fetch
  }

  function handleDataRefresh() {
    mutate()
  }

  const isNotFound = error?.message === 'not_found'
  const hasError = error && !isNotFound
  const phase =
    isLoading || !planData
      ? 'loading'
      : participantId && planData.participants.some((p) => p.id === participantId)
        ? 'availability'
        : 'join'

  const myName = planData?.participants.find((p) => p.id === participantId)?.display_name

  return (
    <>
      <Head>
        <title>{og.title}</title>
        <meta property="og:title" content={og.title} />
        <meta property="og:description" content={og.description} />
        <meta property="og:image" content={og.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={og.title} />
        <meta name="twitter:description" content={og.description} />
        <meta name="twitter:image" content={og.image} />
      </Head>
      <Layout
        headerRight={
          myName ? (
            <span className="text-sm text-stone-500">
              Joined as <span className="font-semibold text-ink">{myName}</span>
            </span>
          ) : undefined
        }
      >
        {isNotFound ? (
          <div className="py-16 text-center">
            <p className="font-medium text-ink">This plan doesn&rsquo;t exist.</p>
            <p className="mt-1 text-sm text-stone-500">
              Check the link you were sent &mdash; it may have been deleted.
            </p>
          </div>
        ) : hasError ? (
          <div className="py-16 text-center">
            <p className="text-cut-600">Failed to load plan. Please try again.</p>
          </div>
        ) : phase === 'loading' ? (
          <PlanSkeleton />
        ) : phase === 'join' && planData ? (
          planData.plan.status !== 'active' ? (
            <div className="py-16 text-center">
              <p className="text-sm text-stone-600">
                {planData.plan.status === 'locked'
                  ? 'This plan is locked and no longer accepting participants.'
                  : 'This plan is no longer available.'}
              </p>
            </div>
          ) : (
            <div className="py-8">
              <JoinForm
                shareId={shareId!}
                planTitle={planData.plan.title}
                ownerName={planData.ownerName}
                onJoined={handleJoined}
              />
            </div>
          )
        ) : phase === 'availability' && planData && participantId ? (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                {planData.plan.title}
              </h1>
              {planData.ownerName && (
                <p className="mt-1 text-sm text-stone-500">Organized by {planData.ownerName}</p>
              )}
            </div>

            {needsReview && (
              <NeedsReviewBanner
                participantId={participantId}
                onDismissed={() => setNeedsReview(false)}
              />
            )}

            <AvailabilityGrid
              participantId={participantId}
              planId={planData.plan.id}
              shareId={shareId!}
              planStatus={planData.plan.status}
              isDone={isDone}
              availabilitySummary={planData.availabilitySummary}
              myAvailability={planData.myAvailability ?? []}
              onDataRefresh={handleDataRefresh}
            />

            {planData.plan.status === 'active' && (
              <DoneButton
                participantId={participantId}
                isDone={isDone}
                onToggled={(newIsDone) => {
                  setIsDone(newIsDone)
                  handleDataRefresh()
                }}
              />
            )}

            <LiveSummary
              participants={planData.participants}
              availabilitySummary={planData.availabilitySummary}
            />
          </div>
        ) : null}
      </Layout>
    </>
  )
}
