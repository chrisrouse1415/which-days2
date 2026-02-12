import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import Link from 'next/link'
import LoginButton from '../../components/LoginButton'
import ShareLink from '../../components/ShareLink'
import PlanStatusControls from '../../components/PlanStatusControls'
import ResultsMatrix from '../../components/ResultsMatrix'

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

export default function ManagePlan() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const planId = router.query.planId as string | undefined

  const [data, setData] = useState<ManageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    if (!planId) return

    try {
      const res = await fetch(`/api/plans/manage?planId=${planId}`)

      if (res.status === 401) {
        router.replace('/')
        return
      }
      if (res.status === 403) {
        setError('You do not own this plan.')
        setLoading(false)
        return
      }
      if (res.status === 404) {
        setError('Plan not found.')
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError('Failed to load plan.')
        setLoading(false)
        return
      }

      const json = await res.json()
      setData(json)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.replace('/')
      return
    }
    if (!planId) return

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, planId, router])

  function handleStatusChanged(newStatus: string) {
    if (newStatus === 'deleted') {
      router.replace('/dashboard')
      return
    }
    if (data) {
      setData({
        ...data,
        plan: { ...data.plan, status: newStatus as ManageData['plan']['status'] },
      })
    }
  }

  function handleDataRefresh() {
    fetchData()
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold text-gray-900 hover:text-gray-700">
            Which Days
          </Link>
          <LoginButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error ? (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">
              Back to dashboard
            </Link>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{data.plan.title}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {data.participants.length} participant{data.participants.length !== 1 ? 's' : ''}
                  {data.participants.length > 0 && (
                    <span>
                      {' '}&middot; {data.participants.filter((p) => p.is_done).length} done
                    </span>
                  )}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  data.plan.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : data.plan.status === 'locked'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {data.plan.status}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Share Link
              </h3>
              <ShareLink shareId={data.plan.share_id} />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Plan Controls
              </h3>
              <PlanStatusControls
                planId={data.plan.id}
                currentStatus={data.plan.status}
                onStatusChanged={handleStatusChanged}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
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

            <div className="pt-4 border-t border-gray-200">
              <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">
                &larr; Back to dashboard
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
