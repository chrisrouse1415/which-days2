import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  // Routes that don't require authentication
  publicRoutes: [
    '/',
    '/plan/(.*)', // Participant routes (no auth required)
    '/api/participants/(.*)',
    '/api/availability/(.*)',
    '/api/webhooks/clerk'
  ],
  // Routes that require authentication (owner actions)
  protectedRoutes: [
    '/dashboard',
    '/create',
    '/manage/(.*)',
    '/api/plans/(.*)'
  ]
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
}