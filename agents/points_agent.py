import asyncio
import websockets
import json
import time
import random

SERVER_URL = "ws://localhost:8080"

CARDS = ["Amex Gold", "Chase Sapphire Preferred", "Capital One Venture X", "Bilt Mastercard", "Amex Platinum"]
AIRLINES = ["United Airlines", "Delta SkyMiles", "American Airlines", "Air Canada Aeroplan", "Virgin Atlantic"]
HOTELS = ["Hyatt", "Marriott", "Hilton", "IHG"]

async def send_event(websocket, type, data, agentId="Supervisor"):
    event = {
        "type": type,
        "data": data,
        "agentId": agentId,
        "timestamp": time.time()
    }
    await websocket.send(json.dumps(event))

def generate_random_strategy(goal):
    cards = random.sample(CARDS, 2)
    airline = random.choice(AIRLINES)
    hotel = random.choice(HOTELS)
    score = random.randint(50, 100)
    return {
        "recommended_cards": cards,
        "primary_spend_categories": ["Dining", "Travel"],
        "target_transfer_partners": [airline, hotel],
        "sweet_spot_example": f"Based on '{goal[:20]}...': Transfer points to {airline} for {random.randint(40, 80)}k points. Transfer to {hotel} for luxury stays.",
        "score": score
    }

async def worker_agent(goal, worker_id):
    async with websockets.connect(SERVER_URL) as ws:
        await send_event(ws, "SPAWN", {"message": f"Worker {worker_id} online"}, worker_id)
        await asyncio.sleep(random.uniform(0.5, 1.5))

        await send_event(ws, "THINKING", {"thought": f"Analyzing combination for goal"}, worker_id)
        await asyncio.sleep(random.uniform(1.0, 2.5))

        strategy = generate_random_strategy(goal)
        await send_event(ws, "TOOL_CALL", {"tool": "evaluate_strategy"}, worker_id)
        await asyncio.sleep(random.uniform(0.5, 1.5))

        await send_event(ws, "RESULT", {"strategy": strategy}, worker_id)
        await asyncio.sleep(0.5)

        await send_event(ws, "DIE", {"message": "Task complete"}, worker_id)
        return strategy

async def supervisor_loop():
    async with websockets.connect(SERVER_URL) as ws:
        print("Supervisor online, waiting for User Goals...")
        while True:
            try:
                message = await ws.recv()
                data = json.parse(message) if isinstance(message, str) and message.startswith('{') else None
            except:
                data = None

            if data is None:
                try:
                    data = json.loads(message)
                except:
                    continue

            if data.get("type") == "USER_GOAL":
                goal = data["data"]["goal"]
                print(f"Received Goal: {goal}")
                await send_event(ws, "THINKING", {"thought": "Decomposing goal into tasks for worker swarm..."})

                # Spawn 3-5 workers to evaluate different combinations concurrently
                num_workers = random.randint(3, 5)
                tasks = []
                for i in range(num_workers):
                    worker_id = f"Worker-{random.randint(1000,9999)}"
                    tasks.append(worker_agent(goal, worker_id))

                # Wait for all workers to finish
                results = await asyncio.gather(*tasks)

                # Supervisor evaluates the best result
                best_strategy = max(results, key=lambda x: x["score"])

                await send_event(ws, "THINKING", {"thought": f"All workers finished. Selected best strategy with score {best_strategy['score']}"})
                await asyncio.sleep(1)

                await send_event(ws, "FINAL_RESULT", {"strategy": best_strategy})

if __name__ == "__main__":
    for i in range(5):
        try:
            asyncio.run(supervisor_loop())
            break
        except ConnectionRefusedError:
            print(f"Connection refused, retrying in 2s... ({i+1}/5)")
            time.sleep(2)
