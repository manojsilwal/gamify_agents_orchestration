import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="p-8 max-w-content mx-auto">
      <h1 className="font-headline-lg text-on-background mb-2">Page not found</h1>
      <p className="font-body-md text-on-surface-variant mb-6">
        This path is not mapped. Use the sidebar to navigate.
      </p>
      <Link to="/" className="text-secondary font-semibold underline">
        Back to dashboard
      </Link>
    </div>
  )
}
