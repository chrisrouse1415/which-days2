import { useState } from 'react'
import Link from 'next/link'
import StatusBadge from './StatusBadge'

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
  const [confirming, setConfirming] = useState<'delete' | 'reset' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function showError(message: string) {
    setError(message)
    setTimeout(() => setError(null), 3000)
  }

  async function patchPlan(body: Record<string, unknown>, loadingKey: string): Promise<boolean> {
    setLoading(loadingKey)
    setError(null)
    try {
      const res = await fetch(`/api/plans/manage?planId=${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showError(data.error || 'Something went wrong. Please try again.')
        return false
      }
      return true
    } catch {
      showError('Network error. Please try again.')
      return false
    } finally {
      setLoading(null)
    }
  }

  async function handleStatusChange(status: 'locked' | 'deleted' | 'active') {
    if (await patchPlan({ status }, status)) {
      setConfirming(null)
      onStatusChanged(status)
    }
  }

  async function handleReset() {
    if (await patchPlan({ reset: true }, 'reset')) {
      setConfirming(null)
      if (onDataRefresh) onDataRefresh()
    }
  }

  if (currentStatus === 'deleted') {
    return <p className="text-sm text-stone-400">This plan has been deleted.</p>
  }

  const smallBtn = '!px-3 !py-1.5 !text-xs'

  const deleteConfirm = confirming === 'delete' && (
    <div className="flex items-center gap-2.5 rounded-lg border border-cut-200 bg-cut-50 p-3">
      <span className="text-sm text-cut-700">Delete this plan? Participants lose access.</span>
      <button
        onClick={() => handleStatusChange('deleted')}
        disabled={loading !== null}
        className={`btn-danger-solid ${smallBtn}`}
      >
        {loading === 'deleted' ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button onClick={() => setConfirming(null)} className={`btn-secondary ${smallBtn}`}>
        Cancel
      </button>
    </div>
  )

  if (currentStatus === 'locked') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status="locked" />
          <button
            onClick={() => handleStatusChange('active')}
            disabled={loading !== null}
            className="btn-secondary !px-3.5 !py-1.5"
          >
            {loading === 'active' ? 'Unlocking…' : 'Unlock plan'}
          </button>
          <button
            onClick={() => setConfirming('delete')}
            disabled={loading !== null}
            className="btn-danger !px-3.5 !py-1.5"
          >
            Delete plan
          </button>
        </div>
        {deleteConfirm}
        {error && (
          <p className="text-xs text-cut-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {editHref && (
          <Link href={editHref} className="btn-secondary !px-3.5 !py-1.5">
            Edit plan
          </Link>
        )}
        <button
          onClick={() => handleStatusChange('locked')}
          disabled={loading !== null}
          className="btn-secondary !px-3.5 !py-1.5"
        >
          {loading === 'locked' ? 'Locking…' : 'Lock plan'}
        </button>
        <button
          onClick={() => setConfirming('reset')}
          disabled={loading !== null}
          className="btn-secondary !px-3.5 !py-1.5"
        >
          Reset responses
        </button>
        <button
          onClick={() => setConfirming('delete')}
          disabled={loading !== null}
          className="btn-danger !px-3.5 !py-1.5"
        >
          Delete plan
        </button>
      </div>
      {deleteConfirm}
      {confirming === 'reset' && (
        <div className="space-y-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
          <p className="text-sm text-amber-800">
            This removes all participants and their responses. The plan title and dates are kept.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={loading !== null}
              className={`btn ${smallBtn} bg-amber-600 text-white hover:bg-amber-700`}
            >
              {loading === 'reset' ? 'Resetting…' : 'Yes, reset'}
            </button>
            <button onClick={() => setConfirming(null)} className={`btn-secondary ${smallBtn}`}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="text-xs text-cut-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
