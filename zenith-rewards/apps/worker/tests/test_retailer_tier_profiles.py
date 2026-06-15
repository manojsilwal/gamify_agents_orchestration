"""Tests for per-retailer tier profiles and CrawlOptions."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from retailer_tier_profiles import (
    CrawlOptions,
    TIER_NAMES,
    get_crawl_options,
    get_retailer_default_tier,
    get_shop_search_options,
)


class TestRetailerTierProfiles(unittest.TestCase):
    def test_amazon_default_tier(self) -> None:
        self.assertEqual(get_retailer_default_tier("amazon"), 1)

    def test_ebay_default_tier(self) -> None:
        self.assertEqual(get_retailer_default_tier("ebay"), 1)

    def test_unknown_retailer_fallback(self) -> None:
        self.assertEqual(get_retailer_default_tier("unknown_store"), 1)

    def test_get_crawl_options_includes_retailer_key(self) -> None:
        opts = get_crawl_options("walmart")
        self.assertEqual(opts.retailer_key, "walmart")
        self.assertEqual(opts.tier, 1)
        self.assertFalse(opts.warm_session)
        self.assertTrue(opts.session_id.startswith("walmart-"))

    def test_ebay_warm_session_false(self) -> None:
        opts = get_crawl_options("ebay")
        self.assertFalse(opts.warm_session)

    def test_crawl_options_to_request_dict(self) -> None:
        opts = CrawlOptions(
            tier=4,
            max_tier=4,
            auto_escalate=True,
            session_id="amazon-abc",
            warm_session=False,
            retailer_key="amazon",
        )
        d = opts.to_request_dict()
        self.assertEqual(d["tier"], 4)
        self.assertEqual(d["tier_name"], TIER_NAMES[4])
        self.assertEqual(d["max_tier"], 4)
        self.assertTrue(d["auto_escalate"])
        self.assertTrue(d["escalate_on_block"])
        self.assertEqual(d["session_id"], "amazon-abc")
        self.assertEqual(d["retailer_key"], "amazon")

    def test_with_tier_preserves_session(self) -> None:
        opts = get_crawl_options("target")
        bumped = opts.with_tier(4)
        self.assertEqual(bumped.tier, 4)
        self.assertEqual(bumped.session_id, opts.session_id)

    def test_shop_search_options_no_retailer_key(self) -> None:
        opts = get_shop_search_options()
        self.assertEqual(opts.retailer_key, "")
        self.assertTrue(opts.auto_escalate)

    @patch.dict(os.environ, {"FINCRAWLER_DEFAULT_MAX_TIER": "3"}, clear=False)
    def test_env_max_tier_override(self) -> None:
        opts = get_crawl_options("amazon")
        self.assertEqual(opts.max_tier, 3)

    @patch.dict(os.environ, {"FINCRAWLER_SESSION_WARM": "false"}, clear=False)
    def test_env_session_warm_disabled(self) -> None:
        opts = get_crawl_options("amazon")
        self.assertFalse(opts.warm_session)

    @patch.dict(os.environ, {"FINCRAWLER_PROXY_URL": "http://proxy:8080"}, clear=False)
    def test_env_proxy_included(self) -> None:
        opts = get_crawl_options("amazon")
        self.assertIsNotNone(opts.proxy)
        assert opts.proxy is not None
        self.assertEqual(opts.proxy["url"], "http://proxy:8080")


if __name__ == "__main__":
    unittest.main()
