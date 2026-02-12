import { useState } from 'react'

interface ShareLinkProps {
  shareId: string
}

export default function ShareLink({ shareId }: ShareLinkProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/plan/${shareId}`
      : `/plan/${shareId}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        readOnly
        value={shareUrl}
        className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-600"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button
        onClick={handleCopy}
        className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}
