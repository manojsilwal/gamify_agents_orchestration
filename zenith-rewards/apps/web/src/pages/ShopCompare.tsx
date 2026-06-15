import { useEffect, useMemo, useState, useRef } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { ApiStatus } from '../components/ApiStatus'
import type { RetailerCompareRow, ShoppingCompareResponse } from '../lib/api/types'
import { postShoppingCompareStream } from '../lib/api/client'

function formatUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function statusLabel(row: RetailerCompareRow & { isFetching?: boolean }): string {
  if (row.isFetching) return 'Fetching...'
  if (row.ok) return 'OK'
  if (row.status_code === 503) return 'Blocked'
  if (row.status_code === 403) return 'Denied'
  if (row.likely_blocked || row.error === 'likely_bot_challenge') return 'Challenge'
  if (row.error === 'not_found_in_google_shopping') return 'Not listed'
  if (row.error === 'timeout') return 'Timeout'
  if (row.error === 'no_price' || row.error === 'product_not_found') return 'No price'
  const err = row.error ?? ''
  if (err.startsWith('fetch_failed')) return 'Unreach.'
  return 'No data'
}

function tierDebugLabel(row: RetailerCompareRow): string | null {
  if (row.fetch_tier == null && !row.detection_hits?.length) return null
  const tier = row.fetch_tier != null ? `Tier ${row.fetch_tier}` : row.tier_name ?? null
  const hit = row.detection_hits?.[0]
  if (tier && hit) return `${tier} · ${hit}`
  return tier ?? hit ?? null
}

const showTierDebug = import.meta.env.DEV

function shortLine(s: string, max = 72): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function issuerTileTheme(issuer: string): { icon: string; ring: string; bg: string } {
  const u = issuer.toLowerCase()
  if (u.includes('chase'))
    return { icon: 'account_balance', ring: 'ring-blue-500/40', bg: 'bg-gradient-to-br from-blue-600/10 to-slate-900/5' }
  if (u.includes('american express') || u === 'amex')
    return { icon: 'credit_score', ring: 'ring-emerald-500/40', bg: 'bg-gradient-to-br from-emerald-600/10 to-slate-900/5' }
  if (u.includes('citi'))
    return { icon: 'savings', ring: 'ring-cyan-500/40', bg: 'bg-gradient-to-br from-cyan-600/10 to-slate-900/5' }
  if (u.includes('discover'))
    return { icon: 'loyalty', ring: 'ring-orange-500/40', bg: 'bg-gradient-to-br from-orange-500/10 to-slate-900/5' }
  if (u.includes('wells'))
    return { icon: 'real_estate_agent', ring: 'ring-amber-500/40', bg: 'bg-gradient-to-br from-amber-500/10 to-slate-900/5' }
  return { icon: 'card_giftcard', ring: 'ring-primary/30', bg: 'bg-gradient-to-br from-primary/10 to-slate-900/5' }
}

function humanizeMutationError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  try {
    const j = JSON.parse(raw) as { detail?: unknown }
    if (typeof j.detail === 'string') return j.detail
  } catch {
    /* not JSON */
  }
  return raw
}

