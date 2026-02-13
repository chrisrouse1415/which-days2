import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import PlanForm from '../components/PlanForm'
import LoginButton from '../components/LoginButton'

interface QuotaInfo {
  activePlanCount: number
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Sign in to create a plan</p>
        <LoginButton />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <h1 className="text-lg font-semibold text-slate-900">Create a Plan</h1>
          <LoginButton />
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        {loading && (
          <p className="text-center text-slate-500">Loading...</p>
        )}

        {error && (
          <div className="max-w-lg mx-auto p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        {quota && <PlanForm quota={quota} />}
      </main>
    </div>
  )
}
