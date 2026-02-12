import { useUser } from '@clerk/nextjs'
import LoginButton from '../components/LoginButton'
import Link from 'next/link'

export default function Home() {
  const { isSignedIn, isLoaded } = useUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Which Days</h1>
          <LoginButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Find a day that works for everyone
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Create a plan, share the link, and let people mark the dates they
          can&apos;t do. The surviving dates work for everyone.
        </p>

        {isLoaded && isSignedIn ? (
          <Link
            href="/create"
            className="inline-block rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Create a Plan
          </Link>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Sign in to get started</p>
            <LoginButton />
          </div>
        )}
      </main>
    </div>
  )
}
