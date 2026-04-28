import asyncio
import websockets
import json
import time
import random

SERVER_URL = "ws://localhost:8080"

CARDS = ["Amex Gold", "Chase Sapphire Preferred", "Capital One Venture X", "Bilt Mastercard", "Amex Platinum"]
AIRLINES = ["United Airlines", "Delta SkyMiles", "American Airlines", "Air Canada Aeroplan", "Virgin Atlantic"]
HOTELS = ["Hyatt", "Marriott", "Hilton", "IHG"]

AGENTS_METADATA = {
    "Scout": {"role": "Data Recon", "level": 3, "xp": 240, "skills": ["ListingCrawl", "PriceCalc"]},
    "Analyst": {"role": "Market Intel", "level": 5, "xp": 380, "skills": ["TrendAnalysis"]},
    "Executor": {"role": "Reports & Actions", "level": 4, "xp": 290, "skills": ["ReportGen"]},
    "Auditor": {"role": "QA & Risk", "level": 2, "xp": 90, "skills": ["RiskAssess"]}
}

async def send_event(websocket, type, data, agentId="Summoner"):
    event = {
        "type": type,
        "data": data,
        "agentId": agentId,
        "timestamp": time.time()
    }
    await websocket.send(json.dumps(event))

async def specialized_agent(ws, agent_name, goal):
    meta = AGENTS_METADATA[agent_name]
    await send_event(ws, "SPAWN", {"role": meta["role"], "level": meta["level"], "xp": meta["xp"]}, agent_name)
    await asyncio.sleep(random.uniform(0.5, 1.0))

    # Simulate Skill Usage
    skill = random.choice(meta["skills"])
    await send_event(ws, "SKILL_USE", {"skill": skill, "action": f"Executing {skill} protocol"}, agent_name)
    await send_event(ws, "THINKING", {"thought": f"Applying {skill} to user goal"}, agent_name)
    await asyncio.sleep(random.uniform(1.0, 2.0))

    # Simulate Tool Call
    await send_event(ws, "TOOL_CALL", {"tool": f"{skill}_API"}, agent_name)
    await asyncio.sleep(random.uniform(0.5, 1.0))

    # Return partial result
    await send_event(ws, "RESULT", {"status": "Complete", "xp_gained": random.randint(10, 50)}, agent_name)
    await asyncio.sleep(0.5)

    # Agent dies/sleeps
    await send_event(ws, "DIE", {"message": "Task complete. Entering hibernation."}, agent_name)

    return {"agent": agent_name, "contribution": f"{agent_name} data collected"}

async def supervisor_loop():
    async with websockets.connect(SERVER_URL) as ws:
        print("Summoner online, waiting for User Goals...")
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
                await send_event(ws, "THINKING", {"thought": "Routing tasks • monitoring state • injecting shared context"})

                # CORAL Memory access
                await send_event(ws, "MEMORY_ACCESS", {"action": "Retrieving historical attempts from CORAL SQLite"}, "Summoner")
                await asyncio.sleep(0.5)

                # Execute agents in sequence/parallel
                tasks = [
                    specialized_agent(ws, "Scout", goal),
                    specialized_agent(ws, "Analyst", goal)
                ]
                await asyncio.gather(*tasks)

                await specialized_agent(ws, "Executor", goal)
                await specialized_agent(ws, "Auditor", goal)

                # Self-Improvement Loop Trigger
                await send_event(ws, "SELF_IMPROVEMENT", {"action": "Nightly reflection • Prompt evolution • A-Evolve pattern"}, "Summoner")

                # Final result generation
                cards = random.sample(CARDS, 2)
                airline = random.choice(AIRLINES)
                hotel = random.choice(HOTELS)

                best_strategy = {
                    "recommended_cards": cards,
                    "primary_spend_categories": ["Dining", "Travel"],
                    "target_transfer_partners": [airline, hotel],
                    "sweet_spot_example": f"Transfer to {airline} to fly first class. Book {hotel} for stay.",
                    "score": random.randint(85, 99)
                }

                await send_event(ws, "THINKING", {"thought": f"All agents finished. Compiling final strategy."})
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
