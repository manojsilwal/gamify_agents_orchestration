import { Link } from 'react-router-dom'
import { MaterialIcon } from '../components/MaterialIcon'
import { ApiStatus } from '../components/ApiStatus'
import { useActivity, usePointsByMonth, usePortfolioSummary, useRecommendations } from '../hooks/useZenithQueries'
import { formatPoints, formatShortDate, formatUsd } from '../lib/format'
import type { ActivityRow } from '../lib/api/types'

function categoryIcon(label: string): string {
  const m: Record<string, string> = {
    Travel: 'flight_takeoff',
    Dining: 'restaurant',
    Groceries: 'shopping_cart',
    Rent: 'home',
    Gas: 'local_gas_station',
    Other: 'category',
    Shopping: 'shopping_bag',
  }
  return m[label] ?? 'pie_chart'
}

function growthBadge(monthly: { month: string; net_points: number }[] | undefined) {
  if (!monthly || monthly.length < 2) return '+0% YTD'
  const first = monthly[0]?.net_points ?? 0
  const last = monthly[monthly.length - 1]?.net_points ?? 0
  if (first === 0) return last > 0 ? '+100% YTD' : '+0% YTD'
  const pct = Math.round(((last - first) / Math.abs(first || 1)) * 1000) / 10
  return `${pct >= 0 ? '+' : ''}${pct}% YTD`
}

