import { useUser } from '@clerk/nextjs'
import LoginButton from '../components/LoginButton'
import Link from 'next/link'

export default function Home() {
  const { isSignedIn, isLoaded } = useUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 bg-question-pattern">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 min-w-0">
          <h1 className="text-lg font-semibold text-slate-900">Which Days?</h1>
          <LoginButton />
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Find a day that works for everyone
        </h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          Create a plan, share the link, and let people mark the dates they
          can&apos;t do. The surviving dates work for everyone.
        </p>

        {isLoaded && isSignedIn ? (
          <div className="space-y-3">
            <Link
              href="/create"
              className="inline-block rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors"
            >
              Create a Plan
            </Link>
            <div>
              <Link
                href="/dashboard"
                className="text-sm text-teal-600 hover:text-teal-800"
              >
                My Plans
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Sign in to get started</p>
            <LoginButton />
          </div>
        )}
      </main>
    </div>
  )
}
