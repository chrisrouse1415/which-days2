import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import Link from 'next/link'
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

export default function Dashboard() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.replace('/')
      return
    }

    async function fetchPlans() {
      try {
        const res = await fetch('/api/plans/list')
        if (!res.ok) {
          setError('Failed to load plans')
          return
        }
        const data = await res.json()
        setPlans(data.plans)
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const activePlans = plans.filter((p) => p.status === 'active')
  const maxPlans = 3

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-gray-700">
            Which Days
          </Link>
          <LoginButton />
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Plans</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {activePlans.length}/{maxPlans} active
            </span>
            {activePlans.length < maxPlans && (
              <Link
                href="/create"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create a Plan
              </Link>
            )}
          </div>
        </div>

        {error ? (
          <p className="text-red-600 text-center py-8">{error}</p>
        ) : loading ? (
          <p className="text-gray-400 text-center py-8">Loading plans...</p>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">You haven&apos;t created any plans yet.</p>
            <Link
              href="/create"
              className="inline-block px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Create your first plan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/manage/${plan.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-medium text-gray-900">{plan.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {plan.participantCount} participant{plan.participantCount !== 1 ? 's' : ''}
                      {plan.participantCount > 0 && (
                        <span>
                          {' '}&middot; {plan.doneCount} done
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      plan.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
