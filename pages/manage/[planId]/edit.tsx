import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import Link from 'next/link'
import PlanForm from '../../../components/PlanForm'
import LoginButton from '../../../components/LoginButton'

export default function EditPlanPage() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const planId = router.query.planId as string | undefined

  const [initialTitle, setInitialTitle] = useState<string | null>(null)
  const [initialDates, setInitialDates] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.replace('/')
      return
    }
    if (!planId) return

    async function fetchPlan() {
      try {
        const res = await fetch(`/api/plans/manage?planId=${planId}`)

        if (res.status === 401) {
          router.replace('/')
          return
        }
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to load plan')
          setLoading(false)
          return
        }

        const data = await res.json()

        if (data.plan.status !== 'active') {
          setError('Only active plans can be edited')
          setLoading(false)
          return
        }

        setInitialTitle(data.plan.title)
        setInitialDates(data.dates.map((d: { date: string }) => d.date))
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, planId, router])

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-warm-gradient flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-gradient bg-question-pattern bg-grain">
      <header className="glass-header border-b border-teal-100/50 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <h1 className="text-xl font-display font-semibold text-teal-900 tracking-tight">Edit Plan</h1>
          <LoginButton />
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        {error ? (
          <div className="text-center py-16">
            <p className="text-rose-600 mb-4">{error}</p>
            <Link href={planId ? `/manage/${planId}` : '/dashboard'} className="text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors">
              Back to plan
            </Link>
          </div>
        ) : initialTitle !== null && initialDates !== null && planId ? (
          <PlanForm
            mode="edit"
            planId={planId}
            initialTitle={initialTitle}
            initialDates={initialDates}
          />
        ) : null}
      </main>
    </div>
  )
}
