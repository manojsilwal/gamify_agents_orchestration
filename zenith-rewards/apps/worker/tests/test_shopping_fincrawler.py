"""Unit tests for Google Shopping / FinCrawler row mapping."""

from __future__ import annotations

import os
import unittest
from unittest.mock import AsyncMock, patch

import shopping_agents
from shopping_agents import (
    _apply_tier_observability,
    _coerce_usd_price,
    _fincrawler_result_to_row,
    _finalize_retailer_rows,
    _merge_fincrawler_shop_row,
    _normalize_retailer_id,
    _placeholder_retailer_rows,
    _rows_from_google_payload,
    _rows_from_search_payload,
    orchestrate_parallel_compare,
    orchestrate_parallel_compare_stream,
)
from shopping import new_retailer_row


class TestFinCrawlerShoppingMapping(unittest.TestCase):
    def test_normalize_retailer_id(self) -> None:
        self.assertEqual(_normalize_retailer_id("Best Buy"), "bestbuy")
        self.assertEqual(_normalize_retailer_id("amazon.com"), "amazon")
        self.assertEqual(_normalize_retailer_id("Target"), "target")

    def test_coerce_usd_price(self) -> None:
        self.assertEqual(_coerce_usd_price("$349.99"), 349.99)
        self.assertEqual(_coerce_usd_price(419), 419.0)
        self.assertIsNone(_coerce_usd_price("free"))

    def test_search_payload_maps_success_and_errors(self) -> None:
        payload = {
            "results": [
                {
                    "retailer_key": "amazon",
                    "retailer": "Amazon",
                    "url": "https://www.amazon.com/dp/example",
                    "http_status": 200,
                    "status": "ok",
                    "data": {"product_name": "DJI Osmo Pocket 3", "price": 419.0},
                },
                {
                    "retailer_key": "walmart",
                    "retailer": "Walmart",
                    "url": "https://www.walmart.com/search?q=example",
                    "status": "error",
                    "error": "timeout",
                    "data": None,
                },
                {
                    "retailer_key": "ebay",
                    "retailer": "eBay",
                    "url": "https://www.ebay.com/sch/example",
                    "http_status": 403,
                    "status": "ok",
                    "data": {"_error": "product_not_found"},
                },
            ]
        }
        by_id = _rows_from_search_payload(payload, "dji osmo pocket 3")
        self.assertTrue(by_id["amazon"]["ok"])
        self.assertEqual(by_id["amazon"]["indicative_low_usd"], 419.0)
        self.assertFalse(by_id["walmart"]["ok"])
        self.assertEqual(by_id["walmart"]["error"], "timeout")
        self.assertFalse(by_id["ebay"]["ok"])
        self.assertEqual(by_id["ebay"]["error"], "product_not_found")

    def test_search_payload_maps_multi_product(self) -> None:
        payload = {
            "results": [
                {
                    "retailer_key": "amazon",
                    "retailer": "Amazon",
                    "status": "ok",
                    "data": {
                        "products": [
                            {"product_name": "Desk Lamp Basic", "price": 29.99, "seller": "Amazon"},
                            {"product_name": "Desk Lamp Pro", "price": 49.99, "seller": "Third Party"},
                        ],
                        "product_name": "Desk Lamp Basic",
                        "price": 29.99,
                    },
                },
            ]
        }
        by_id = _rows_from_search_payload(payload, "desk lamp")
        amazon = by_id["amazon"]
        self.assertTrue(amazon["ok"])
        self.assertEqual(len(amazon["products"]), 2)
        self.assertEqual(amazon["indicative_low_usd"], 29.99)

    def test_merge_retailer_products_accumulates_listings(self) -> None:
        first = new_retailer_row("amazon", "Amazon", "https://amazon.test/s")
        first["products"] = [{"title": "A", "price_usd": 30.0}]
        first["indicative_low_usd"] = 30.0
        first["ok"] = True
        second = new_retailer_row("amazon", "Amazon", "https://amazon.test/s")
        second["products"] = [{"title": "B", "price_usd": 25.0}]
        second["indicative_low_usd"] = 25.0
        second["ok"] = True
        from shopping_agents import _merge_retailer_products

        merged = _merge_retailer_products(first, second)
        self.assertEqual(len(merged["products"]), 2)
        self.assertEqual(merged["indicative_low_usd"], 25.0)

    def test_google_payload_best_price_per_retailer(self) -> None:
        payload = {
            "listings": [
                {
                    "retailer": "Amazon",
                    "title": "DJI Osmo Pocket 3",
                    "price": "$519.00",
                    "url": "https://www.amazon.com/example",
                },
                {
                    "merchant": "Amazon",
                    "title": "DJI Osmo Pocket 3 deal",
                    "price": 419.0,
                    "url": "https://www.amazon.com/example2",
                },
                {
                    "store": "Target",
                    "title": "DJI Pocket 3",
                    "price": 499.99,
                },
            ]
        }
        by_id = _rows_from_google_payload(payload, "dji osmo pocket 3")
        self.assertEqual(by_id["amazon"]["indicative_low_usd"], 419.0)
        self.assertEqual(by_id["target"]["indicative_low_usd"], 499.99)
        self.assertEqual(len(by_id["amazon"]["products"]), 2)
        self.assertEqual(by_id["amazon"]["fetch_source"], "google_shopping")

    def test_search_payload_maps_tier_observability(self) -> None:
        payload = {
            "results": [
                {
                    "retailer_key": "target",
                    "retailer": "Target",
                    "url": "https://www.target.com/s?searchTerm=example",
                    "http_status": 403,
                    "status": "blocked",
                    "tier_used": 3,
                    "tier_name": "advanced_antibot",
                    "detection_hits": ["captcha", "behavioral_ml"],
                    "block_reason": "turnstile_challenge",
                    "session_id": "target-abc123",
                    "data": None,
                },
            ]
        }
        by_id = _rows_from_search_payload(payload, "example product")
        row = by_id["target"]
        self.assertFalse(row["ok"])
        self.assertTrue(row["likely_blocked"])
        self.assertEqual(row["fetch_tier"], 3)
        self.assertEqual(row["tier_name"], "advanced_antibot")
        self.assertEqual(row["detection_hits"], ["captcha", "behavioral_ml"])
        self.assertEqual(row["session_id"], "target-abc123")
        self.assertEqual(row["error"], "turnstile_challenge")

    def test_merge_fincrawler_blocked_updates_fetch_source(self) -> None:
        placeholders = {r["retailer_id"]: r for r in _placeholder_retailer_rows("desk lamp")}
        blocked = _fincrawler_result_to_row(
            {
                "retailer_key": "target",
                "retailer": "Target",
                "status": "blocked",
                "block_reason": "turnstile_challenge",
            },
            "desk lamp",
        )
        assert blocked is not None
        merged, changed = _merge_fincrawler_shop_row(placeholders, blocked)
        self.assertTrue(changed)
        self.assertEqual(merged["fetch_source"], "fincrawler_v2")
        self.assertEqual(merged["error"], "turnstile_challenge")
        self.assertFalse(merged["ok"])

    def test_apply_tier_observability(self) -> None:
        row: dict = {"retailer_id": "amazon"}
        _apply_tier_observability(
            row,
            {
                "tier_used": 4,
                "tier_name": "bank_grade",
                "detection_hits": ["ip_reputation"],
                "session_id": "amazon-xyz",
            },
        )
        self.assertEqual(row["fetch_tier"], 4)
        self.assertEqual(row["tier_name"], "bank_grade")
        self.assertEqual(row["detection_hits"], ["ip_reputation"])
        self.assertEqual(row["session_id"], "amazon-xyz")

    def test_finalize_fills_missing_retailers(self) -> None:
        row = _fincrawler_result_to_row(
            {
                "retailer_key": "amazon",
                "retailer": "Amazon",
                "status": "ok",
                "data": {"product_name": "Example", "price": 10.0},
            },
            "example",
        )
        assert row is not None
        rows = _finalize_retailer_rows({"amazon": row}, "example")
        self.assertEqual(len(rows), 5)
        self.assertEqual(rows[1]["error"], "not_found_in_shop_search")


