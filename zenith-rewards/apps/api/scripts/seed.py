import asyncio
import os
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from passlib.context import CryptContext

pwd_context =CryptContext(schemes=["bcrypt"], deprecated="auto")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://zenith:zenith@localhost:5432/zenith")
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

VALUATIONS = [
    ("Chase Ultimate Rewards", "bank_points", 1.5, 2.0, 2.5),
    ("Amex Membership Rewards", "bank_points", 1.5, 2.0, 2.5),
    ("Citi ThankYou Points", "bank_points", 1.4, 1.7, 2.2),
    ("Capital One Miles", "bank_points", 1.0, 1.7, 2.0),
    ("Bilt Rewards", "bank_points", 1.5, 2.0, 2.5),
    ("United MileagePlus", "airline", 1.0, 1.5, 2.0),
    ("Delta SkyMiles", "airline", 0.9, 1.3, 1.8),
    ("American AAdvantage", "airline", 1.0, 1.5, 2.0),
    ("Southwest Rapid Rewards", "airline", 1.3, 1.5, 1.8),
    ("Alaska Mileage Plan", "airline", 1.3, 1.8, 2.5),
    ("British Airways Avios", "airline", 1.0, 1.8, 2.5),
    ("Marriott Bonvoy", "hotel", 0.5, 0.8, 1.2),
    ("Hilton Honors", "hotel", 0.3, 0.6, 0.8),
    ("World of Hyatt", "hotel", 1.2, 1.8, 2.5),
    ("IHG One Rewards", "hotel", 0.4, 0.7, 1.0),
    ("Wyndham Rewards", "hotel", 0.7, 1.1, 1.5),
    ("Wells Fargo Rewards", "bank_points", 1.0, 1.0, 1.0),
    ("Discover Cashback", "cashback", 1.0, 1.0, 1.0),
    ("Bank of America Travel Rewards", "bank_points", 1.0, 1.0, 1.5),
    ("Bilt Rent Day Bonus", "rent_rewards", 2.0, 2.5, 3.0),
]

CARDS = [
    ("Chase Sapphire Preferred", "Chase", 95.0, 60000, None, 4000.0, 3),
    ("Chase Sapphire Reserve", "Chase", 550.0, 60000, None, 4000.0, 3),
    ("Amex Gold", "Amex", 250.0, 60000, None, 6000.0, 6),
    ("Amex Platinum", "Amex", 695.0, 80000, None, 8000.0, 6),
    ("Citi Premier", "Citi", 95.0, 60000, None, 4000.0, 3),
    ("Capital One Venture X", "Capital One", 395.0, 75000, None, 4000.0, 3),
    ("Bilt Mastercard", "Wells Fargo", 0.0, 0, None, 0.0, 0),
    ("Chase Freedom Unlimited", "Chase", 0.0, None, 200.0, 500.0, 3),
    ("Discover it Cash Back", "Discover", 0.0, None, 0.0, 0.0, 0),
    ("Wells Fargo Autograph", "Wells Fargo", 0.0, 20000, None, 1000.0, 3)
]

async def seed():
    async with AsyncSessionLocal() as session:
        # Seed point valuations
        for v in VALUATIONS:
            await session.execute(text(f"""
                INSERT INTO point_valuations (program_name, program_type, cpp_low, cpp_default, cpp_high, source)
                VALUES ('{v[0]}', '{v[1]}', {v[2]}, {v[3]}, {v[4]}, 'admin_seed')
                ON CONFLICT DO NOTHING
            """))

        # Seed market cards
        metadata_json = json.dumps({"requires_issuer_verification": True, "apr_source": "verify_on_issuer_site"})
        for c in CARDS:
            wb_pts = f"{c[3]}" if c[3] is not None else "NULL"
            wb_cash = f"{c[4]}" if c[4] is not None else "NULL"
            await session.execute(text(f"""
                INSERT INTO market_cards (card_name, issuer, annual_fee, welcome_bonus_points, welcome_bonus_cash, spend_requirement, spend_window_months, verification_status, confidence, reward_rules)
                VALUES ('{c[0]}', '{c[1]}', {c[2]}, {wb_pts}, {wb_cash}, {c[5]}, {c[6]}, 'admin_seeded', 0.70, '{metadata_json}'::jsonb)
                ON CONFLICT DO NOTHING
            """))

        # Create demo user
        hashed_password = pwd_context.hash("Demo1234!")
        res = await session.execute(text(f"""
            INSERT INTO users (email, hashed_password, full_name)
            VALUES ('demo@zenith.test', '{hashed_password}', 'Demo User')
            ON CONFLICT (email) DO UPDATE SET is_active=TRUE
            RETURNING id
        """))
        user_id = res.scalar()

        # User card
        await session.execute(text(f"""
            INSERT INTO user_cards (user_id, card_name, issuer, annual_fee, current_points)
            VALUES ('{user_id}', 'Chase Sapphire Preferred', 'Chase', 95.0, 65000)
        """))

        # Loyalty
        await session.execute(text(f"""
            INSERT INTO loyalty_accounts (user_id, program_type, program_name, balance, unit)
            VALUES ('{user_id}', 'airline', 'United MileagePlus', 40000, 'miles')
        """))

        # Spending
        await session.execute(text(f"""
            INSERT INTO spending_profiles (user_id, monthly_rent, monthly_dining, monthly_groceries, monthly_travel, monthly_gas)
            VALUES ('{user_id}', 1500, 600, 400, 200, 100)
            ON CONFLICT (user_id) DO NOTHING
        """))

        await session.commit()
        print("Seed complete.")

if __name__ == "__main__":
    asyncio.run(seed())
