import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-paper px-4">
          <div className="space-y-4 text-center">
            <h1 className="font-display text-xl font-semibold text-ink">Something went wrong</h1>
            <p className="text-sm text-stone-500">An unexpected error occurred.</p>
            <button onClick={() => this.setState({ hasError: false })} className="btn-primary">
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
