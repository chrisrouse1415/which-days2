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
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Sign in to create a plan</p>
        <LoginButton />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Create a Plan</h1>
          <LoginButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading && (
          <p className="text-center text-gray-500">Loading...</p>
        )}

        {error && (
          <div className="max-w-lg mx-auto p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {quota && <PlanForm quota={quota} />}
      </main>
    </div>
  )
}
