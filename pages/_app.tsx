import { ClerkProvider } from '@clerk/nextjs'
import type { AppProps } from 'next/app'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import ErrorBoundary from '../components/ErrorBoundary'
import '../styles/globals.css'

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
})

const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider {...pageProps}>
      {/* Set font variables on :root so Clerk portals inherit them too */}
      <style jsx global>{`
        :root {
          --font-sans: ${sans.style.fontFamily};
          --font-display: ${display.style.fontFamily};
        }
      `}</style>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-pine-700 focus:rounded-lg focus:shadow-raised focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </ClerkProvider>
  )
}
