import { useState } from 'react'

interface PlanStatusControlsProps {
  planId: string
  currentStatus: string
  onStatusChanged: (status: string) => void
}

export default function PlanStatusControls({
  planId,
  currentStatus,
  onStatusChanged,
}: PlanStatusControlsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
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

  if (currentStatus === 'deleted') {
    return (
      <p className="text-sm text-gray-400">This plan has been deleted.</p>
    )
  }

  if (currentStatus === 'locked') {
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
            Locked
          </span>
          <button
            onClick={() => {
              setConfirmDelete(true)
            }}
            disabled={loading !== null}
            className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Delete Plan
          </button>
          {confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Are you sure?</span>
              <button
                onClick={() => handleStatusChange('deleted')}
                disabled={loading !== null}
                className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading === 'deleted' ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleStatusChange('locked')}
          disabled={loading !== null}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'locked' ? 'Locking...' : 'Lock Plan'}
        </button>
        <button
          onClick={() => {
            setConfirmDelete(true)
          }}
          disabled={loading !== null}
          className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Delete Plan
        </button>
        {confirmDelete && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">Are you sure?</span>
            <button
              onClick={() => handleStatusChange('deleted')}
              disabled={loading !== null}
              className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loading === 'deleted' ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}
