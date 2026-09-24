import { SignInButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import LoginButton from '../components/LoginButton'
import Layout from '../components/Layout'
import CalendarPaper from '../components/CalendarPaper'
import FlipCalendar from '../components/FlipCalendar'

export default function Home() {
  const { isSignedIn, isLoaded } = useUser()

  return (
    <Layout headerRight={<LoginButton />} background={<CalendarPaper />}>
      <div className="py-10 sm:py-24">
        <div className="flex flex-col gap-12 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <div className="max-w-md">
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
              Find a day that works for everyone
            </h1>
            <p className="mt-5 text-base leading-relaxed text-stone-600 sm:text-lg">
              Pick a few dates, share the link, and everyone crosses off the days they can’t make.
            </p>
            <div className={`mt-8 transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
              {isSignedIn ? (
                <div className="flex flex-wrap items-center gap-4">
                  <Link href="/create" className="btn-primary !px-6 !py-3">
                    Create a plan
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-pine-700 transition-colors hover:text-pine-800"
                  >
                    My plans &rarr;
                  </Link>
                </div>
              ) : (
                <SignInButton forceRedirectUrl="/create">
                  <button className="btn-primary !px-6 !py-3">Create a plan</button>
                </SignInButton>
              )}
            </div>
          </div>
          <FlipCalendar />
        </div>
      </div>
    </Layout>
  )
}
