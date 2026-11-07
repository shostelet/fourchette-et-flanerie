from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from fourchette_api.db import Database


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    """One database session per request, closed at the end of it."""
    database: Database = request.app.state.database
    async for session in database.session():
        yield session
