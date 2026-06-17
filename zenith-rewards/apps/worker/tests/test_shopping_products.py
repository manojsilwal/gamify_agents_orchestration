"""Unit tests for multi-product extraction from retailer search HTML."""

import unittest

from shopping import extract_products_from_html, new_retailer_row, populate_row_from_html


class TestExtractProductsFromHtml(unittest.TestCase):
    def test_json_ld_product_with_list_price(self) -> None:
        html = """
        <html><head>
        <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "DJI Osmo Pocket 3",
          "url": "https://example.com/p/1",
          "offers": {
            "price": 419.0,
            "listPrice": 499.0
          }
        }
        </script>
        </head><body></body></html>
        """
        products = extract_products_from_html(html, max_bytes=50_000, fallback_title="Fallback")
        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["title"], "DJI Osmo Pocket 3")
        self.assertEqual(products[0]["price_usd"], 419.0)
        self.assertEqual(products[0]["list_price_usd"], 499.0)
        self.assertEqual(products[0]["discount_pct"], 16)

    def test_fallback_single_product_from_prices(self) -> None:
        html = """
        <html><head><title>Webcam search</title></head>
        <body>Great deal $29.99 was $39.99</body></html>
        """
        products = extract_products_from_html(html, max_bytes=50_000, fallback_title="Webcam search")
        self.assertGreaterEqual(len(products), 1)
        self.assertEqual(products[0]["title"], "Webcam search")
        self.assertIsNotNone(products[0]["price_usd"])

    def test_populate_row_sets_products(self) -> None:
        html = """
        <html><head><title>Camera</title></head>
        <body><span>$199.00</span><span>$249.00</span></body></html>
        """
        row = new_retailer_row("amazon", "Amazon", "https://amazon.com/s?k=camera")
        populate_row_from_html(
            row,
            html,
            max_bytes=50_000,
            fetched_url="https://amazon.com/s?k=camera",
            status_code=200,
            query="camera",
        )
        self.assertTrue(row["products"])
        self.assertIsNotNone(row["indicative_low_usd"])

    def test_filters_accessory_noise_for_dji_query(self) -> None:
        html = """
        <html><head><title>Amazon.com : dji osmo pocket 3</title></head>
        <body><span>$10.00</span><span>$419.00</span><span>$519.00</span></body></html>
        """
        products = extract_products_from_html(
            html,
            max_bytes=50_000,
            fallback_title="Amazon.com : dji osmo pocket 3",
            query="dji osmo pocket 3",
        )
        self.assertEqual(len(products), 1)
        self.assertGreaterEqual(products[0]["price_usd"], 150.0)
        self.assertEqual(products[0]["title"], "dji osmo pocket 3")


if __name__ == "__main__":
    unittest.main()
