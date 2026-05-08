"""
test_e2e_fincrawler_points.py - End-to-End test of the FinCrawler extract endpoint
from the perspective of Zenith Rewards.
"""

import asyncio
import json
import os
from pprint import pprint

# Setup environment variables for fincrawler_client.py
os.environ["FINCRAWLER_BASE_URL"] = "http://localhost:8765"
os.environ["FINCRAWLER_TIMEOUT_SECONDS"] = "180"
os.environ["FINCRAWLER_API_KEY"] = "efff6510a96c4e4333895c67f749c514b3fbf4755b30ce6a90e07a95531ec574"

from fincrawler_client import fincrawler_extract_data

async def main():
    print("🚀 Starting E2E Zenith Rewards -> FinCrawler Integration Test\n")
    
    # Target URL: Nerdwallet's public valuation page for Chase points
    url = "https://www.nerdwallet.com/article/travel/chase-ultimate-rewards-points-value"
    
    # The Zenith agent's natural language instruction
    prompt = """
    Extract the point valuation data for Chase Ultimate Rewards points.
    Return a JSON object with:
    - baseline_value_cents (float): the baseline value of 1 point in cents
    - sapphire_preferred_value_cents (float): the value of 1 point for the Sapphire Preferred card when booked through the travel portal
    - sapphire_reserve_value_cents (float): the value of 1 point for the Sapphire Reserve card when booked through the travel portal
    - transfer_partners (array of strings): list of airline or hotel transfer partners mentioned
    """
    
    print(f"🔗 Target URL: {url}")
    print("🤖 Sending prompt to FinCrawler Intelligent Extraction Pipeline...\n")
    
    # Call the newly implemented client function
    result = await fincrawler_extract_data(url=url, prompt=prompt)
    
    if not result.get("ok"):
        print("❌ Extraction Failed:")
        pprint(result)
        return
        
    print("✅ Extraction Successful!\n")
    print("📦 Received Data:")
    print(json.dumps(result["data"], indent=2))
    print(f"\n⚡ Cache Hit: {result.get('cache_hit')}")

if __name__ == "__main__":
    asyncio.run(main())