function ShoppingCompareError({ message }: { message: string }) {
  const workerIssue =
    /worker unreachable|connection attempts failed|ECONNREFUSED|Failed to fetch/i.test(message)
  if (!workerIssue) {
    return <p className="text-error text-sm mt-2">{message}</p>
  }
  return (
    <div
      data-testid="shop-compare-worker-error"
      className="mt-3 rounded-lg border border-error/40 bg-error-container/20 p-4 text-sm space-y-2 text-on-surface"
    >
      <p className="font-semibold text-error">Worker service is not reachable</p>
      <p className="text-on-surface-variant">
        <strong className="text-on-surface">Shop smarter</strong> calls the API, which calls the{' '}
        <strong className="text-on-surface">worker</strong> on port <code className="text-xs">8001</code> to fetch retailer
        pages. That service is not running or not reachable from the API.
      </p>
      <p className="text-on-surface-variant text-xs">From the repo:</p>
      <pre className="text-xs bg-surface-container-high p-3 rounded overflow-x-auto text-on-surface">
        cd zenith-rewards{'\n'}
        docker compose up -d worker-api
      </pre>
      <p className="text-on-surface-variant text-xs">
        Prefer the full stack: <code className="text-xs">docker compose up --build</code> — the API is configured to
        start after <code className="text-xs">worker-api</code>.
      </p>
      <p className="text-on-surface-variant text-xs">
        If the API runs on your machine (not Docker), set <code className="text-xs">WORKER_URL=http://127.0.0.1:8001</code>{' '}
        and run <code className="text-xs">uvicorn main:app --port 8001</code> in <code className="text-xs">apps/worker</code>.
      </p>
    </div>
  )
}

