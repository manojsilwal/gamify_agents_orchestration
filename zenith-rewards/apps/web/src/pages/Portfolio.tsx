import { MaterialIcon } from '../components/MaterialIcon'
import { ApiStatus } from '../components/ApiStatus'
import { usePortfolioSummary } from '../hooks/useZenithQueries'
import { formatPoints, formatUsd } from '../lib/format'

export function Portfolio() {
  const q = usePortfolioSummary()
  const p = q.data

  return (
    <ApiStatus loading={q.isLoading} error={(q.error as Error) ?? null}>
      <div className="flex-1 p-4 md:p-margin max-w-content mx-auto w-full pb-10">
        <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Portfolio</h1>
        <p className="font-body-md text-on-surface-variant mb-8 max-w-2xl">
          Data from <code className="text-xs bg-surface-container px-1 rounded">GET /api/v1/portfolio/summary</code> — cards
          and loyalty balances for the demo user.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-8">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_24px_-4px_rgba(33,49,69,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <MaterialIcon name="credit_card" size={28} />
              </div>
              <div>
                <h2 className="font-headline-md text-primary">Cards ({p?.cards.length ?? 0})</h2>
                <p className="font-body-sm text-on-surface-variant">user_cards</p>
              </div>
            </div>
            <ul className="space-y-3">
              {(p?.cards ?? []).map((c) => (
                <li key={c.id} className="flex justify-between gap-4 border-b border-surface-container-high pb-2">
                  <div>
                    <p className="font-medium text-on-surface">{c.card_name}</p>
                    <p className="font-body-sm text-on-surface-variant">{c.issuer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-data-mono text-primary">{formatPoints(c.current_points)} pts</p>
                    <p className="font-body-sm text-on-surface-variant">{formatUsd(c.estimated_value_usd)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_24px_-4px_rgba(33,49,69,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary">
                <MaterialIcon name="savings" size={28} />
              </div>
              <div>
                <h2 className="font-headline-md text-primary">Loyalty ({p?.loyalty_accounts.length ?? 0})</h2>
                <p className="font-body-sm text-on-surface-variant">loyalty_accounts + cpp</p>
              </div>
            </div>
            <ul className="space-y-3">
              {(p?.loyalty_accounts ?? []).map((a) => (
                <li key={a.id} className="flex justify-between gap-4 border-b border-surface-container-high pb-2">
                  <div>
                    <p className="font-medium text-on-surface">{a.program_name}</p>
                    <p className="font-body-sm text-on-surface-variant">
                      {a.program_type} · {a.cpp_default} cpp
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-data-mono text-primary">
                      {formatPoints(a.balance)} {a.unit}
                    </p>
                    <p className="font-body-sm text-on-surface-variant">{formatUsd(a.estimated_value_usd)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {!!p?.stale_accounts?.length && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">Needs sync</p>
            <p className="font-body-sm text-on-surface">{p.stale_accounts.join(', ')}</p>
          </div>
        )}
      </div>
    </ApiStatus>
  )
}
