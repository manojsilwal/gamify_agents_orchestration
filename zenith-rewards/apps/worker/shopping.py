"""Multi-retailer search snapshot: real HTTP fetches, heuristic USD price hints."""

from __future__ import annotations

import re
from collections.abc import Callable
from urllib.parse import quote_plus

import httpx

BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

# Public search URLs only (no checkout). Fifth retailer: Target (general merchandise).
RETAILERS: list[tuple[str, str, Callable[[str], str]]] = [
    ("amazon", "Amazon", lambda q: f"https://www.amazon.com/s?k={quote_plus(q)}"),
    ("bestbuy", "Best Buy", lambda q: f"https://www.bestbuy.com/site/searchpage.jsp?st={quote_plus(q)}"),
    ("walmart", "Walmart", lambda q: f"https://www.walmart.com/search?q={quote_plus(q)}"),
    ("ebay", "eBay", lambda q: f"https://www.ebay.com/sch/i.html?_nkw={quote_plus(q)}"),
    ("target", "Target", lambda q: f"https://www.target.com/s?searchTerm={quote_plus(q)}"),
]


def _strip_html_scripts(html: str) -> str:
    html = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", html)
    html = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", html)
    return html


def _extract_usd_prices(plain_text: str) -> list[float]:
    """Collect plausible product USD amounts from noisy search HTML text."""
    pattern = re.compile(r"\$\s*(\d{1,3}(?:,\d{3})+|\d{1,5})(\.\d{1,2})?")
    found: list[float] = []
    for m in pattern.finditer(plain_text):
        whole = m.group(1).replace(",", "")
        frac = m.group(2) or ""
        try:
            val = float(whole + frac) if frac else float(whole)
        except ValueError:
            continue
        if 4.0 <= val <= 45_000.0:
            found.append(round(val, 2))
    return sorted({*found})[:12]


def _extract_prices_from_raw_html(html: str) -> list[float]:
    """
    Many retailers embed prices only in JSON / data attributes; strip HTML first loses them.
    Pull numeric prices from common patterns (JSON-LD, Next.js blobs, itemprop, meta).
    """
    found: set[float] = set()

    def _add(val: float) -> None:
        if val == int(val) and 1990 <= val <= 2035:
            return
        if 4.0 <= val <= 45_000.0:
            found.add(round(val, 2))

    # JSON: "price": 123.45, "currentPrice": 99, variantPrices, etc.
    for m in re.finditer(
        r'"(?:price|currentPrice|listPrice|minPrice|maxPrice|priceDisplay|'
        r'primaryOfferPrice|buyboxPrice)"\s*:\s*"?(\d+(?:\.\d+)?)"?',
        html,
        re.IGNORECASE,
    ):
        try:
            _add(float(m.group(1)))
        except ValueError:
            pass

    # itemprop=price content="99.99"
    for m in re.finditer(
        r'itemprop=["\']price["\'][^>]*content=["\']([\d.]+)["\']',
        html,
        re.IGNORECASE,
    ):
        try:
            _add(float(m.group(1)))
        except ValueError:
            pass

    # data-automation-id or data-price style
    for m in re.finditer(r'data-(?:price|current-price|strikethrough-price)=["\']([\d.]+)["\']', html, re.IGNORECASE):
        try:
            _add(float(m.group(1)))
        except ValueError:
            pass

    # aria-label="$349.00" (Target / others)
    for m in re.finditer(r'aria-label=["\']\s*\$(\d{1,3}(?:,\d{3})+|\d+(?:\.\d{1,2})?)', html, re.IGNORECASE):
        try:
            _add(float(m.group(1).replace(",", "")))
        except ValueError:
            pass

    # eBay-style: price in markup near class contains "price"
    for m in re.finditer(
        r'class="[^"]*(?:price|currency)[^"]*"[^>]*>\s*\$(\d{1,3}(?:,\d{3})+|\d+(?:\.\d{2})?)',
        html,
        re.IGNORECASE,
    ):
        try:
            _add(float(m.group(1).replace(",", "")))
        except ValueError:
            pass

    return sorted(found)[:20]


def _signals_bot_challenge(title: str, excerpt: str, html_head: str) -> bool:
    blob = f"{title} {excerpt} {html_head[:12_000]}".lower()
    needles = (
        "robot check",
        "automated access",
        "captcha",
        "enable javascript",
        "access denied",
        "unusual traffic",
        "confirm you are human",
        "not a robot",
        "pardon our interruption",
        "robot or human",
    )
    return any(n in blob for n in needles)


