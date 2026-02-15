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

        {/* How it works */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-warm border border-white/80 transition-lift">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-lg mb-4">
              1
            </div>
            <h3 className="font-display font-semibold text-slate-900 mb-1">Pick</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Pick some possible dates.
            </p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-warm border border-white/80 transition-lift">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-lg mb-4">
              2
            </div>
            <h3 className="font-display font-semibold text-slate-900 mb-1">Share</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Share a link. Anyone can join, no sign-up needed.
            </p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-warm border border-white/80 transition-lift">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg mb-4">
              3
            </div>
            <h3 className="font-display font-semibold text-slate-900 mb-1">Decide</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              People cross off what they can&apos;t do. See which dates survive.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
