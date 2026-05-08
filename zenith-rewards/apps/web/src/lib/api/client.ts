import { API_BASE, WORKER_BASE } from '../env'
import type {
  ActivityRow,
  ActivityStats,
  CrawlResult,
  MonthPoint,
  PortfolioSummary,
  Recommendation,
  ShoppingCompareResponse,
} from './types'

async function parseJson<T>(r: Response): Promise<T> {
  const text = await r.text()
  if (!r.ok) {
    throw new Error(text || `${r.status} ${r.statusText}`)
  }
  return JSON.parse(text) as T
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const r = await fetch(`${API_BASE}/api/v1/portfolio/summary`)
  return parseJson(r)
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const r = await fetch(`${API_BASE}/api/v1/recommendations`)
  return parseJson(r)
}

export async function getActivity(limit = 100): Promise<ActivityRow[]> {
  const r = await fetch(`${API_BASE}/api/v1/activity?limit=${limit}`)
  return parseJson(r)
}

export async function getActivityStats(): Promise<ActivityStats> {
  const r = await fetch(`${API_BASE}/api/v1/activity/stats`)
  return parseJson(r)
}

export async function getPointsByMonth(months = 12): Promise<MonthPoint[]> {
  const r = await fetch(`${API_BASE}/api/v1/insights/points-by-month?months=${months}`)
  return parseJson(r)
}

export async function postCrawlSnapshot(body: {
  url: string
  title: string
  excerpt?: string | null
}): Promise<{ status: string }> {
  const r = await fetch(`${API_BASE}/api/v1/integrations/crawl-snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseJson(r)
}

export async function workerCrawl(url: string): Promise<CrawlResult> {
  const r = await fetch(`${WORKER_BASE}/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  return parseJson(r)
}

export async function postShoppingCompare(query: string): Promise<ShoppingCompareResponse> {
  const r = await fetch(`${API_BASE}/api/v1/shopping/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  return parseJson(r)
}
