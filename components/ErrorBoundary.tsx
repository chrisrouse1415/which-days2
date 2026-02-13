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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
            <p className="text-sm text-slate-500">An unexpected error occurred.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
