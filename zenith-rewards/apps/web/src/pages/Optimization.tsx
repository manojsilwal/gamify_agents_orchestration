import { useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { ApiStatus } from '../components/ApiStatus'
import { useCrawlAndRecord, useRecommendations } from '../hooks/useZenithQueries'
import { formatShortDate } from '../lib/format'
import { API_BASE, WORKER_BASE } from '../lib/env'

export function Optimization() {
  const rec = useRecommendations()
  const crawl = useCrawlAndRecord()
  const [url, setUrl] = useState('https://www.chase.com')

  const err = (rec.error as Error) ?? null

  return (
    <ApiStatus loading={rec.isLoading} error={err}>
      <div className="flex-1 p-4 md:p-margin max-w-content mx-auto w-full pb-10 space-y-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Optimization</h1>
          <p className="font-body-md text-on-surface-variant max-w-3xl">
            Recommendations from Postgres (<code className="text-xs">transfer_bonuses</code>) plus an optional HTTP
            crawler on the worker. Crawl results are stored via the API as activity rows with{' '}
            <code className="text-xs">source=crawler</code>.
          </p>
          <p className="font-body-sm text-on-surface-variant mt-2">
            API: <code className="text-xs">{API_BASE || '(same origin)'}</code> · Worker:{' '}
            <code className="text-xs">{WORKER_BASE || '(configure VITE_WORKER_BASE_URL)'}</code>
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 max-w-3xl">
          <h2 className="font-headline-md text-primary mb-2 flex items-center gap-2">
            <MaterialIcon name="travel_explore" size={24} />
            Web crawl (worker)
          </h2>
          <p className="font-body-sm text-on-surface-variant mb-4">
            Fetches public HTML and extracts title/meta description. Then POSTs a snapshot to the API for the history
            feed.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="crawl-url-input"
              aria-label="URL to crawl"
              className="flex-1 px-4 py-2 rounded-sm border border-outline-variant bg-surface font-body-md text-on-surface outline-none focus:border-tertiary-container focus:ring-1 focus:ring-tertiary-container"
              placeholder="https://…"
            />
            <button
              type="button"
              data-testid="crawl-submit"
              disabled={crawl.isPending || !WORKER_BASE}
              onClick={() => crawl.mutate(url)}
              className="px-4 py-2 bg-secondary text-on-secondary rounded-sm font-semibold text-sm hover:bg-secondary-container hover:text-on-secondary-container transition-colors disabled:opacity-50"
            >
              {crawl.isPending ? 'Crawling…' : 'Crawl & record'}
            </button>
          </div>
          {!WORKER_BASE && (
            <p className="text-error text-sm mt-2">Set VITE_WORKER_BASE_URL (e.g. http://localhost:8001) for crawls.</p>
          )}
          {crawl.isError && (
            <p className="text-error text-sm mt-2">{(crawl.error as Error).message}</p>
          )}
          {crawl.isSuccess && crawl.data && (
            <div className="mt-4 rounded-lg bg-surface-container-low p-3 font-body-sm text-on-surface">
              <p className="font-semibold text-primary">{crawl.data.title}</p>
              <p className="text-on-surface-variant mt-1 line-clamp-3">{crawl.data.excerpt}</p>
              <p className="text-xs text-on-surface-variant mt-2">{crawl.data.url}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-headline-md text-primary">Transfer & bonus opportunities</h2>
          <div className="grid gap-4">
            {(rec.data ?? []).map((r) => (
              <div
                key={r.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <p className="font-headline-md text-body-md font-semibold text-on-surface">{r.title}</p>
                  <p className="font-body-sm text-on-surface-variant mt-1">{r.summary}</p>
                  <p className="font-body-sm text-secondary mt-2 font-data-mono">
                    {r.bank_program} → {r.transfer_partner} · +{r.bonus_percentage}%
                    {r.end_date ? ` · ends ${formatShortDate(r.end_date)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 px-4 py-2 bg-primary text-on-primary rounded-sm text-sm font-semibold hover:opacity-90"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ApiStatus>
  )
}
