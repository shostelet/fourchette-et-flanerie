from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def create_engine(url: str) -> AsyncEngine:
    # pool_pre_ping: a connection dropped by PostgreSQL (restart, idle timeout)
    # is replaced instead of failing the next request.
    return create_async_engine(url, pool_pre_ping=True)


class Database:
    """The engine and the session factory, created once per application."""

    def __init__(self, url: str) -> None:
        self.engine = create_engine(url)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    async def session(self) -> AsyncIterator[AsyncSession]:
        async with self.sessions() as session:
            yield session

    async def dispose(self) -> None:
        await self.engine.dispose()
