import type { ReactNode } from 'react'

export function ApiStatus({
  loading,
  error,
  children,
}: {
  loading: boolean
  error: Error | null
  children: ReactNode
}) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 bg-surface-container-high rounded w-1/3" />
        <div className="h-40 bg-surface-container-high rounded-xl" />
        <div className="h-40 bg-surface-container-high rounded-xl" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="m-6 rounded-xl border border-error-container bg-error-container/30 p-4 text-on-error-container">
        <p className="font-headline-md text-sm font-semibold mb-1">Could not load data</p>
        <p className="font-body-sm opacity-90">{error.message}</p>
        <p className="font-body-sm mt-2 text-on-surface-variant">
          Ensure the API is running (<code className="text-xs">docker compose up api</code>) and{' '}
          <code className="text-xs">scripts/seed.py</code> has been applied.
        </p>
      </div>
    )
  }
  return <>{children}</>
}