export function ShopCompare() {
  const [query, setQuery] = useState('')
  /** Last query the user actually submitted — results only show when it still matches the input. */
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ShoppingCompareResponse | null>(null)
  const [retailerRows, setRetailerRows] = useState<(RetailerCompareRow & { isFetching?: boolean })[]>([])
  
  const activeQueryRef = useRef<string | null>(null)

  useEffect(() => {
    setLastSubmitted(null)
    setError(null)
    setIsPending(false)
    setData(null)
    setRetailerRows([])
    activeQueryRef.current = null
  }, [])

  const draft = query.trim()
  const errorMessage = error
  const issuers = data?.user_rewards_context?.detected_issuers ?? []
  const pointsPerDollar = issuers.includes('chase') || issuers.includes('discover') ? 1.5 : 1.0

  const metrics = useMemo(() => {
    const lows = retailerRows
      .map((r) => r.indicative_low_usd)
      .filter((n): n is number => n != null)
    if (!lows.length) {
      return { best: null as number | null, worst: null as number | null }
    }
    return { best: Math.min(...lows), worst: Math.max(...lows) }
  }, [retailerRows])

  const scrapeHealth = useMemo(() => {
    const withPrice = retailerRows.filter((r) => r.indicative_low_usd != null).length
    const hardBlocked = retailerRows.filter(
      (r) => (r.status_code ?? 0) >= 400 || r.status_code === 503,
    ).length
    return { withPrice, hardBlocked, total: retailerRows.length }
  }, [retailerRows])

  const runCompare = () => {
    const q = query.trim()
    if (q.length < 2) return

    activeQueryRef.current = q
    setLastSubmitted(q)
    setIsPending(true)
    setError(null)
    setData(null)

    const initialRows: (RetailerCompareRow & { isFetching?: boolean })[] = [
      {
        retailer_id: 'amazon',
        label: 'Amazon',
        search_url: `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
        fetched_url: null,
        status_code: null,
        ok: false,
        title: null,
        excerpt: null,
        price_candidates_usd: [],
        indicative_low_usd: null,
        indicative_high_usd: null,
        error: null,
        likely_blocked: false,
        isFetching: true,
      },
      {
        retailer_id: 'bestbuy',
        label: 'Best Buy',
        search_url: `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(q)}`,
        fetched_url: null,
        status_code: null,
        ok: false,
        title: null,
        excerpt: null,
        price_candidates_usd: [],
        indicative_low_usd: null,
        indicative_high_usd: null,
        error: null,
        likely_blocked: false,
        isFetching: true,
      },
      {
        retailer_id: 'walmart',
        label: 'Walmart',
        search_url: `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
        fetched_url: null,
        status_code: null,
        ok: false,
        title: null,
        excerpt: null,
        price_candidates_usd: [],
        indicative_low_usd: null,
        indicative_high_usd: null,
        error: null,
        likely_blocked: false,
        isFetching: true,
      },
      {
        retailer_id: 'ebay',
        label: 'eBay',
        search_url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`,
        fetched_url: null,
        status_code: null,
        ok: false,
        title: null,
        excerpt: null,
        price_candidates_usd: [],
        indicative_low_usd: null,
        indicative_high_usd: null,
        error: null,
        likely_blocked: false,
        isFetching: true,
      },
      {
        retailer_id: 'target',
        label: 'Target',
        search_url: `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
        fetched_url: null,
        status_code: null,
        ok: false,
        title: null,
        excerpt: null,
        price_candidates_usd: [],
        indicative_low_usd: null,
        indicative_high_usd: null,
        error: null,
        likely_blocked: false,
        isFetching: true,
      },
    ]
    setRetailerRows(initialRows)

    postShoppingCompareStream(
      q,
      (event) => {
        if (activeQueryRef.current !== q) return

        if (event.type === 'retailer') {
          setRetailerRows((prev) =>
            prev.map((row) =>
              row.retailer_id === event.data.retailer_id
                ? { ...row, ...event.data, isFetching: false }
                : row
            )
          )
        } else if (event.type === 'summary') {
          setData(event.data)
          setIsPending(false)
          setRetailerRows((prev) => {
            const summaryRetailers = event.data.retailers || []
            return prev.map((row) => {
              const matched = summaryRetailers.find((sr: any) => sr.retailer_id === row.retailer_id)
              if (matched) {
                return { ...row, ...matched, isFetching: false }
              }
              return { ...row, isFetching: false }
            })
          })
        } else if (event.type === 'error') {
          setError(event.data?.detail || event.data?.error || 'Stream error')
          setIsPending(false)
          setRetailerRows((prev) => prev.map((r) => ({ ...r, isFetching: false })))
        }
      },
      (err) => {
        if (activeQueryRef.current !== q) return
        setError(humanizeMutationError(err))
        setIsPending(false)
        setRetailerRows((prev) => prev.map((r) => ({ ...r, isFetching: false })))
      }
    )
  }

  return (
    <ApiStatus loading={false} error={null}>
      <div className="flex-1 p-4 md:p-margin max-w-content mx-auto w-full pb-10 space-y-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Shop smarter</h1>
          <p className="font-body-md text-on-surface-variant max-w-3xl">
            Compare Amazon, Best Buy, Walmart, eBay, and Target. We only fetch prices{' '}
            <strong className="text-on-surface">after you tap Compare</strong>—via Google Shopping through FinCrawler
            (with direct retailer fallback when FinCrawler is unavailable).
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <h2 className="font-headline-md text-primary mb-2 flex items-center gap-2">
            <MaterialIcon name="shopping_cart" size={24} />
            Product search
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runCompare()
              }}
              data-testid="shop-compare-query"
              aria-label="Product or category to compare"
              className="flex-1 px-4 py-2 rounded-sm border border-outline-variant bg-surface font-body-md text-on-surface outline-none focus:border-tertiary-container focus:ring-1 focus:ring-tertiary-container"
              placeholder="e.g. dji osmo pocket 3"
            />
            <button
              type="button"
              data-testid="shop-compare-submit"
              disabled={isPending || query.trim().length < 2}
              onClick={runCompare}
              className="px-4 py-2 bg-secondary text-on-secondary rounded-sm font-semibold text-sm hover:bg-secondary-container hover:text-on-secondary-container transition-colors disabled:opacity-50"
            >
              {isPending ? 'Fetching retailers…' : 'Compare retailers'}
            </button>
          </div>
          {errorMessage && <ShoppingCompareError message={errorMessage} />}
          {!lastSubmitted && !isPending && (
            <p className="text-sm text-on-surface-variant mt-4">
              Results appear here after you search — nothing is fetched until you tap Compare (or press Enter).
            </p>
          )}
        </div>

        {isPending && retailerRows.length === 0 && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center text-on-surface-variant text-sm">
            Fetching retailer pages for “{draft}”…
          </div>
        )}

        {lastSubmitted && retailerRows.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <p className="text-xs text-on-surface-variant">Best observed price</p>
                <p className="text-2xl font-semibold text-primary">{formatUsd(metrics.best)}</p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <p className="text-xs text-on-surface-variant">Spread (worst-best)</p>
                <p className="text-2xl font-semibold text-primary">
                  {metrics.best != null && metrics.worst != null ? formatUsd(metrics.worst - metrics.best) : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <p className="text-xs text-on-surface-variant">Point estimate basis</p>
                <p className="text-2xl font-semibold text-primary">{pointsPerDollar.toFixed(1)}x</p>
              </div>
            </div>

            {isPending && (
              <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden relative">
                <div className="bg-primary h-full rounded-full animate-pulse w-2/3"></div>
              </div>
            )}

            {scrapeHealth.total > 0 && !isPending && scrapeHealth.withPrice < Math.max(2, scrapeHealth.total * 0.4) && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-on-surface">
                <MaterialIcon name="shield_lock" className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" size={22} />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">Some stores had no Google Shopping price</p>
                  <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
                    {scrapeHealth.hardBlocked} store(s) returned blocked/denied pages or no listing in Google Shopping.
                    Tap <strong className="text-on-surface">Open</strong> for each site to see the live shelf price. Rewards
                    tiles below still summarize how to maximize points.
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="bg-surface-container-high text-on-surface font-semibold">
                  <tr>
                    <th className="px-4 py-3">Retailer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Savings</th>
                    <th className="px-4 py-3">Est. points</th>
                    <th className="px-4 py-3">Search</th>
                  </tr>
                </thead>
                <tbody>
                  {retailerRows.map((row) => (
                    <tr
                      key={row.retailer_id}
                      data-testid={`shop-retailer-row-${row.retailer_id}`}
                      className="border-t border-outline-variant bg-surface-container-lowest"
                    >
                      <td className="px-4 py-3 font-semibold text-on-surface">{row.label}</td>
                      <td className="px-4 py-3 text-on-surface">
                        <span
                          className={
                            row.isFetching
                              ? 'inline-flex rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-semibold animate-pulse'
                              : row.ok
                              ? 'inline-flex rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-semibold'
                              : 'inline-flex rounded-full bg-slate-200 text-slate-700 px-2 py-1 text-xs font-semibold'
                          }
                        >
                          {statusLabel(row)}
                        </span>
                        {showTierDebug && !row.isFetching && (row.likely_blocked || !row.ok) && tierDebugLabel(row) && (
                          <span
                            data-testid={`shop-tier-debug-${row.retailer_id}`}
                            className="mt-1 block text-[10px] text-on-surface-variant font-mono"
                          >
                            {tierDebugLabel(row)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-on-surface font-semibold">
                        {row.isFetching ? (
                          <span className="text-on-surface-variant/40 animate-pulse">Scanning...</span>
                        ) : row.indicative_low_usd != null ? (
                          formatUsd(row.indicative_low_usd)
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {row.isFetching ? (
                          '—'
                        ) : row.indicative_low_usd != null && metrics.worst != null && metrics.worst > 0
                          ? `${Math.max(0, ((metrics.worst - row.indicative_low_usd) / metrics.worst) * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {row.isFetching ? (
                          '—'
                        ) : row.indicative_low_usd != null ? (
                          `${Math.round(row.indicative_low_usd * pointsPerDollar)} pts`
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={row.search_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary font-semibold hover:underline"
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data && (
              <section
                data-testid="shop-rewards-wallet"
                className="rounded-2xl border border-outline-variant bg-surface-container-lowest/80 p-5 md:p-6 space-y-5"
              >
                <div className="flex items-center gap-2">
                  <MaterialIcon name="workspace_premium" className="text-primary" size={26} />
                  <div>
                    <h2 className="font-headline-md text-primary leading-tight">Rewards quick view</h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Tiles from your portfolio—tap a store row above for live pricing.
                    </p>
                  </div>
                </div>

                {data.user_rewards_context && data.user_rewards_context.cards_summary.length > 0 && (
                  <div>
                    <p className="text-label-caps text-on-surface-variant mb-2 text-[10px] tracking-wider font-semibold">
                      Your cards
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.user_rewards_context.cards_summary.map((c) => {
                        const t = issuerTileTheme(c.issuer ?? '')
                        return (
                          <div
                            key={`${c.card_name}-${c.issuer}`}
                            className={`rounded-2xl ${t.bg} ring-1 ${t.ring} p-4 flex gap-3 items-start shadow-sm`}
                          >
                            <div className="rounded-xl bg-surface-container-high p-2 text-primary">
                              <MaterialIcon name={t.icon} size={22} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-on-surface text-sm leading-snug truncate" title={c.card_name ?? ''}>
                                {c.card_name}
                              </p>
                              <p className="text-xs text-on-surface-variant mt-0.5">{c.issuer}</p>
                              <p className="text-[11px] text-primary font-semibold mt-2">~{pointsPerDollar.toFixed(1)}× est. on spend</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {data.user_rewards_context && data.user_rewards_context.issuer_highlights.length > 0 && (
                  <div>
                    <p className="text-label-caps text-on-surface-variant mb-2 text-[10px] tracking-wider font-semibold">
                      Issuer playbooks
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.user_rewards_context.issuer_highlights.map((h) => {
                        const t = issuerTileTheme(h.issuer)
                        return (
                          <div
                            key={`${h.issuer}-${h.program}`}
                            className={`rounded-2xl ${t.bg} ring-1 ${t.ring} p-4 flex flex-col gap-2 shadow-sm`}
                          >
                            <div className="flex items-center gap-2">
                              <MaterialIcon name={t.icon} size={20} className="text-primary" />
                              <span className="font-semibold text-on-surface text-sm">{h.issuer}</span>
                              <span className="text-xs text-on-surface-variant truncate">{h.program}</span>
                            </div>
                            <p className="text-xs text-on-surface-variant leading-relaxed">{shortLine(h.action, 140)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {data.user_rewards_context && data.user_rewards_context.personalized_tips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.user_rewards_context.personalized_tips.slice(0, 3).map((tip) => (
                      <span
                        key={tip}
                        className="inline-flex items-center rounded-full border border-outline-variant bg-surface-container-high px-3 py-1.5 text-[11px] text-on-surface-variant max-w-full"
                        title={tip}
                      >
                        <MaterialIcon name="bolt" size={14} className="mr-1.5 text-amber-600 shrink-0" />
                        <span className="truncate">{shortLine(tip, 100)}</span>
                      </span>
                    ))}
                  </div>
                )}

                {data.rewards_by_retailer && data.rewards_by_retailer.length > 0 && (
                  <div>
                    <p className="text-label-caps text-on-surface-variant mb-2 text-[10px] tracking-wider font-semibold">
                      By store
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {data.rewards_by_retailer.map((rr) => (
                        <div
                          key={rr.retailer_id}
                          data-testid={`shop-rewards-retailer-${rr.retailer_id}`}
                          className="rounded-xl border border-outline-variant bg-surface p-3 flex flex-col gap-1 min-h-[88px]"
                        >
                          <p className="text-xs font-bold text-on-surface truncate">{rr.label ?? rr.retailer_id}</p>
                          <p className="text-[10px] text-on-surface-variant leading-snug line-clamp-3">
                            {shortLine(rr.portal_angle ?? rr.category_angle ?? '—', 96)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.rewards_disclaimer && (
                  <p className="text-[10px] text-on-surface-variant border-t border-outline-variant pt-3">{data.rewards_disclaimer}</p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </ApiStatus>
  )
}
