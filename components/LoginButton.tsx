'use client'

import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs'

export default function LoginButton() {
  const { isSignedIn, user } = useUser()

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-4 min-w-0">
        <span className="text-sm text-gray-600 truncate max-w-[150px] sm:max-w-none">
          Hello, {user.firstName || user.emailAddresses[0].emailAddress}
        </span>
        <SignOutButton>
          <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
            Sign Out
          </button>
        </SignOutButton>
      </div>
    )
  }

  return (
    <SignInButton>
      <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
        Sign In
      </button>
    </SignInButton>
  )
}