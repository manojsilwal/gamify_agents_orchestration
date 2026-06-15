"""Unit tests for Google Shopping / FinCrawler row mapping."""

from __future__ import annotations

import unittest

from shopping_agents import (
    _apply_tier_observability,
    _coerce_usd_price,
    _fincrawler_result_to_row,
    _finalize_retailer_rows,
    _normalize_retailer_id,
    _rows_from_google_payload,
    _rows_from_search_payload,
)


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
        self.assertEqual(rows[1]["error"], "not_found_in_google_shopping")


if __name__ == "__main__":
    unittest.main()