class TestFinCrawlerOrchestration(unittest.IsolatedAsyncioTestCase):
    def test_placeholder_rows_cover_all_retailers(self) -> None:
        rows = _placeholder_retailer_rows("desk lamp")
        self.assertEqual(len(rows), 5)
        self.assertTrue(all(r["error"] == "fetching" for r in rows))
        self.assertTrue(all(r["fetch_source"] == "pending" for r in rows))

    async def test_stream_yields_fincrawler_updates_progressively(self) -> None:
        async def mock_hybrid(_q, _max_bytes, row_by_id):
            row = new_retailer_row("amazon", "Amazon", "https://amazon.test/s")
            row["ok"] = True
            row["indicative_low_usd"] = 29.99
            row["fetch_source"] = "fincrawler_v2"
            row["products"] = [{"title": "Desk Lamp", "price_usd": 29.99}]
            row["error"] = None
            row_by_id["amazon"] = row
            yield row

        async def empty_fallback(*_args, **_kwargs):
            if False:
                yield

        with patch.dict(os.environ, {"FINCRAWLER_BASE_URL": "https://fc.test"}, clear=False):
            with patch.object(
                shopping_agents,
                "_stream_hybrid_compare_rows",
                side_effect=mock_hybrid,
            ):
                with patch.object(
                    shopping_agents,
                    "_http_fallback_weak_retailers",
                    side_effect=empty_fallback,
                ):
                    events = [
                        event
                        async for event in orchestrate_parallel_compare_stream("desk lamp", max_bytes=10_000)
                    ]

        retailer_events = [e for e in events if e["type"] == "retailer"]
        self.assertEqual(retailer_events[0]["data"]["fetch_source"], "pending")
        fc_hits = [e for e in retailer_events if e["data"].get("fetch_source") == "fincrawler_v2"]
        self.assertTrue(fc_hits, "expected FinCrawler row before summary")
        summary = events[-1]["data"]
        amazon = next(r for r in summary["retailers"] if r["retailer_id"] == "amazon")
        self.assertEqual(amazon["fetch_source"], "fincrawler_v2")

    async def test_stream_uses_fincrawler_when_configured(self) -> None:
        async def mock_hybrid(_q, _max_bytes, row_by_id):
            row = new_retailer_row("amazon", "Amazon", "https://amazon.test/s")
            row["ok"] = True
            row["indicative_low_usd"] = 29.99
            row["fetch_source"] = "fincrawler_v2"
            row["products"] = [{"title": "Desk Lamp", "price_usd": 29.99}]
            row["error"] = None
            row_by_id["amazon"] = row
            yield row

        async def empty_fallback(*_args, **_kwargs):
            if False:
                yield

        with patch.dict(os.environ, {"FINCRAWLER_BASE_URL": "https://fc.test"}, clear=False):
            with patch.object(
                shopping_agents,
                "_stream_hybrid_compare_rows",
                side_effect=mock_hybrid,
            ) as mock_stream:
                with patch.object(
                    shopping_agents,
                    "_http_fallback_weak_retailers",
                    side_effect=empty_fallback,
                ):
                    events = [
                        event
                        async for event in orchestrate_parallel_compare_stream("desk lamp", max_bytes=10_000)
                    ]

        mock_stream.assert_called_once()
        self.assertEqual(events[-1]["type"], "summary")
        summary = events[-1]["data"]
        self.assertIn("FinCrawler", summary["disclaimer"])
        amazon = next(r for r in summary["retailers"] if r["retailer_id"] == "amazon")
        self.assertEqual(amazon["fetch_source"], "fincrawler_v2")
        self.assertTrue(amazon["ok"])

    async def test_batch_http_fallback_improves_weak_fincrawler_rows(self) -> None:
        search_payload = {
            "results": [
                {
                    "retailer_key": "amazon",
                    "retailer": "Amazon",
                    "status": "ok",
                    "data": {"product_name": "Desk Lamp", "price": 29.99},
                },
            ]
        }

        async def mock_agent_run(_client, retailer_id, label, search_url, max_bytes, **kwargs):
            row = new_retailer_row(retailer_id, label, search_url)
            if retailer_id == "walmart":
                row["ok"] = True
                row["indicative_low_usd"] = 27.99
                row["indicative_high_usd"] = 27.99
                row["price_candidates_usd"] = [27.99]
                row["fetch_source"] = "http"
            return row

        with patch.dict(os.environ, {"FINCRAWLER_BASE_URL": "https://fc.test"}, clear=False):
            with patch.object(
                shopping_agents,
                "fincrawler_search_shopping",
                new_callable=AsyncMock,
                return_value={"ok": True, "results": search_payload},
            ):
                with patch.object(shopping_agents, "_retailer_agent_run", side_effect=mock_agent_run):
                    result = await orchestrate_parallel_compare("desk lamp", max_bytes=10_000)

        walmart = next(r for r in result["retailers"] if r["retailer_id"] == "walmart")
        self.assertEqual(walmart["indicative_low_usd"], 27.99)
        self.assertTrue(walmart["ok"])
        self.assertIn("FinCrawler", result["disclaimer"])

    async def test_stream_http_path_yields_placeholders_then_updates(self) -> None:
        with patch.dict(os.environ, {"FINCRAWLER_BASE_URL": ""}, clear=False):
            async def mock_stream_timed(_client, retailer_id, label, search_url, max_bytes, stagger_index, query, **_kwargs):
                row = new_retailer_row(retailer_id, label, search_url)
                row["ok"] = True
                row["indicative_low_usd"] = 19.99
                row["fetch_source"] = "http"
                return row

            with patch.object(
                shopping_agents,
                "_run_retailer_stream_timed",
                side_effect=mock_stream_timed,
            ):
                events = [
                    event
                    async for event in orchestrate_parallel_compare_stream("desk lamp", max_bytes=10_000)
                ]

        retailer_events = [e for e in events if e["type"] == "retailer"]
        self.assertGreaterEqual(len(retailer_events), 10)
        for row in retailer_events[:5]:
            self.assertEqual(row["data"]["error"], "fetching")
        self.assertEqual(events[-1]["type"], "summary")


if __name__ == "__main__":
    unittest.main()
