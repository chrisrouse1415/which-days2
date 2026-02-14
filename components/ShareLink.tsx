import { useState } from 'react'

interface ShareLinkProps {
  shareId: string
}

export default function ShareLink({ shareId }: ShareLinkProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/plan/${shareId}`
      : `/plan/${shareId}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('failed')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        readOnly
        value={shareUrl}
        className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button
        onClick={handleCopy}
        aria-label="Copy share link"
        className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors"
      >
        {copyState === 'copied'
          ? 'Copied!'
          : copyState === 'failed'
            ? 'Failed to copy'
            : 'Copy'}
      </button>
    </div>
  )
}
