import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs'

export default function LoginButton() {
  const { isSignedIn, user } = useUser()

  if (isSignedIn) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-sm text-stone-500 max-w-[150px] sm:max-w-none">
          {user.firstName || user.emailAddresses[0].emailAddress}
        </span>
        <SignOutButton>
          <button className="btn-secondary !px-3.5 !py-1.5">Sign out</button>
        </SignOutButton>
      </div>
    )
  }

  return (
    <SignInButton>
      <button className="btn-primary !px-4 !py-2">Sign in</button>
    </SignInButton>
  )
}
