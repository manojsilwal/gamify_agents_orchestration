import asyncio
import websockets
import json
import time
import random

SERVER_URL = "ws://localhost:8080"

dashboard_data = {
    "total_value": 1248500,
    "cash_equivalent": 18727.50,
    "ytd_growth": 12.4,
    "categories": [
        {"name": "Travel", "percent": 65},
        {"name": "Dining", "percent": 22},
        {"name": "Shopping", "percent": 13}
    ],
    "transactions": [
        {"date": "Oct 24, 2023", "merchant": "Marriott Bonvoy Boundless", "category": "Sign-up Bonus", "amount": "$4,000.00", "yield": "+100,000"},
        {"date": "Oct 22, 2023", "merchant": "Delta Airlines Flight 482", "category": "Travel (3x)", "amount": "$450.00", "yield": "+1,350"},
        {"date": "Oct 20, 2023", "merchant": "Le Bernardin", "category": "Dining (4x)", "amount": "$320.00", "yield": "+1,280"}
    ],
    "valuations": []
}

portfolio_data = {
    "total_valuation": 42850.00,
    "programs": 8,
    "expiring_soon": "45k",
    "accounts": [
        {
            "id": 1,
            "name": "Delta SkyMiles",
            "type": "Airline",
            "balance": "452,000",
            "value": "$5,424",
            "level": "Platinum Medallion",
            "expiration": "15,000 pts · 30 Days",
            "icon": "flight_takeoff",
            "status_color": "error"
        },
        {
            "id": 2,
            "name": "Marriott Bonvoy",
            "type": "Hotel",
            "balance": "850,500",
            "value": "$6,804",
            "level": "Titanium Elite",
            "expiration": "None (Active)",
            "icon": "hotel",
            "status_color": "primary"
        },
        {
            "id": 3,
            "name": "Chase Ultimate Rewards",
            "type": "Credit Card Transferable",
            "balance": "1,200,000",
            "value": "$24,000",
            "level": "Sapphire Reserve",
            "expiration": "Points never expire",
            "icon": "credit_card",
            "status_color": "primary"
        },
        {
            "id": 4,
            "name": "United MileagePlus",
            "type": "Airline",
            "balance": "120,400",
            "value": "$1,444",
            "level": "Premier Gold",
            "expiration": "Points never expire",
            "icon": "flight",
            "status_color": "warning"
        }
    ]
}

def get_live_valuations():
    # Use hardcoded realistic valuations that slightly fluctuate to simulate a live market
    base_valuations = [
        {"program": "Chase Ultimate Rewards", "base": 2.05},
        {"program": "Amex Membership Rewards", "base": 2.0},
        {"program": "Bilt Rewards", "base": 2.05},
        {"program": "Capital One Miles", "base": 1.85},
        {"program": "Citi ThankYou Points", "base": 1.8},
        {"program": "Delta SkyMiles", "base": 1.2},
        {"program": "United MileagePlus", "base": 1.4},
        {"program": "Marriott Bonvoy", "base": 0.84},
        {"program": "Hilton Honors", "base": 0.6},
        {"program": "World of Hyatt", "base": 1.7}
    ]

    valuations = []
    for v in base_valuations:
        # Add tiny random fluctuation (-0.02 to +0.02)
        fluc = random.uniform(-0.02, 0.02)
        val = max(0.1, v["base"] + fluc)
        valuations.append({"program": v["program"], "value": f"{val:.2f} cents"})
    return valuations

async def send_event(websocket, event_type, data, agent_id="System"):
    event = {
        "type": event_type,
        "data": data,
        "agentId": agent_id,
        "timestamp": time.time()
    }
    try:
        await websocket.send(json.dumps(event))
    except Exception as e:
        print(f"Send error: {e}")

async def background_live_push(ws):
    while True:
        try:
            live_data = get_live_valuations()
            dashboard_data["valuations"] = live_data

            # Simulate point growth
            dashboard_data["total_value"] += random.randint(10, 50)
            dashboard_data["cash_equivalent"] += random.uniform(0.1, 0.5)

            # Broadcast the live dashboard and portfolio data
            await send_event(ws, "ZENITH_DATA_UPDATE", {
                "dashboard": dashboard_data,
                "portfolio": portfolio_data
            })
        except Exception as e:
            print("Background push error", e)
        await asyncio.sleep(5)

