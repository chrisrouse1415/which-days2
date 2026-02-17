import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import useSWR from 'swr'
import type { GetServerSideProps } from 'next'
import { supabaseAdmin } from '../../lib/supabase-admin'
import JoinForm from '../../components/JoinForm'
import AvailabilityGrid from '../../components/AvailabilityGrid'
import DoneButton from '../../components/DoneButton'
import LiveSummary from '../../components/LiveSummary'
import NeedsReviewBanner from '../../components/NeedsReviewBanner'

interface PlanData {
  plan: {
    id: string
    title: string
    status: string
  }
  ownerName: string | null
  dates: Array<{
    id: string
    plan_id: string
    date: string
    status: 'viable' | 'eliminated' | 'locked' | 'reopened'
  }>
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
  const proto = ctx.req.headers['x-forwarded-proto'] || 'https'
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
  const title = ownerName
    ? `Join ${ownerName}'s plan: ${plan.title}`
    : plan.title
  const description = 'When are you free?'

  return { props: { og: { title, description, image: `${host}/og-image.jpg` } } }
}

function getStorageKey(shareId: string) {
  return `whichdays_participant_${shareId}`
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (res.status === 404) throw new Error('not_found')
  if (!res.ok) throw new Error('Failed to load plan')
  return res.json()
})

function PlanSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="h-7 w-48 bg-slate-200 rounded-lg animate-pulse" />

      {/* Date cards */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white/80 backdrop-blur-sm border border-white/80 rounded-xl p-4 shadow-warm"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Done button */}
      <div className="h-11 w-full bg-slate-100 rounded-xl animate-pulse" />

      {/* Summary */}
      <div className="bg-white/80 rounded-2xl p-5">
        <div className="h-5 w-36 bg-slate-200 rounded-lg animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-4 w-48 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-4 w-40 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function PlanShare({ og }: PlanShareProps) {
  const router = useRouter()
  const shareId = router.query.shareId as string | undefined

  const [participantId, setParticipantId] = useState<string | null>(() => {
    if (typeof window === 'undefined' || !shareId) return null
    return localStorage.getItem(getStorageKey(shareId))
  })
  const [isDone, setIsDone] = useState(false)
  const [needsReview, setNeedsReview] = useState(false)

  // Build SWR key — includes participantId when available
  const swrKey = shareId
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

  // Initialize participantId from localStorage once shareId becomes available (router hydration)
  useEffect(() => {
    if (shareId && participantId === null) {
      const storedId = localStorage.getItem(getStorageKey(shareId))
      if (storedId) {
        setParticipantId(storedId)
      }
    }
  }, [shareId, participantId])

  function handleJoined(newParticipantId: string) {
    if (!shareId) return
    localStorage.setItem(getStorageKey(shareId), newParticipantId)
    setParticipantId(newParticipantId)
    // SWR key will change automatically, triggering a new fetch
  }

  function handleDataRefresh() {
    mutate()
  }

  // Determine phase
  const isNotFound = error?.message === 'not_found'
  const hasError = error && !isNotFound
  const phase = isLoading
    ? 'loading'
    : planData && participantId && planData.participants.find((p) => p.id === participantId)
    ? 'availability'
    : planData
    ? 'join'
    : 'loading'

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
      <div className="min-h-screen bg-warm-gradient bg-question-pattern bg-grain">
      <header className="glass-header border-b border-teal-100/50 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <Link href="/" className="text-xl font-display font-semibold text-teal-900 hover:text-teal-700 transition-colors tracking-tight">
            Which Days?
          </Link>
          {myName && (
            <span className="text-sm text-slate-400">
              Joined as <span className="font-semibold text-slate-600">{myName}</span>
            </span>
          )}
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        {isNotFound ? (
          <div className="text-center py-16">
            <p className="text-rose-600">Plan not found</p>
          </div>
        ) : hasError ? (
          <div className="text-center py-16">
            <p className="text-rose-600">Failed to load plan. Please try again.</p>
          </div>
        ) : phase === 'loading' ? (
          <PlanSkeleton />
        ) : phase === 'join' && planData ? (
          planData.plan.status !== 'active' ? (
            <div className="text-center py-16">
              <p className="text-slate-600 text-sm">
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
              <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">{planData.plan.title}</h1>
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
      </main>
    </div>
    </>
  )
}
