from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

DEMO_EMAIL = "demo@zenith.test"


async def resolve_demo_user_id(session: AsyncSession) -> UUID:
    res = await session.execute(
        text("SELECT id FROM users WHERE email = :email LIMIT 1"),
        {"email": DEMO_EMAIL},
    )
    row = res.first()
    if not row:
        raise HTTPException(
            status_code=503,
            detail="Demo user missing; run scripts/seed.py",
        )
    return row[0]
