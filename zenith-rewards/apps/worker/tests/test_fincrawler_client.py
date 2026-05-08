"""Tests FinCrawler URL construction (base + FINCRAWLER_CRAWL_PATH)."""

from __future__ import annotations

import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import fincrawler_client


def _mock_json_response(html: str | None = None) -> MagicMock:
    if html is None:
        html = "<html><title>t</title><body>" + ("x" * 90) + "</body></html>"
    resp = MagicMock()
    resp.status_code = 200
    resp.headers = {"content-type": "application/json"}
    resp.text = ""
    resp.json.return_value = {"html": html}
    return resp


class TestFinCrawlerCrawlPath(unittest.IsolatedAsyncioTestCase):
    async def test_default_path_is_slash_crawl(self) -> None:
        with patch.dict(os.environ, {"FINCRAWLER_BASE_URL": "https://fc.example.com"}, clear=False):
            os.environ.pop("FINCRAWLER_CRAWL_PATH", None)
            with patch.object(fincrawler_client.httpx, "AsyncClient") as mock_client_cls:
                instance = MagicMock()
                mock_client_cls.return_value.__aenter__.return_value = instance
                instance.post = AsyncMock(return_value=_mock_json_response())

                out = await fincrawler_client.fincrawler_scrape_page("https://retailer.test/s?q=1", max_bytes=5000)

                self.assertTrue(out.get("ok"), out)
                instance.post.assert_awaited_once()
                url = instance.post.await_args.args[0]
                self.assertEqual(url, "https://fc.example.com/crawl")

    async def test_custom_path_used_verbatim(self) -> None:
        env = {
            "FINCRAWLER_BASE_URL": "https://fc.example.com",
            "FINCRAWLER_CRAWL_PATH": "/v1/browser/crawl",
        }
        with patch.dict(os.environ, env, clear=False):
            with patch.object(fincrawler_client.httpx, "AsyncClient") as mock_client_cls:
                instance = MagicMock()
                mock_client_cls.return_value.__aenter__.return_value = instance
                instance.post = AsyncMock(return_value=_mock_json_response())

                await fincrawler_client.fincrawler_scrape_page("https://retailer.test/s", max_bytes=3000)

                url = instance.post.await_args.args[0]
                self.assertEqual(url, "https://fc.example.com/v1/browser/crawl")

    async def test_path_without_leading_slash_gets_prefix(self) -> None:
        env = {
            "FINCRAWLER_BASE_URL": "https://fc.example.com/api",
            "FINCRAWLER_CRAWL_PATH": "internal/crawl",
        }
        with patch.dict(os.environ, env, clear=False):
            with patch.object(fincrawler_client.httpx, "AsyncClient") as mock_client_cls:
                instance = MagicMock()
                mock_client_cls.return_value.__aenter__.return_value = instance
                instance.post = AsyncMock(return_value=_mock_json_response())

                await fincrawler_client.fincrawler_scrape_page("https://a.test/", max_bytes=1000)

                url = instance.post.await_args.args[0]
                self.assertEqual(url, "https://fc.example.com/api/internal/crawl")

    async def test_yahoo_finance_style_title_excerpt_without_raw_html(self) -> None:
        """Render FinCrawler / Yahoo crawl extension often returns the same shape as worker `POST /crawl` (no html field)."""
        with patch.dict(os.environ, {"FINCRAWLER_BASE_URL": "https://fc.example.com"}, clear=False):
            os.environ.pop("FINCRAWLER_CRAWL_PATH", None)
            with patch.object(fincrawler_client.httpx, "AsyncClient") as mock_client_cls:
                instance = MagicMock()
                mock_client_cls.return_value.__aenter__.return_value = instance
                resp = MagicMock()
                resp.status_code = 200
                resp.headers = {"content-type": "application/json"}
                resp.text = ""
                resp.json.return_value = {
                    "url": "https://finance.yahoo.com/quote/AAPL",
                    "status_code": 200,
                    "title": "Apple Inc. (AAPL) Stock Price, News, Quote & History - Yahoo Finance",
                    "excerpt": "Find the latest Apple Inc. (AAPL) stock quote, history, news and other vital information.",
                    "content_type": "text/html; charset=utf-8",
                }
                instance.post = AsyncMock(return_value=resp)

                out = await fincrawler_client.fincrawler_scrape_page(
                    "https://finance.yahoo.com/quote/AAPL",
                    max_bytes=50_000,
                )
                self.assertTrue(out.get("ok"), out)
                self.assertIn("AAPL", out["html"])
                self.assertIn("Apple", out["html"])

    async def test_json_body_includes_url_and_max_bytes(self) -> None:
        with patch.dict(os.environ, {"FINCRAWLER_BASE_URL": "https://fc.test"}, clear=False):
            os.environ.pop("FINCRAWLER_CRAWL_PATH", None)
            with patch.object(fincrawler_client.httpx, "AsyncClient") as mock_client_cls:
                instance = MagicMock()
                mock_client_cls.return_value.__aenter__.return_value = instance
                instance.post = AsyncMock(return_value=_mock_json_response())

                target = "https://shop.example/item"
                await fincrawler_client.fincrawler_scrape_page(target, max_bytes=120_000)

                kwargs = instance.post.await_args.kwargs
                self.assertEqual(kwargs["json"]["url"], target)
                self.assertEqual(kwargs["json"]["max_bytes"], 120_000)


@unittest.skipUnless(
    os.environ.get("FINCRAWLER_BASE_URL", "").strip(),
    "Set FINCRAWLER_BASE_URL (and optional FINCRAWLER_CRAWL_PATH) for a live smoke test.",
)
class TestFinCrawlerLiveSmoke(unittest.IsolatedAsyncioTestCase):
    """Hit the real service. Run: FINCRAWLER_BASE_URL=... python -m unittest tests.test_fincrawler_client.TestFinCrawlerLiveSmoke."""

    async def test_live_returns_html_or_structured_error(self) -> None:
        out = await fincrawler_client.fincrawler_scrape_page(
            "https://example.com/",
            max_bytes=50_000,
        )
        self.assertIn("ok", out)
        if out["ok"]:
            self.assertIn("html", out)
            self.assertGreater(len(out["html"]), 20)
        else:
            self.assertIn("error", out)
