# FinCrawler contract (Zenith worker)

Canonical contract: sibling repo `fincrawler/CONTRACT.md`.

## Hybrid tiers

- Tier 1 `compliant` — honest HTTP
- Tier 4 `bank_grade` — Scrapfly / managed proxy on bot wall

## Zenith integration

- Primary: `POST /shop/search` (no Google Shopping parallel call)
- Fallback crawl: `POST /crawl` with `retailer_key`
- `POST /shop/google` returns 410 Gone

## Client options

`retailer_tier_profiles.py` sends `tier: 1`, `max_tier: 4`, `escalate_on_block: true`.
