import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import LoginButton from '../components/LoginButton'
import Layout from '../components/Layout'

const demoDays = [
  { day: 'Thu', date: 'Jun 11', note: 'Sam can’t', struck: true },
  { day: 'Fri', date: 'Jun 12', note: 'Priya can’t', struck: true },
  { day: 'Sat', date: 'Jun 13', note: 'Works for everyone', struck: false },
  { day: 'Sun', date: 'Jun 14', note: 'Alex can’t', struck: true },
]

const steps = [
  {
    n: '1',
    title: 'Propose',
    body: 'Choose some possible days',
  },
  {
    n: '2',
    title: 'Share',
    body: 'Everyone cuts days they can’t do',
  },
  {
    n: '3',
    title: 'Decide',
    body: 'Pick from the days that survive',
  },
]

export default function Home() {
  const { isSignedIn, isLoaded } = useUser()

  return (
    <Layout headerRight={<LoginButton />}>
      <div className="py-10 sm:py-16">
        <div className="max-w-xl">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Find a day that works for everyone
          </h1>
        </div>

        {/* The product in one picture: days being eliminated */}
        <div className="card mt-10 overflow-x-auto">
          <div className="flex min-w-max divide-x divide-stone-200 sm:min-w-0">
            {demoDays.map((d) => (
              <div
                key={d.date}
                className={`flex-1 px-4 py-4 text-center sm:px-6 ${d.struck ? '' : 'bg-pine-50/60'}`}
                aria-hidden="true"
              >
                <p className={`text-sm font-semibold ${d.struck ? 'struck' : 'text-ink'}`}>{d.day}</p>
                <p className={`text-xs ${d.struck ? 'struck' : 'text-stone-500'}`}>{d.date}</p>
                <p className={`mt-2 text-[11px] ${d.struck ? 'text-stone-400' : 'font-semibold text-pine-600'}`}>
                  {d.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          {isLoaded && isSignedIn ? (
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/create" className="btn-primary !px-6 !py-3">
                Create a Plan
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-pine-700 hover:text-pine-800 transition-colors"
              >
                My Plans &rarr;
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <LoginButton />
              <span className="text-sm text-stone-500">Sign in to get started</span>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-16 grid gap-8 border-t border-stone-200 pt-10 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n}>
              <p className="section-label">
                <span className="text-pine-600">{step.n}</span>
                <span className="ml-2">{step.title}</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
