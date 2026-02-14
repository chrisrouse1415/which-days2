'use client'

import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs'

export default function LoginButton() {
  const { isSignedIn, user } = useUser()

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-4 min-w-0">
        <span className="text-sm text-slate-600 truncate max-w-[150px] sm:max-w-none">
          Hello, {user.firstName || user.emailAddresses[0].emailAddress}
        </span>
        <SignOutButton>
          <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors">
            Sign Out
          </button>
        </SignOutButton>
      </div>
    )
  }

  return (
    <SignInButton>
      <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg shadow-md shadow-teal-600/20 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors">
        Sign In
      </button>
    </SignInButton>
  )
}
