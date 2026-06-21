"""Multi-retailer search snapshot: real HTTP fetches, heuristic USD price hints."""

from __future__ import annotations

import json
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


def _plausible_price_floor(query: str | None) -> float:
    """Minimum believable USD price for a search query (filters accessory/shipping noise)."""
    q = (query or "").lower()
    if any(k in q for k in ("osmo pocket", "pocket 3", "pocket 2")):
        return 150.0
    if "dji" in q and any(k in q for k in ("camera", "drone", "gimbal", "mic", "osmo", "pocket")):
        return 79.0
    if any(k in q for k in ("macbook", "iphone 16", "iphone 15", "ipad pro")):
        return 199.0
    if any(k in q for k in ("oled", "qled", "television", " tv", "4k tv")):
        return 199.0
    if any(k in q for k in ("camera", "gopro", "sony a7", "canon r", "nikon z", "webcam")):
        return 49.0
    return 15.0


def _filter_plausible_prices(prices: list[float], query: str | None) -> list[float]:
    if not prices:
        return []
    floor = _plausible_price_floor(query)
    above = sorted(p for p in prices if p >= floor)
    if above:
        return above
    if len(prices) >= 3:
        mid = sorted(prices)[len(prices) // 2]
        if mid >= floor * 0.5:
            return sorted(p for p in prices if p >= mid * 0.45)
    return []


def _robust_representative_price(prices: list[float]) -> float | None:
    if not prices:
        return None
    s = sorted(prices)
    return s[len(s) // 2]


def _clean_product_title(title: str | None, query: str | None) -> str:
    t = re.sub(r"\s+", " ", (title or "").strip())
    t = re.sub(r"^(Amazon\.com|Amazon|Best Buy|Walmart\.com|Target|eBay)\s*:\s*", "", t, flags=re.I)
    if not t or t.lower() in {"search results", "search result"}:
        return (query or "Product").strip()
    return t


def _coerce_price(val: object) -> float | None:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        v = float(val)
        return v if 4.0 <= v <= 45_000.0 else None
    if isinstance(val, str):
        m = re.search(r"(\d{1,3}(?:,\d{3})+|\d+(?:\.\d{1,2})?)", val.replace("$", ""))
        if not m:
            return None
        try:
            v = float(m.group(1).replace(",", ""))
        except ValueError:
            return None
        return v if 4.0 <= v <= 45_000.0 else None
    return None


def _discount_pct(price: float, list_price: float | None) -> int | None:
    if list_price is None or list_price <= price:
        return None
    return round((list_price - price) / list_price * 100)


def _product_dict(
    title: str,
    price: float,
    *,
    list_price: float | None = None,
    url: str | None = None,
) -> dict:
    title = re.sub(r"\s+", " ", title).strip()[:200]
    return {
        "title": title or "Product",
        "price_usd": round(price, 2),
        "list_price_usd": round(list_price, 2) if list_price is not None else None,
        "discount_pct": _discount_pct(price, list_price),
        "url": url,
    }


def _dedupe_products(products: list[dict]) -> list[dict]:
    seen: set[tuple[str, float]] = set()
    out: list[dict] = []
    for p in products:
        key = (p["title"].lower()[:80], p["price_usd"])
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


def _products_from_json_ld(html: str) -> list[dict]:
    products: list[dict] = []
    for block in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.IGNORECASE | re.DOTALL,
    ):
        raw = block.group(1).strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        stack: list[object] = [data]
        while stack:
            node = stack.pop()
            if isinstance(node, list):
                stack.extend(node)
                continue
            if not isinstance(node, dict):
                continue
            node_type = node.get("@type") or node.get("type")
            types = node_type if isinstance(node_type, list) else [node_type]
            type_str = " ".join(str(t) for t in types if t).lower()
            if "product" in type_str:
                title = str(node.get("name") or node.get("title") or "").strip()
                offers = node.get("offers")
                offer = offers[0] if isinstance(offers, list) and offers else offers
                price = None
                list_price = None
                url = node.get("url")
                if isinstance(offer, dict):
                    price = _coerce_price(offer.get("price") or offer.get("lowPrice"))
                    list_price = _coerce_price(
                        offer.get("listPrice") or offer.get("highPrice") or offer.get("wasPrice"),
                    )
                    url = offer.get("url") or url
                if price is None:
                    price = _coerce_price(node.get("price"))
                if title and price is not None:
                    products.append(_product_dict(title, price, list_price=list_price, url=str(url) if url else None))
            if "itemlist" in type_str:
                items = node.get("itemListElement") or []
                if isinstance(items, list):
                    stack.extend(items)
            for k in ("@graph", "mainEntity", "hasPart", "itemListElement"):
                child = node.get(k)
                if child is not None:
                    stack.append(child)
    return products


def _products_from_embedded_json(html: str) -> list[dict]:
    products: list[dict] = []
    patterns = [
        re.compile(
            r'"name"\s*:\s*"([^"\\]{3,200})"[^}]{0,400}?'
            r'"(?:price|currentPrice)"\s*:\s*"?(\d+(?:\.\d+)?)"?',
            re.IGNORECASE | re.DOTALL,
        ),
        re.compile(
            r'"title"\s*:\s*"([^"\\]{3,200})"[^}]{0,400}?'
            r'"(?:price|currentPrice)"\s*:\s*"?(\d+(?:\.\d+)?)"?',
            re.IGNORECASE | re.DOTALL,
        ),
    ]
    for pat in patterns:
        for m in pat.finditer(html):
            title = m.group(1).encode().decode("unicode_escape", errors="ignore").strip()
            price = _coerce_price(m.group(2))
            if not title or price is None:
                continue
            tail = html[m.end() : m.end() + 300]
            list_m = re.search(
                r'"(?:listPrice|wasPrice|regularPrice|strikethroughPrice)"\s*:\s*"?(\d+(?:\.\d+)?)"?',
                tail,
                re.IGNORECASE,
            )
            list_price = _coerce_price(list_m.group(1)) if list_m else None
            products.append(_product_dict(title, price, list_price=list_price))
    return products


def extract_products_from_html(
    html: str,
    *,
    max_bytes: int,
    fallback_title: str | None = None,
    query: str | None = None,
) -> list[dict]:
    """Best-effort product cards from search HTML (up to 6)."""
    text = html[:max_bytes]
    floor = _plausible_price_floor(query)
    products = _dedupe_products(_products_from_json_ld(text) + _products_from_embedded_json(text))
    products = [p for p in products if p["price_usd"] >= floor]
    products.sort(key=lambda p: p["price_usd"])
    if products:
        return products[:6]

    plain = re.sub(r"<[^>]+>", " ", _strip_html_scripts(text))
    from_plain = _extract_usd_prices(plain)
    from_embed = _extract_prices_from_raw_html(text)
    prices = _filter_plausible_prices(sorted({*from_plain, *from_embed}), query)
    if not prices:
        return []

    price = _robust_representative_price(prices)
    if price is None:
        return []
    list_price = max(prices) if len(prices) > 1 and max(prices) > price else None
    title = _clean_product_title(fallback_title, query)
    return [_product_dict(title, price, list_price=list_price)]


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
        "products": [],
    }


