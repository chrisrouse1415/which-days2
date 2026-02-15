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
            <div className="relative flex items-start justify-between">
              {/* Connecting line behind the nodes */}
              <div
                className="absolute top-[15px] left-[16.67%] right-[16.67%] h-[2px]"
                style={{ background: 'linear-gradient(to right, #0d9488, #d97706, #059669)' }}
              />
              {/* Step 1 */}
              <div className="relative flex flex-col items-center text-center w-1/3 px-2">
                <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-teal-600/30 z-10">
                  1
                </div>
                <h3 className="font-display font-semibold text-slate-900 mt-3 text-[15px]">Pick</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Choose some possible dates.
                </p>
              </div>
              {/* Step 2 */}
              <div className="relative flex flex-col items-center text-center w-1/3 px-2">
                <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-amber-600/30 z-10">
                  2
                </div>
                <h3 className="font-display font-semibold text-slate-900 mt-3 text-[15px]">Share</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Send everyone the link.
                </p>
              </div>
              {/* Step 3 */}
              <div className="relative flex flex-col items-center text-center w-1/3 px-2">
                <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-emerald-600/30 z-10">
                  3
                </div>
                <h3 className="font-display font-semibold text-slate-900 mt-3 text-[15px]">Decide</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  People cut dates they can&apos;t do, see what&apos;s left.
                </p>
              </div>
            </div>
          </div>

          {/* Mobile: vertical timeline */}
          <div className="sm:hidden">
            <div className="relative flex flex-col gap-4 pl-8">
              {/* Vertical connecting line */}
              <div
                className="absolute left-[11px] top-[12px] w-[2px]"
                style={{ background: 'linear-gradient(to bottom, #0d9488, #d97706, #059669)', height: 'calc(100% - 48px)' }}
              />
              {/* Step 1 */}
              <div className="relative">
                <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold shadow-md shadow-teal-600/30 z-10">
                  1
                </div>
                <p className="font-display font-semibold text-slate-900 text-sm leading-6">Pick</p>
                <p className="text-xs text-slate-500">Choose some possible dates.</p>
              </div>
              {/* Step 2 */}
              <div className="relative">
                <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-[10px] font-bold shadow-md shadow-amber-600/30 z-10">
                  2
                </div>
                <p className="font-display font-semibold text-slate-900 text-sm leading-6">Share</p>
                <p className="text-xs text-slate-500">Send everyone the link.</p>
              </div>
              {/* Step 3 */}
              <div className="relative">
                <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold shadow-md shadow-emerald-600/30 z-10">
                  3
                </div>
                <p className="font-display font-semibold text-slate-900 text-sm leading-6">Decide</p>
                <p className="text-xs text-slate-500">People cut dates they can&apos;t do, see what&apos;s left.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
