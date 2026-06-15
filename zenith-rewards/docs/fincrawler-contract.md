# FinCrawler Tiered Crawl API Contract

The canonical contract lives in the **FinCrawler service repo** at `CONTRACT.md` (sibling project: `../fincrawler/CONTRACT.md` from this monorepo layout).

Zenith Rewards (`apps/worker/fincrawler_client.py`) sends tier hints defined there. The crawler engine is implemented in the FinCrawler repo:

- `tier_router.py`
- `fetchers/tier1_curl_cffi.py` … `tier4_managed.py`
- `behavior/human_sim.py`
- `session/store.py`
- `profiles/retailers.json`

This file is a pointer for Zenith developers. Do not duplicate the full spec here — update `fincrawler/CONTRACT.md` when the API changes.
