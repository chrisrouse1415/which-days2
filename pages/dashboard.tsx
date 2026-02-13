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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  const activePlans = plans.filter((p) => p.status === 'active')
  const maxPlans = 3

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <Link href="/" className="text-lg font-semibold text-slate-900 hover:text-teal-600 transition-colors">
            Which Days
          </Link>
          <LoginButton />
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Plans</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              {activePlans.length}/{maxPlans} active
            </span>
            {activePlans.length < maxPlans && (
              <Link
                href="/create"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors"
              >
                Create a Plan
              </Link>
            )}
          </div>
        </div>

        {error ? (
          <p className="text-rose-600 text-center py-8">{error}</p>
        ) : loading ? (
          <p className="text-slate-400 text-center py-8">Loading plans...</p>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 mb-4">You haven&apos;t created any plans yet.</p>
            <Link
              href="/create"
              className="inline-block px-6 py-3 text-sm font-medium text-white bg-teal-600 rounded-lg shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors"
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
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-medium text-slate-900">{plan.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {plan.participantCount} participant{plan.participantCount !== 1 ? 's' : ''}
                      {plan.participantCount > 0 && (
                        <span>
                          {' '}&middot; {plan.doneCount} done
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      plan.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
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
