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
        className="flex-1 px-4 py-2.5 text-sm bg-white/60 border border-slate-200/60 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 transition-all"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button
        onClick={handleCopy}
        aria-label="Copy share link"
        className={`shrink-0 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
          copyState === 'copied'
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            : 'text-white bg-gradient-to-r from-teal-600 to-teal-500 shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-600/25 hover:-translate-y-0.5'
        }`}
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
