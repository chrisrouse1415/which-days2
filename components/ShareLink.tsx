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
        aria-label="Share link"
        className="field flex-1 !bg-stone-50 text-stone-600"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button
        onClick={handleCopy}
        aria-label="Copy share link"
        className={
          copyState === 'copied'
            ? 'btn border border-pine-200 bg-pine-50 text-pine-700'
            : 'btn-primary'
        }
      >
        {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy link'}
      </button>
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open share link in a new tab"
        className="btn-secondary shrink-0"
      >
        Open
      </a>
    </div>
  )
}
