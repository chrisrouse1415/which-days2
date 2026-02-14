import { useState } from 'react'

interface PlanStatusControlsProps {
  planId: string
  currentStatus: string
  onStatusChanged: (status: string) => void
  onDataRefresh?: () => void
}

export default function PlanStatusControls({
  planId,
  currentStatus,
  onStatusChanged,
  onDataRefresh,
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

  if (currentStatus === 'locked') {
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
            Locked
          </span>
          <button
            onClick={() => {
              setConfirmDelete(true)
            }}
            disabled={loading !== null}
            className="px-3 py-1.5 text-sm font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-colors"
          >
            Delete Plan
          </button>
          {confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-rose-600">Are you sure?</span>
              <button
                onClick={() => handleStatusChange('deleted')}
                disabled={loading !== null}
                className="px-2 py-1 text-xs font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-50"
              >
                {loading === 'deleted' ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
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
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => handleStatusChange('locked')}
          disabled={loading !== null}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'locked' ? 'Locking...' : 'Lock Plan'}
        </button>
        <button
          onClick={() => {
            setConfirmReset(false)
            setConfirmDelete(true)
          }}
          disabled={loading !== null}
          className="px-3 py-1.5 text-sm font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-colors"
        >
          Delete Plan
        </button>
        <button
          onClick={() => {
            setConfirmDelete(false)
            setConfirmReset(true)
          }}
          disabled={loading !== null}
          className="px-3 py-1.5 text-sm font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors"
        >
          Reset Plan
        </button>
      </div>
      {confirmDelete && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <span className="text-sm text-rose-600">Are you sure?</span>
          <button
            onClick={() => handleStatusChange('deleted')}
            disabled={loading !== null}
            className="px-2 py-1 text-xs font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-50"
          >
            {loading === 'deleted' ? 'Deleting...' : 'Yes, delete'}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      )}
      {confirmReset && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <p className="text-sm text-amber-800">
            This will remove all participants and their votes. The plan title and dates will be kept. Are you sure?
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={loading !== null}
              className="px-2 py-1 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50"
            >
              {loading === 'reset' ? 'Resetting...' : 'Yes, reset'}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
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
