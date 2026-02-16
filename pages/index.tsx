import { useUser } from '@clerk/nextjs'
import LoginButton from '../components/LoginButton'
import Link from 'next/link'

export default function Home() {
  const { isSignedIn, isLoaded } = useUser()

  return (
    <div className="min-h-screen bg-warm-gradient bg-question-pattern bg-grain">
      <header className="glass-header border-b border-teal-100/50 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <h1 className="text-xl font-display font-semibold text-teal-900 tracking-tight">Which Days?</h1>
          <LoginButton />
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="mb-6">
          <span className="inline-block text-5xl animate-bounce-once" role="img" aria-label="Calendar">🗓️</span>
        </div>
        <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 mb-5 leading-tight tracking-tight">
          Find a day that works{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
            for everyone
          </span>
        </h2>
        <div className="mb-10" />
        {isLoaded && isSignedIn ? (
          <div className="space-y-4">
            <Link
              href="/create"
              className="inline-block rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              Create a Plan
            </Link>
            <div>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors"
              >
                My Plans &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Sign in to get started</p>
            <LoginButton />
          </div>
        )}

        {/* How it works — connected timeline */}
        <div className="mt-20 bg-white/60 backdrop-blur-sm rounded-2xl shadow-warm border border-white/80 p-5 sm:p-8">
          {/* Desktop: horizontal flow */}
          <div className="hidden sm:block">
            <div className="flex items-start justify-between">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center w-1/3 px-2">
                <span className="text-3xl" role="img" aria-label="Lightbulb">💡</span>
                <h3 className="font-display font-semibold text-slate-900 mt-3 text-[15px]">Propose</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Choose some possible days
                </p>
              </div>
              {/* Arrow */}
              <span className="text-slate-300 text-xl mt-1 shrink-0" aria-hidden="true">&rarr;</span>
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center w-1/3 px-2">
                <span className="text-3xl" role="img" aria-label="Link">🔗</span>
                <h3 className="font-display font-semibold text-slate-900 mt-3 text-[15px]">Share</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Everyone cuts days they can&apos;t do
                </p>
              </div>
              {/* Arrow */}
              <span className="text-slate-300 text-xl mt-1 shrink-0" aria-hidden="true">&rarr;</span>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center w-1/3 px-2">
                <span className="text-3xl" role="img" aria-label="Bullseye">🎯</span>
                <h3 className="font-display font-semibold text-slate-900 mt-3 text-[15px]">Decide</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Pick from the days that survive
                </p>
              </div>
            </div>
          </div>

          {/* Mobile: vertical steps */}
          <div className="sm:hidden">
            <div className="flex flex-col gap-4 text-center">
              {/* Step 1 */}
              <div>
                <span className="text-2xl" role="img" aria-label="Lightbulb">💡</span>
                <p className="font-display font-semibold text-slate-900 text-sm leading-6">Propose</p>
                <p className="text-xs text-slate-500">Choose some possible days</p>
              </div>
              <span className="text-slate-300 text-lg" aria-hidden="true">&darr;</span>
              {/* Step 2 */}
              <div>
                <span className="text-2xl" role="img" aria-label="Link">🔗</span>
                <p className="font-display font-semibold text-slate-900 text-sm leading-6">Share</p>
                <p className="text-xs text-slate-500">Everyone cuts days they can&apos;t do</p>
              </div>
              <span className="text-slate-300 text-lg" aria-hidden="true">&darr;</span>
              {/* Step 3 */}
              <div>
                <span className="text-2xl" role="img" aria-label="Bullseye">🎯</span>
                <p className="font-display font-semibold text-slate-900 text-sm leading-6">Decide</p>
                <p className="text-xs text-slate-500">Pick from the days that survive</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
