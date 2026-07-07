import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import PlanForm from '../components/PlanForm'
import LoginButton from '../components/LoginButton'
import Layout, { CenteredPage } from '../components/Layout'

interface QuotaInfo {
  planCount: number
  maxPlans: number
  canCreate: boolean
}

export default function CreatePage() {
  const { isSignedIn, isLoaded } = useUser()
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    async function fetchQuota() {
      try {
        const res = await fetch('/api/plans/quota')
        if (!res.ok) {
          throw new Error('Failed to load quota')
        }
        const data = await res.json()
        setQuota(data)
      } catch {
        setError('Failed to load quota information')
      } finally {
        setLoading(false)
      }
    }

    fetchQuota()
  }, [isLoaded, isSignedIn])

  if (!isLoaded) {
    return (
      <CenteredPage>
        <p className="text-stone-400">Loading&hellip;</p>
      </CenteredPage>
    )
  }

  if (!isSignedIn) {
    return (
      <CenteredPage>
        <p className="text-stone-500">Sign in to create a plan</p>
        <LoginButton />
      </CenteredPage>
    )
  }

  return (
    <Layout
      headerRight={
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-pine-700 transition-colors hover:text-pine-800"
          >
            My plans
          </Link>
          <LoginButton />
        </div>
      }
    >
      <div className="mx-auto max-w-lg">
        <h1 className="mb-8 font-display text-2xl font-semibold tracking-tight text-ink">
          Create a plan
        </h1>

        {loading && <p className="text-center text-stone-400">Loading&hellip;</p>}

        {error && (
          <div className="rounded-lg border border-cut-200 bg-cut-50 p-3 text-sm text-cut-700" role="alert">
            {error}
          </div>
        )}

        {quota && <PlanForm quota={quota} />}
      </div>
    </Layout>
  )
}
