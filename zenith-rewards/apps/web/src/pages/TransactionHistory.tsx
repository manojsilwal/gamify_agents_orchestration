import { MaterialIcon } from '../components/MaterialIcon'
import { ApiStatus } from '../components/ApiStatus'
import { useActivity, useActivityStats } from '../hooks/useZenithQueries'
import { formatPoints, formatShortDate } from '../lib/format'
import type { ActivityRow } from '../lib/api/types'

function TypeBadge({ eventType }: { eventType: string }) {
  const t = eventType.toLowerCase()
  const earn = t === 'earn' || t === 'crawl'
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-sm font-label-caps text-label-caps ${
        earn ? 'bg-[#D1FAE5] text-[#065F46]' : t === 'redeem' ? 'bg-surface-container text-on-surface-variant' : 'bg-surface-container text-on-surface-variant'
      }`}
    >
      {t === 'crawl' ? 'Crawl' : eventType}
    </span>
  )
}

function Row({ r }: { r: ActivityRow }) {
  const pts = r.points_delta
  return (
    <tr className="hover:bg-surface/50 transition-colors">
      <td className="p-4 text-on-surface-variant whitespace-nowrap">{formatShortDate(r.occurred_at)}</td>
      <td className="p-4 text-on-surface font-semibold">{r.merchant_label}</td>
      <td className="p-4 text-on-surface">{r.description ?? '—'}</td>
      <td className="p-4">
        <TypeBadge eventType={r.event_type} />
      </td>
      <td
        className={`p-4 text-right font-data-mono font-semibold ${
          pts != null && pts > 0 ? 'text-secondary' : 'text-on-surface'
        }`}
      >
        {pts != null ? `${pts > 0 ? '+' : ''}${formatPoints(pts)}` : '—'}
      </td>
    </tr>
  )
}

export function TransactionHistory() {
  const activity = useActivity(200)
  const stats = useActivityStats()
  const err = (activity.error ?? stats.error) as Error | null
  const loading = activity.isLoading || stats.isLoading
  const rows = activity.data ?? []
  const s = stats.data

  return (
    <ApiStatus loading={loading} error={err}>
      <div className="flex-1 p-4 md:p-margin max-w-content mx-auto w-full flex flex-col gap-6 pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Transaction History</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              API-backed ledger plus optional worker crawl audit rows (<code className="text-xs">source</code>).
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              data-testid="history-refresh"
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-sm text-on-surface hover:bg-surface-container-low transition-colors font-body-sm text-body-sm"
              onClick={() => activity.refetch()}
            >
              <MaterialIcon name="refresh" size={18} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant p-8 rounded-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
              <MaterialIcon name="arrow_upward" size={20} />
              <span className="font-label-caps text-label-caps uppercase tracking-wider">Points Earned</span>
            </div>
            <div className="font-headline-xl text-headline-xl text-primary">
              +{formatPoints(s?.points_earned ?? 0)}
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-8 rounded-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
              <MaterialIcon name="arrow_downward" size={20} />
              <span className="font-label-caps text-label-caps uppercase tracking-wider">Points Redeemed</span>
            </div>
            <div className="font-headline-xl text-headline-xl text-primary">
              -{formatPoints(s?.points_redeemed ?? 0)}
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-8 rounded-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-variant/20" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                <MaterialIcon name="account_balance" size={20} />
                <span className="font-label-caps text-label-caps uppercase tracking-wider">Net (ledger)</span>
              </div>
              <div className="font-headline-xl text-headline-xl text-secondary">
                {s && s.net_points >= 0 ? '+' : ''}
                {formatPoints(s?.net_points ?? 0)}
              </div>
              <div className="text-on-surface-variant text-sm mt-2 font-body-sm">{s?.period_label ?? ''}</div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container-high bg-surface/50">
                  <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                    Date
                  </th>
                  <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                    Description
                  </th>
                  <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                    Type
                  </th>
                  <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-right">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md divide-y divide-surface-container-high">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                      No rows. Run migrations + seed, or record a crawl from Optimization.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => <Row key={r.id} r={r} />)
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-surface-container-high p-4 flex items-center justify-between">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {rows.length} entr{rows.length === 1 ? 'y' : 'ies'} loaded
            </span>
          </div>
        </div>
      </div>
    </ApiStatus>
  )
}
