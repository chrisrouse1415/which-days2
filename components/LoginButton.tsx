'use client'

import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs'

export default function LoginButton() {
  const { isSignedIn, user } = useUser()

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-slate-500 truncate max-w-[150px] sm:max-w-none">
          {user.firstName || user.emailAddresses[0].emailAddress}
        </span>
        <SignOutButton>
          <button className="px-3.5 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all">
            Sign Out
          </button>
        </SignOutButton>
      </div>
    )
  }

  return (
    <SignInButton>
      <button className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-500 rounded-lg shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-600/25 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200">
        Sign In
      </button>
    </SignInButton>
  )
}