def populate_row_from_html(
    row: dict,
    html: str,
    *,
    max_bytes: int,
    fetched_url: str | None,
    status_code: int | None,
    query: str | None = None,
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
    prices = _filter_plausible_prices(sorted({*from_plain, *from_embed}), query)[:12]

    row["fetched_url"] = fetched_url
    row["status_code"] = status_code
    row["title"] = _clean_product_title(title or row.get("label"), query)
    row["excerpt"] = excerpt
    row["price_candidates_usd"] = prices

    products = extract_products_from_html(
        text, max_bytes=max_bytes, fallback_title=row["title"], query=query,
    )
    row["products"] = products
    product_prices = [p["price_usd"] for p in products if isinstance(p.get("price_usd"), (int, float))]
    if product_prices:
        row["indicative_low_usd"] = min(product_prices)
        row["indicative_high_usd"] = max(product_prices)
    elif prices:
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
        "products",
        "fetch_source",
    ):
        out[k] = candidate.get(k)
    return out


async def fetch_retailer_search(
    client: httpx.AsyncClient,
    retailer_id: str,
    label: str,
    search_url: str,
    max_bytes: int,
    query: str = "",
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

    return populate_row_from_html(
        row, r.text, max_bytes=max_bytes, fetched_url=str(r.url), status_code=r.status_code, query=query,
    )


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
