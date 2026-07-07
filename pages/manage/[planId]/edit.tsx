import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import Link from 'next/link'
import PlanForm from '../../../components/PlanForm'
import LoginButton from '../../../components/LoginButton'
import Layout, { CenteredPage } from '../../../components/Layout'

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

    let cancelled = false

    async function fetchPlan() {
      try {
        const res = await fetch(`/api/plans/manage?planId=${planId}`)

        if (res.status === 401) {
          router.replace('/')
          return
        }
        if (!res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setError(data.error || 'Failed to load plan')
            setLoading(false)
          }
          return
        }

        const data = await res.json()
        if (cancelled) return

        if (data.plan.status !== 'active') {
          setError('Only active plans can be edited')
          setLoading(false)
          return
        }

        setInitialTitle(data.plan.title)
        setInitialDates(data.dates.map((d: { date: string }) => d.date))
      } catch {
        if (!cancelled) setError('Network error. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPlan()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, planId, router])

  if (!isLoaded || loading) {
    return (
      <CenteredPage>
        <p className="text-stone-400">Loading&hellip;</p>
      </CenteredPage>
    )
  }

  return (
    <Layout homeHref={planId ? `/manage/${planId}` : '/dashboard'} headerRight={<LoginButton />}>
      <div className="mx-auto max-w-lg">
        <h1 className="mb-8 font-display text-2xl font-semibold tracking-tight text-ink">
          Edit plan
        </h1>

        {error ? (
          <div className="py-16 text-center">
            <p className="mb-4 text-cut-600">{error}</p>
            <Link
              href={planId ? `/manage/${planId}` : '/dashboard'}
              className="text-sm font-medium text-pine-700 transition-colors hover:text-pine-800"
            >
              Back to plan
            </Link>
          </div>
        ) : initialTitle !== null && initialDates !== null && planId ? (
          <PlanForm mode="edit" planId={planId} initialTitle={initialTitle} initialDates={initialDates} />
        ) : null}
      </div>
    </Layout>
  )
}
