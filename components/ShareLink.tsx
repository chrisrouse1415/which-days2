import { useEffect, useState } from 'react'

interface ShareLinkProps {
  shareId: string
  title: string
}

export default function ShareLink({ shareId, title }: ShareLinkProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  // Detected after mount so server and client render the same markup
  const [canShare, setCanShare] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/plan/${shareId}`
      : `/plan/${shareId}`

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

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

  async function handleShare() {
    try {
      await navigator.share({
        title,
        text: `${title} — which days work for you? Cross off any you can’t make.`,
        url: shareUrl,
      })
    } catch {
      // Dismissed the share sheet — nothing to do
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          aria-label="Share link"
          className="field min-w-0 flex-1 !bg-stone-50 text-stone-600"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={handleCopy}
          aria-label="Copy share link"
          className={
            copyState === 'copied'
              ? 'btn shrink-0 border border-pine-200 bg-pine-50 text-pine-700'
              : canShare
                ? 'btn-secondary shrink-0'
                : 'btn-primary shrink-0'
          }
        >
          {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy'}
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
      {canShare && (
        <button onClick={handleShare} className="btn-primary w-full !py-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
            <path d="M16 6l-4-4-4 4" />
            <path d="M12 2v13" />
          </svg>
          Share
        </button>
      )}
    </div>
  )
}
