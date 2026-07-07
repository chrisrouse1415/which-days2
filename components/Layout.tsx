import Link from 'next/link'
import type { ReactNode } from 'react'

export function Wordmark() {
  return (
    <span className="font-display text-lg font-semibold tracking-tight text-ink">
      Which days<span className="text-pine-600">?</span>
    </span>
  )
}

interface LayoutProps {
  children: ReactNode
  /** Content for the right side of the header (nav links, account button). */
  headerRight?: ReactNode
  /** Where the wordmark links to. Defaults to home. */
  homeHref?: string
  /** Page column width. Defaults to narrow. */
  wide?: boolean
}

export default function Layout({ children, headerRight, homeHref = '/', wide = false }: LayoutProps) {
  const container = wide ? 'max-w-4xl' : 'max-w-2xl'

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-paper/95 backdrop-blur-sm">
        <div className={`${container} mx-auto flex min-w-0 items-center justify-between gap-4 px-4 py-3.5`}>
          <Link href={homeHref} className="shrink-0">
            <Wordmark />
          </Link>
          {headerRight}
        </div>
      </header>

      <main id="main-content" className={`${container} mx-auto px-4 py-8`}>
        {children}
      </main>
    </div>
  )
}

/** Centered full-page message used for auth gates and top-level loading. */
export function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4">
      {children}
    </div>
  )
}
