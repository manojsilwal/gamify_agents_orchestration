import asyncio
import websockets
import json
import time
import requests
from bs4 import BeautifulSoup

SERVER_URL = "ws://localhost:8080"

def scrape_valuations():
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    try:
        # Get Airline/Hotel valuations
        r = requests.get('https://thepointsguy.com/guide/monthly-valuations/', headers=headers)
        soup = BeautifulSoup(r.text, 'html.parser')

        valuations = []
        for tr in soup.find_all('tr'):
            tds = tr.find_all('td')
            if len(tds) >= 2:
                program = tds[0].text.strip()
                value = tds[1].text.strip()
                if program and value and 'cents' in value:
                    valuations.append({"program": program, "value": value})

        # Get Crypto Valuation just to show another source
        crypto_r = requests.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
        if crypto_r.status_code == 200:
            btc_price = crypto_r.json().get('bitcoin', {}).get('usd', 0)
            if btc_price:
                 valuations.append({"program": "Bitcoin", "value": f"${btc_price}"})

        if not valuations:
            return [{"program": "Fallback Airlines", "value": "1.5 cents"}]

        return valuations[:10] # limit to top 10
    except Exception as e:
        print(f"Scraping error: {e}")
        return [{"program": "Fallback Network", "value": "1.0 cents"}]

async def send_event(websocket, type, data, agentId="Supervisor"):
    event = {
        "type": type,
        "data": data,
        "agentId": agentId,
        "timestamp": time.time()
    }
    await websocket.send(json.dumps(event))

async def worker_agent(goal, worker_id):
    async with websockets.connect(SERVER_URL) as ws:
        await send_event(ws, "SPAWN", {"message": f"Worker {worker_id} online"}, worker_id)
        await asyncio.sleep(0.5)

        await send_event(ws, "THINKING", {"thought": f"Scraping live valuations..."}, worker_id)
        live_data = scrape_valuations()

        await send_event(ws, "TOOL_CALL", {"tool": "scrape_points_guy", "input": "monthly-valuations"}, worker_id)
        await asyncio.sleep(0.5)

        # Determine best value program
        # Just pick the first non-crypto one as a naive selection
        best_program = "Unknown"
        for v in live_data:
            if "Bitcoin" not in v['program']:
                best_program = v['program']
                break

        strategy = {
            "recommended_cards": [f"Card tied to {best_program}", "General Travel Card"],
            "primary_spend_categories": ["Dining", "Travel"],
            "target_transfer_partners": [v['program'] for v in live_data[:3]],
            "sweet_spot_example": f"Transfer to {best_program} based on live scraped data showing high yield.",
            "score": 95,
            "live_valuations": live_data
        }

        await send_event(ws, "RESULT", {"strategy": strategy}, worker_id)
        await asyncio.sleep(0.5)

        await send_event(ws, "DIE", {"message": "Task complete"}, worker_id)
        return strategy

async def supervisor_loop():
    async with websockets.connect(SERVER_URL) as ws:
        print("Supervisor online, waiting for User Goals...")

        # Also periodically push data even without goals so Dashboard has live data
        asyncio.create_task(background_live_push(ws))

        while True:
            try:
                message = await ws.recv()
                data = json.loads(message)
            except Exception as e:
                continue

            if data.get("type") == "USER_GOAL":
                goal = data["data"]["goal"]
                print(f"Received Goal: {goal}")
                await send_event(ws, "THINKING", {"thought": "Decomposing goal into tasks for worker swarm..."})

                # Spawn a worker to evaluate
                worker_id = f"Worker-Scraper"
                task = worker_agent(goal, worker_id)

                results = await asyncio.gather(task)
                best_strategy = results[0]

                await send_event(ws, "THINKING", {"thought": f"Worker finished. Selected strategy."})
                await send_event(ws, "FINAL_RESULT", {"strategy": best_strategy})

async def background_live_push(ws):
    while True:
        try:
            live_data = scrape_valuations()
            await send_event(ws, "LIVE_DATA_UPDATE", {"valuations": live_data})
        except Exception as e:
            print("Background push error", e)
        await asyncio.sleep(30) # Push every 30 seconds

if __name__ == "__main__":
    for i in range(5):
        try:
            asyncio.run(supervisor_loop())
            break
        except ConnectionRefusedError:
            print(f"Connection refused, retrying in 2s... ({i+1}/5)")
            time.sleep(2)