function ActivityTableRows({ rows }: { rows: ActivityRow[] }) {
  return (
    <>
      {rows.slice(0, 5).map((row) => (
        <tr
          key={row.id}
          className="border-b border-surface-container border-dashed hover:bg-surface-container-low/50 transition-colors"
        >
          <td className="py-3 px-2 text-on-surface-variant font-data-mono">{formatShortDate(row.occurred_at)}</td>
          <td className="py-3 px-2 font-medium text-primary">
            <span className="inline-flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-surface-container-high text-primary flex items-center justify-center shrink-0 text-[10px] uppercase">
                {row.source === 'crawler' ? 'W' : row.merchant_label.slice(0, 1)}
              </span>
              {row.merchant_label}
            </span>
          </td>
          <td className="py-3 px-2 text-on-surface-variant">{row.category ?? row.event_type}</td>
          <td className="py-3 px-2 text-right font-data-mono text-primary">
            {row.amount_usd != null ? formatUsd(row.amount_usd) : '—'}
          </td>
          <td className="py-3 px-2 text-right">
            {row.points_delta != null ? (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-data-mono text-[12px] font-bold ${
                  row.points_delta > 0 ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-surface-container text-on-surface'
                }`}
              >
                {row.points_delta > 0 ? '+' : ''}
                {formatPoints(row.points_delta)}
              </span>
            ) : (
              '—'
            )}
          </td>
        </tr>
      ))}
    </>
  )
}

export function Dashboard() {
  const portfolio = usePortfolioSummary()
  const recommendations = useRecommendations()
  const activity = useActivity(25)
  const pointsMonth = usePointsByMonth(8)

  const err = (portfolio.error ?? recommendations.error ?? activity.error ?? pointsMonth.error) as Error | null
  const loading = portfolio.isLoading || recommendations.isLoading || activity.isLoading || pointsMonth.isLoading

  const p = portfolio.data
  const top = recommendations.data?.[0]
  const act = activity.data ?? []
  const pm = pointsMonth.data ?? []
  const categories = p?.category_breakdown?.length ? p.category_breakdown : [{ label: 'Travel', pct: 65 }]

  const maxBar = Math.max(...pm.map((x) => Math.abs(x.net_points)), 1)

  return (
    <ApiStatus loading={loading} error={err}>
      <div className="p-4 md:p-margin lg:p-8 max-w-content mx-auto w-full pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col justify-between shadow-[0_4px_24px_-4px_rgba(33,49,69,0.04)]">
            <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
              <div>
                <h2 className="font-body-md text-body-md text-on-surface-variant mb-1">Total Liquid Value</h2>
                <div className="flex items-baseline gap-3">
                  <span className="font-headline-xl text-headline-xl text-primary tracking-tight">
                    {p ? formatPoints(p.total_points_display) : '—'}
                  </span>
                  <span className="font-body-lg text-body-lg text-on-surface-variant font-medium">pts</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 bg-secondary-container/30 px-3 py-1 rounded-full border border-secondary-container">
                  <MaterialIcon name="trending_up" size={16} className="text-secondary" />
                  <span className="font-data-mono text-data-mono text-secondary">{growthBadge(pm)}</span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-2 text-right">
                  Estimated Cash Equivalent: <br />
                  <strong className="text-primary font-semibold">
                    {p ? formatUsd(p.total_points_equivalent_usd) : '—'}
                  </strong>
                </span>
              </div>
            </div>
            <div className="h-16 w-full flex items-end gap-1 mt-auto">
              {categories.slice(0, 7).map((c, i) => (
                <div
                  key={c.label}
                  className={`flex-1 rounded-t-sm transition-colors hover:bg-secondary/20 ${
                    i === categories.length - 1 ? 'bg-secondary shadow-[0_0_12px_rgba(0,108,73,0.3)]' : 'bg-surface-container-high'
                  }`}
                  style={{ height: `${Math.max(12, c.pct)}%` }}
                  title={`${c.label}: ${c.pct}%`}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-tertiary-container text-on-tertiary-container rounded-xl p-6 flex flex-col relative overflow-hidden border border-primary-fixed">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary-fixed-dim/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-4 relative">
              <MaterialIcon name="lightbulb" className="text-secondary-fixed" />
              <span className="font-label-caps text-label-caps text-secondary-fixed">Top Opportunity</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-surface-container-lowest mb-2 leading-tight relative">
              {top?.title ?? 'Optimization'}
            </h3>
            <p className="font-body-sm text-body-sm text-primary-fixed mb-6 flex-1 relative">
              {top?.summary ?? 'Connect the API and seed transfer bonuses to see live opportunities.'}
            </p>
            {top && (
              <div className="bg-surface-container-lowest/10 rounded-lg p-3 mb-6 backdrop-blur-sm border border-surface-container-lowest/20 relative">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-body-sm text-body-sm text-primary-fixed">Bonus</span>
                  <span className="font-data-mono text-data-mono text-secondary-fixed">
                    +{top.bonus_percentage}% → {top.transfer_partner}
                  </span>
                </div>
                <div className="w-full bg-surface-container-lowest/20 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-secondary-fixed h-full rounded-full"
                    style={{ width: `${Math.min(100, top.bonus_percentage + 40)}%` }}
                  />
                </div>
                {top.end_date && (
                  <p className="font-body-sm text-primary-fixed/80 mt-2">Ends {formatShortDate(top.end_date)}</p>
                )}
              </div>
            )}
            <button
              type="button"
              data-testid="dashboard-execute-transfer"
              className="relative w-full bg-secondary-fixed text-on-secondary-fixed font-body-md font-semibold py-2.5 rounded-sm hover:bg-secondary-container transition-colors"
            >
              Execute Transfer
            </button>
          </div>

          <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col h-full shadow-[0_4px_24px_-4px_rgba(33,49,69,0.02)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-md text-body-lg font-semibold text-primary">Category Allocation</h3>
              <span className="font-body-sm text-on-surface-variant">Spend-based</span>
            </div>
            <div className="flex flex-col gap-6 flex-1 justify-center">
              {categories.slice(0, 4).map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                        <MaterialIcon name={categoryIcon(row.label)} size={16} />
                      </div>
                      <span className="font-body-sm text-body-sm font-medium text-primary">{row.label}</span>
                    </div>
                    <span className="font-data-mono text-data-mono text-on-surface-variant">{row.pct}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full opacity-90"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col h-full shadow-[0_4px_24px_-4px_rgba(33,49,69,0.02)]">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
              <h3 className="font-headline-md text-body-lg font-semibold text-primary">Point Growth Velocity</h3>
              <span className="font-body-sm text-on-surface-variant">Net points by month (activity)</span>
            </div>
            <div className="flex-1 relative min-h-[200px] flex items-end pt-4">
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-on-surface-variant font-data-mono pb-6 pr-4 border-r border-surface-container-high w-12 text-right">
                <span>{formatPoints(maxBar)}</span>
                <span>{formatPoints(Math.round(maxBar / 2))}</span>
                <span>0</span>
              </div>
              <div className="absolute left-12 right-0 top-4 bottom-10 flex items-end gap-1 z-10 px-2">
                {pm.length === 0 ? (
                  <span className="font-body-sm text-on-surface-variant">No monthly activity yet — seed the database.</span>
                ) : (
                  pm.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-secondary/80 rounded-t-sm min-h-[4px] transition-all"
                        style={{ height: `${(Math.abs(m.net_points) / maxBar) * 100}%` }}
                        title={`${m.month}: ${m.net_points}`}
                      />
                      <span className="text-[9px] text-on-surface-variant font-data-mono truncate max-w-[3rem]">
                        {m.month.slice(0, 7)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-[0_4px_24px_-4px_rgba(33,49,69,0.02)] overflow-x-auto">
            <div className="flex justify-between items-center mb-4 min-w-[600px]">
              <h3 className="font-headline-md text-body-lg font-semibold text-primary">Recent Transaction Stream</h3>
              <Link
                to="/history"
                className="font-body-sm text-body-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                View All <MaterialIcon name="arrow_forward" size={16} />
              </Link>
            </div>
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-surface-container-high">
                  {['DATE', 'MERCHANT / SOURCE', 'CATEGORY', 'AMOUNT', 'REWARD YIELD'].map((h) => (
                    <th
                      key={h}
                      className={`py-3 px-2 font-label-caps text-label-caps text-on-surface-variant font-semibold ${
                        h.includes('AMOUNT') || h.includes('YIELD') ? 'text-right' : ''
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm">
                {act.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-on-surface-variant">
                      No activity rows yet.
                    </td>
                  </tr>
                ) : (
                  <ActivityTableRows rows={act} />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ApiStatus>
  )
}
