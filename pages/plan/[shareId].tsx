import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import { supabaseAdmin } from '../../lib/supabase-admin'
import JoinForm from '../../components/JoinForm'
import AvailabilityGrid from '../../components/AvailabilityGrid'
import DoneButton from '../../components/DoneButton'
import LiveSummary from '../../components/LiveSummary'
import NeedsReviewBanner from '../../components/NeedsReviewBanner'

type Phase = 'loading' | 'join' | 'availability'

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
          description: 'Pick the dates that work for you.',
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
  const description = 'Pick the dates that work for you on Which Days?'

  return { props: { og: { title, description, image: `${host}/og-image.jpg` } } }
}

function getStorageKey(shareId: string) {
  return `whichdays_participant_${shareId}`
}

export default function PlanShare({ og }: PlanShareProps) {
  const router = useRouter()
  const shareId = router.query.shareId as string | undefined

  const [phase, setPhase] = useState<Phase>('loading')
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [needsReview, setNeedsReview] = useState(false)

  const fetchPlanData = useCallback(
    async (pid: string | null) => {
      if (!shareId) return

      const params = new URLSearchParams({ shareId })
      if (pid) params.set('participantId', pid)

      try {
        const res = await fetch(`/api/participants/plan?${params.toString()}`)

        if (res.status === 404) {
          setError('Plan not found')
          setPhase('loading')
          return
        }

        if (!res.ok) {
          setError('Failed to load plan')
          setPhase('loading')
          return
        }

        const data: PlanData = await res.json()
        setPlanData(data)

        // If we have a stored participantId, verify it exists in the plan
        if (pid) {
          const me = data.participants.find((p) => p.id === pid)
          if (me) {
            setParticipantId(pid)
            setIsDone(me.is_done)
            setNeedsReview(data.needsReview)
            setPhase('availability')
          } else {
            // Stored participant not found — clear and show join
            localStorage.removeItem(getStorageKey(shareId))
            setParticipantId(null)
            setPhase('join')
          }
        } else {
          setPhase('join')
        }
      } catch {
        setError('Network error. Please try again.')
      }
    },
    [shareId]
  )

  useEffect(() => {
    if (!shareId) return

    const storedId = localStorage.getItem(getStorageKey(shareId))
    fetchPlanData(storedId)
  }, [shareId, fetchPlanData])

  function handleJoined(newParticipantId: string) {
    if (!shareId) return
    localStorage.setItem(getStorageKey(shareId), newParticipantId)
    setParticipantId(newParticipantId)
    fetchPlanData(newParticipantId)
  }

  function handleDataRefresh() {
    fetchPlanData(participantId)
  }

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
        {error ? (
          <div className="text-center py-16">
            <p className="text-rose-600">{error}</p>
          </div>
        ) : phase === 'loading' ? (
          <div className="text-center py-16">
            <p className="text-slate-400">Loading plan...</p>
          </div>
        ) : phase === 'join' && planData ? (
          <div className="py-8">
            <JoinForm
              shareId={shareId!}
              planTitle={planData.plan.title}
              ownerName={planData.ownerName}
              onJoined={handleJoined}
            />
          </div>
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
              doneCount={planData.doneCount}
              availabilitySummary={planData.availabilitySummary}
            />
          </div>
        ) : null}
      </main>
    </div>
    </>
  )
}