async def handle_calculations(ws, goal_data):
    amount = float(goal_data.get("amount", 50000))
    source = goal_data.get("source", "Zenith Ultimate Rewards")
    dest = goal_data.get("destination", "Global Airlines Alliance")

    await send_event(ws, "THINKING", {"thought": f"Calculating optimization for {amount} points from {source} to {dest}..."}, "Optimizer")
    await asyncio.sleep(1.0)

    # Base calculation
    ratio_multiplier = 1.0
    bonus = "-"
    cpp_val = 1.8

    if "Airlines" in dest:
        ratio_multiplier = 1.5
        bonus = "+30% Promo"
        cpp_val = 2.4
    elif "Hotel" in dest:
        ratio_multiplier = 2.0
    elif "Star Alliance" in dest and "Air Canada" in source:
        # Ultimate MVP specific path
        ratio_multiplier = 1.0
        bonus = "Partner Sweet Spot"
        cpp_val = 4.2 # extremely high yield

    ratio = f"1 : {int(1 * ratio_multiplier)}" if ratio_multiplier >= 1.0 else f"{int(1/ratio_multiplier)} : 1"
    cpp = f"{cpp_val} cpp"

    # Calculate real value dynamically based on input amount
    total_destination_points = amount * ratio_multiplier
    if "+30% Promo" in bonus:
        total_destination_points *= 1.30

    estimated_dollar_value = total_destination_points * (cpp_val / 100)

    result = {
        "path": dest,
        "ratio": ratio,
        "bonus": bonus,
        "yieldValue": cpp,
        "calculatedPoints": f"{int(total_destination_points):,}",
        "calculatedValue": f"${estimated_dollar_value:,.2f}"
    }

    await send_event(ws, "OPTIMIZATION_RESULT", {"result": result}, "Optimizer")

async def supervisor_loop():
    async with websockets.connect(SERVER_URL) as ws:
        print("Zenith Backend online, connected to WS Server.")
        asyncio.create_task(background_live_push(ws))

        while True:
            try:
                message = await ws.recv()
                data = json.loads(message)
            except Exception as e:
                continue

            if data.get("type") == "CALCULATE_OPTIMIZATION":
                await handle_calculations(ws, data["data"])

            if data.get("type") == "LINK_ACCOUNT":
                provider = data["data"].get("provider")
                print(f"Linking account for {provider}...")
                await asyncio.sleep(1.0) # simulate secure fetch

                if "Air Canada" in provider:
                    # Dynamically add the linked account to the user's portfolio
                    new_id = len(portfolio_data["accounts"]) + 1
                    portfolio_data["accounts"].append({
                        "id": new_id,
                        "name": "Air Canada Aeroplan",
                        "type": "Airline",
                        "balance": "350,000",
                        "value": "$5,250",
                        "level": "Aeroplan 50K",
                        "expiration": "18 Months",
                        "icon": "flight_takeoff",
                        "status_color": "success"
                    })

                    portfolio_data["total_valuation"] += 5250.00
                    portfolio_data["programs"] += 1

                    # Push immediate update
                    await send_event(ws, "ZENITH_DATA_UPDATE", {
                        "dashboard": dashboard_data,
                        "portfolio": portfolio_data
                    })
                    print("Air Canada Account linked and data pushed.")

            if data.get("type") == "REQUEST_ZENITH_DATA":
                await send_event(ws, "ZENITH_DATA_UPDATE", {
                    "dashboard": dashboard_data,
                    "portfolio": portfolio_data
                })

if __name__ == "__main__":
    for i in range(5):
        try:
            asyncio.run(supervisor_loop())
            break
        except ConnectionRefusedError:
            print(f"Connection refused, retrying in 2s... ({i+1}/5)")
            time.sleep(2)
