import { useState } from 'react'
import Link from 'next/link'

interface PlanStatusControlsProps {
  planId: string
  currentStatus: string
  onStatusChanged: (status: string) => void
  onDataRefresh?: () => void
  editHref?: string
}

export default function PlanStatusControls({
  planId,
  currentStatus,
  onStatusChanged,
  onDataRefresh,
  editHref,
}: PlanStatusControlsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStatusChange(status: 'locked' | 'deleted') {
    setLoading(status)
    setError(null)
    try {
      const res = await fetch(`/api/plans/manage?planId=${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        onStatusChanged(status)
        setConfirmDelete(false)
      } else {
        setError('Something went wrong. Please try again.')
        setTimeout(() => setError(null), 3000)
      }
    } catch {
      setError('Network error. Please try again.')
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(null)
    }
  }

  async function handleReset() {
    setLoading('reset')
    setError(null)
    try {
      const res = await fetch(`/api/plans/manage?planId=${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })

      if (res.ok) {
        setConfirmReset(false)
        if (onDataRefresh) onDataRefresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Something went wrong. Please try again.')
        setTimeout(() => setError(null), 3000)
      }
    } catch {
      setError('Network error. Please try again.')
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(null)
    }
  }

  if (currentStatus === 'deleted') {
    return (
      <p className="text-sm text-slate-400">This plan has been deleted.</p>
    )
  }

  async function handleUnlock() {
    setLoading('unlock')
    setError(null)
    try {
      const res = await fetch(`/api/plans/manage?planId=${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })

      if (res.ok) {
        onStatusChanged('active')
      } else {
        setError('Something went wrong. Please try again.')
        setTimeout(() => setError(null), 3000)
      }
    } catch {
      setError('Network error. Please try again.')
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(null)
    }
  }

  if (currentStatus === 'locked') {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 ring-1 ring-slate-200">
            Locked
          </span>
          <button
            onClick={handleUnlock}
            disabled={loading !== null}
            className="px-3 py-1.5 text-sm font-semibold text-teal-600 border border-teal-200/60 rounded-xl hover:bg-teal-50 disabled:opacity-50 transition-all"
          >
            {loading === 'unlock' ? 'Unlocking...' : 'Unlock Plan'}
          </button>
          <button
            onClick={() => {
              setConfirmDelete(true)
            }}
            disabled={loading !== null}
            className="px-3 py-1.5 text-sm font-semibold text-rose-600 border border-rose-200/60 rounded-xl hover:bg-rose-50 disabled:opacity-50 transition-all"
          >
            Delete Plan
          </button>
          {confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-rose-600">Are you sure?</span>
              <button
                onClick={() => handleStatusChange('deleted')}
                disabled={loading !== null}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-all"
              >
                {loading === 'deleted' ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-rose-600" role="alert">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {editHref && (
          <Link
            href={editHref}
            className="px-3.5 py-1.5 text-sm font-semibold text-teal-600 border border-teal-200/60 rounded-xl hover:bg-teal-50 hover:border-teal-300 transition-all"
          >
            Edit Plan
          </Link>
        )}
        <button
          onClick={() => handleStatusChange('locked')}
          disabled={loading !== null}
          className="px-3.5 py-1.5 text-sm font-semibold text-slate-600 border border-slate-200/60 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all"
        >
          {loading === 'locked' ? 'Locking...' : 'Lock Plan'}
        </button>
        <button
          onClick={() => {
            setConfirmReset(false)
            setConfirmDelete(true)
          }}
          disabled={loading !== null}
          className="px-3.5 py-1.5 text-sm font-semibold text-rose-600 border border-rose-200/60 rounded-xl hover:bg-rose-50 disabled:opacity-50 transition-all"
        >
          Delete Plan
        </button>
        <button
          onClick={() => {
            setConfirmDelete(false)
            setConfirmReset(true)
          }}
          disabled={loading !== null}
          className="px-3.5 py-1.5 text-sm font-semibold text-amber-700 border border-amber-200/60 rounded-xl hover:bg-amber-50 disabled:opacity-50 transition-all"
        >
          Reset Plan
        </button>
      </div>
      {confirmDelete && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50/80 border border-rose-200/60 rounded-xl">
          <span className="text-sm text-rose-600">Are you sure?</span>
          <button
            onClick={() => handleStatusChange('deleted')}
            disabled={loading !== null}
            className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-all"
          >
            {loading === 'deleted' ? 'Deleting...' : 'Yes, delete'}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
        </div>
      )}
      {confirmReset && (
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/60 rounded-xl space-y-2.5">
          <p className="text-sm text-amber-800">
            This will remove all participants and their votes. The plan title and dates will be kept. Are you sure?
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={loading !== null}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-all"
            >
              {loading === 'reset' ? 'Resetting...' : 'Yes, reset'}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="text-xs text-rose-600" role="alert">{error}</p>
      )}
    </div>
  )
}
