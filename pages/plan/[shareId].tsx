import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
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

function getStorageKey(shareId: string) {
  return `whichdays_participant_${shareId}`
}

export default function PlanShare() {
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-gray-700">
            Which Days
          </Link>
          {myName && (
            <span className="text-sm text-gray-500">
              Joined as <span className="font-medium text-gray-700">{myName}</span>
            </span>
          )}
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        {error ? (
          <div className="text-center py-16">
            <p className="text-red-600">{error}</p>
          </div>
        ) : phase === 'loading' ? (
          <div className="text-center py-16">
            <p className="text-gray-400">Loading plan...</p>
          </div>
        ) : phase === 'join' && planData ? (
          <div className="py-8">
            <JoinForm
              shareId={shareId!}
              planTitle={planData.plan.title}
              onJoined={handleJoined}
            />
          </div>
        ) : phase === 'availability' && planData && participantId ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{planData.plan.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {planData.participants.map((p) => p.display_name).join(', ')}
              </p>
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
  )
}
