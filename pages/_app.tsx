import { ClerkProvider } from '@clerk/nextjs'
import type { AppProps } from 'next/app'
import ErrorBoundary from '../components/ErrorBoundary'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider {...pageProps}>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </ClerkProvider>
  )
}
