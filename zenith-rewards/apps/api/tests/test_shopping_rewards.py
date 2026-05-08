from services.shopping_rewards import build_shopping_rewards_enrichment


def test_enrichment_detects_chase_and_maps_retailers():
    cards = [{"card_name": "Chase Sapphire Preferred", "issuer": "Chase"}]
    loyalty = [{"program_name": "United MileagePlus"}]
    retailers = [
        {"retailer_id": "amazon", "label": "Amazon"},
        {"retailer_id": "bestbuy", "label": "Best Buy"},
        {"retailer_id": "walmart", "label": "Walmart"},
        {"retailer_id": "ebay", "label": "eBay"},
        {"retailer_id": "target", "label": "Target"},
    ]
    out = build_shopping_rewards_enrichment(retailers, cards, loyalty)
    assert len(out["rewards_by_retailer"]) == 5
    assert "chase" in out["user_rewards_context"]["detected_issuers"]
    assert any("Chase" in t for t in out["user_rewards_context"]["personalized_tips"])
    amazon = next(r for r in out["rewards_by_retailer"] if r["retailer_id"] == "amazon")
    assert amazon["portal_angle"]
    assert any("Chase" in h for h in amazon["issuer_hooks"])
