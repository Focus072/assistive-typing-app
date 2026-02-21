"use client"

import React, { Component, ReactNode } from "react"
import { logger } from "@/lib/logger"
import { useRouter } from "next/navigation"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

function ErrorFallback({ error }: { error: Error | null }) {
  const router = useRouter()
  
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="bg-white border border-black rounded-2xl p-8 max-w-md w-full text-center shadow-md">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-black mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">
          {error?.message || "An unexpected error occurred. Please try refreshing the page."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-900 transition-colors"
          >
            Refresh Page
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 rounded-lg bg-white border border-black text-black hover:bg-gray-50 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

