export type LoyaltyAccount = {
  id: string
  program_name: string
  program_type: string
  balance: number
  unit: string
  cpp_default: number
  estimated_value_usd: number
}

export type UserCard = {
  id: string
  card_name: string
  issuer: string
  annual_fee: number
  current_points: number
  estimated_value_usd: number
}

export type CategorySlice = { label: string; pct: number }

export type PortfolioSummary = {
  total_points_equivalent_usd: number
  total_points_display: number
  average_cpp: number
  cards_count: number
  loyalty_accounts_count: number
  stale_accounts: string[]
  monthly_spend_total: number
  next_setup_step: string
  cards: UserCard[]
  loyalty_accounts: LoyaltyAccount[]
  category_breakdown: CategorySlice[]
}

export type Recommendation = {
  id: string
  type: string
  title: string
  summary: string
  bank_program: string
  transfer_partner: string
  bonus_percentage: number
  end_date: string | null
}

export type ActivityRow = {
  id: string
  occurred_at: string | null
  event_type: string
  merchant_label: string
  description: string | null
  category: string | null
  amount_usd: number | null
  points_delta: number | null
  source: string
}

export type ActivityStats = {
  points_earned: number
  points_redeemed: number
  net_points: number
  period_label: string
}

export type MonthPoint = { month: string; net_points: number }

export type CrawlResult = {
  url: string
  status_code: number
  title: string
  excerpt: string | null
  content_type: string | null
}

export type ShoppingProduct = {
  title: string
  price_usd: number
  list_price_usd?: number | null
  discount_pct?: number | null
  url?: string | null
}

export type RetailerCompareRow = {
  retailer_id: string
  label: string
  search_url: string
  fetched_url: string | null
  status_code: number | null
  ok: boolean
  title: string | null
  excerpt: string | null
  price_candidates_usd: number[]
  indicative_low_usd: number | null
  indicative_high_usd: number | null
  error: string | null
  likely_blocked: boolean
  /** Present when compare used FinCrawler (Google Shopping or retailer crawl). */
  fetch_source?: 'http' | 'fincrawler' | 'http+fincrawler' | 'fincrawler_v2' | 'google_shopping'
  fincrawler_attempted?: boolean
  fincrawler_error?: string | null
  /** Tier observability from FinCrawler contract (docs/fincrawler-contract.md). */
  fetch_tier?: number | null
  tier_name?: string | null
  detection_hits?: string[] | null
  session_id?: string | null
  products?: ShoppingProduct[]
}

export type RetailerRewardHints = {
  retailer_id: string
  label: string | null | undefined
  portal_angle: string | undefined
  pay_with_points: string | undefined
  category_angle: string | undefined
  issuer_hooks: string[]
}

export type IssuerHighlight = {
  issuer: string
  program: string
  action: string
}

export type UserRewardsContext = {
  cards_summary: { card_name: string | null | undefined; issuer: string | null | undefined }[]
  detected_issuers: string[]
  personalized_tips: string[]
  issuer_highlights: IssuerHighlight[]
}

export type ShoppingCompareResponse = {
  query: string
  retailers: RetailerCompareRow[]
  ranked_by_lowest_indicative: { retailer_id: string; label: string; indicative_low_usd: number }[]
  tips: string[]
  disclaimer: string
  stacking_notes?: string[]
  rewards_by_retailer?: RetailerRewardHints[]
  user_rewards_context?: UserRewardsContext
  rewards_disclaimer?: string
}