def new_retailer_row(retailer_id: str, label: str, search_url: str) -> dict:
    return {
        "retailer_id": retailer_id,
        "label": label,
        "search_url": search_url,
        "fetched_url": None,
        "status_code": None,
        "ok": False,
        "title": None,
        "excerpt": None,
        "price_candidates_usd": [],
        "indicative_low_usd": None,
        "indicative_high_usd": None,
        "error": None,
        "likely_blocked": False,
    }


def populate_row_from_html(
    row: dict,
    html: str,
    *,
    max_bytes: int,
    fetched_url: str | None,
    status_code: int | None,
) -> dict:
    """Fill title, prices, ok/blocked from HTML snapshot (direct GET or FinCrawler body)."""
    text = html[:max_bytes]
    title_m = re.search(r"<title[^>]*>([^<]{1,500})</title>", text, re.IGNORECASE | re.DOTALL)
    title = ""
    if title_m:
        title = re.sub(r"\s+", " ", title_m.group(1)).strip()
    desc_m = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\'<]{1,500})',
        text,
        re.IGNORECASE,
    )
    excerpt = desc_m.group(1).strip() if desc_m else None
    if not excerpt:
        excerpt = re.sub(r"<[^>]+>", " ", _strip_html_scripts(text))[:400].strip()

    plain = re.sub(r"<[^>]+>", " ", _strip_html_scripts(text))
    from_plain = _extract_usd_prices(plain)
    from_embed = _extract_prices_from_raw_html(text)
    prices = sorted({*from_plain, *from_embed})[:12]

    row["fetched_url"] = fetched_url
    row["status_code"] = status_code
    row["title"] = title or row.get("label")
    row["excerpt"] = excerpt
    row["price_candidates_usd"] = prices
    if prices:
        row["indicative_low_usd"] = min(prices)
        row["indicative_high_usd"] = max(prices)
    else:
        row["indicative_low_usd"] = None
        row["indicative_high_usd"] = None

    blocked = _signals_bot_challenge(title, excerpt or "", text)
    row["likely_blocked"] = blocked
    if blocked:
        row["ok"] = False
        row["error"] = "likely_bot_challenge"
    else:
        row["ok"] = True
        row["error"] = None
    return row


def merge_better_retailer_row(base: dict, candidate: dict) -> dict:
    """Keep retailer identity from base; prefer candidate fields when it has stronger price/signal."""

    def score(r: dict) -> int:
        s = 0
        if r.get("indicative_low_usd") is not None:
            s += 4
        if r.get("ok") and not r.get("likely_blocked"):
            s += 3
        elif r.get("ok"):
            s += 1
        sc = r.get("status_code")
        if sc is not None and sc < 400:
            s += 1
        return s

    if score(candidate) <= score(base):
        return base
    out = {**base}
    for k in (
        "fetched_url",
        "status_code",
        "ok",
        "title",
        "excerpt",
        "price_candidates_usd",
        "indicative_low_usd",
        "indicative_high_usd",
        "error",
        "likely_blocked",
    ):
        out[k] = candidate.get(k)
    return out


async def fetch_retailer_search(
    client: httpx.AsyncClient,
    retailer_id: str,
    label: str,
    search_url: str,
    max_bytes: int,
) -> dict:
    row = new_retailer_row(retailer_id, label, search_url)
    try:
        r = await client.get(search_url)
    except httpx.RequestError as e:
        row["error"] = f"fetch_failed: {e!s}"
        return row

    row["fetched_url"] = str(r.url)
    row["status_code"] = r.status_code
    if r.status_code >= 400:
        row["error"] = f"http_{r.status_code}"
        return row

    return populate_row_from_html(row, r.text, max_bytes=max_bytes, fetched_url=str(r.url), status_code=r.status_code)


def _tips_for_query(q: str) -> list[str]:
    ql = q.lower()
    tips = [
        "Compare in-cart totals: shipping, tax, and membership discounts change the winner.",
        "Check issuer shopping portals and card-linked offers before you click Buy.",
        "Stack manufacturer rebates (common on TVs and cameras) with store coupons when allowed.",
    ]
    if any(k in ql for k in ("tv", "television", "oled", "qled", "4k")):
        tips.append("TVs: verify panel type, warranty length, and whether the stand or mount is included.")
    if any(k in ql for k in ("camera", "gopro", "action cam", "sony", "canon", "nikon", "webcam")):
        tips.append("Cameras: confirm body-only vs kit; check battery, charger, and memory card in the box.")
    if "refurb" in ql or "renewed" in ql:
        tips.append("Refurbished: confirm warranty source—OEM refurb usually beats third-party sellers.")
    return tips


async def compare_across_retailers(query: str, max_bytes: int = 350_000) -> dict:
    """Delegates to parallel retailer agents (see `shopping_agents`)."""
    from shopping_agents import orchestrate_parallel_compare

    return await orchestrate_parallel_compare(query, max_bytes)
