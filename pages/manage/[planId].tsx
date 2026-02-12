import { useRouter } from 'next/router'
import Link from 'next/link'
import LoginButton from '../../components/LoginButton'

export default function ManagePlan() {
  const router = useRouter()
  const { planId } = router.query

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-gray-700">
            Which Days
          </Link>
          <LoginButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-gray-400 mb-4 font-mono">{planId}</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Plan Management</h2>
        <p className="text-gray-500 mb-6">Coming soon — this is where you&apos;ll manage your plan, see results, and share the link.</p>
        <Link href="/create" className="text-sm text-blue-600 hover:text-blue-800">
          Create another plan
        </Link>
      </main>
    </div>
  )
}
