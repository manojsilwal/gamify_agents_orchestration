import asyncio
import websockets
import json
import time
import random

SERVER_URL = "ws://localhost:8080"

CARDS = ["Amex Gold", "Chase Sapphire Preferred", "Capital One Venture X", "Bilt Mastercard", "Amex Platinum"]
AIRLINES = ["United Airlines", "Delta SkyMiles", "American Airlines", "Air Canada Aeroplan", "Virgin Atlantic"]
HOTELS = ["Hyatt", "Marriott", "Hilton", "IHG"]

async def send_event(websocket, event_type, data):
    event = {
        "type": event_type,
        "data": data,
        "timestamp": time.time()
    }
    await websocket.send(json.dumps(event))
    print(f"Sent: {event_type}")

def generate_random_strategy():
    cards = random.sample(CARDS, 2)
    airline = random.choice(AIRLINES)
    hotel = random.choice(HOTELS)
    score = random.randint(50, 100) # Simulated evaluation score
    return {
        "recommended_cards": cards,
        "primary_spend_categories": ["Dining", "Travel"],
        "target_transfer_partners": [airline, hotel],
        "sweet_spot_example": f"Transfer points to {airline} for {random.randint(40, 80)}k points. Transfer to {hotel} for luxury stays.",
        "score": score
    }

async def agent_loop():
    async with websockets.connect(SERVER_URL) as websocket:
        await send_event(websocket, "SPAWN", {"message": "Autonomous Points Optimizer Agent online. Entering recursive improvement loop."})
        await asyncio.sleep(2)

        best_strategy = None
        iteration = 1
        max_iterations = 5 # Limit to 5 for demonstration purposes

        while iteration <= max_iterations:
            await send_event(websocket, "THINKING", {"step": f"Iteration {iteration}", "thought": "Generating a new potential points strategy..."})
            await asyncio.sleep(1.5)

            new_strategy = generate_random_strategy()

            await send_event(websocket, "TOOL_CALL", {"tool": "evaluate_strategy", "input": new_strategy})
            await asyncio.sleep(1.5)

            if best_strategy is None or new_strategy["score"] > best_strategy["score"]:
                await send_event(websocket, "THINKING", {"step": "Evaluate", "thought": f"New strategy is better! Score: {new_strategy['score']} > {best_strategy['score'] if best_strategy else 0}. Adopting new strategy."})
                best_strategy = new_strategy
                await asyncio.sleep(1.5)
                await send_event(websocket, "RESULT", {"strategy": best_strategy, "message": f"Found an improved strategy! (Score: {best_strategy['score']})"})
            else:
                await send_event(websocket, "THINKING", {"step": "Evaluate", "thought": f"New strategy score ({new_strategy['score']}) is not better than current best ({best_strategy['score']}). Discarding."})

            await asyncio.sleep(2)
            iteration += 1

        await send_event(websocket, "THINKING", {"step": "Finalize", "thought": "Max iterations reached. Autonomous loop completed."})

if __name__ == "__main__":
    print("Starting agent...")
    for i in range(5):
        try:
            asyncio.run(agent_loop())
            break
        except ConnectionRefusedError:
            print(f"Connection refused, retrying in 2s... ({i+1}/5)")
            time.sleep(2)
