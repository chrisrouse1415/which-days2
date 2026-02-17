import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import PlanForm from '../components/PlanForm'
import LoginButton from '../components/LoginButton'

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
      <div className="min-h-screen bg-warm-gradient flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-warm-gradient flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Sign in to create a plan</p>
        <LoginButton />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-gradient bg-question-pattern bg-grain">
      <header className="glass-header border-b border-teal-100/50 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <Link href="/" className="text-xl font-display font-semibold text-teal-900 hover:text-teal-700 transition-colors tracking-tight">
            Which Days?
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors"
            >
              My Plans
            </Link>
            <LoginButton />
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight mb-8">Create a Plan</h1>
        {loading && (
          <p className="text-center text-slate-400">Loading...</p>
        )}

        {error && (
          <div className="max-w-lg mx-auto p-3 text-sm text-rose-700 bg-rose-50/80 border border-rose-200/60 rounded-xl">
            {error}
          </div>
        )}

        {quota && <PlanForm quota={quota} />}
      </main>
    </div>
  )
}
