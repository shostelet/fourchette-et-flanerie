import os
from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from fourchette_api.config import Settings
from fourchette_api.main import create_app

TEST_DATABASE_URL = os.environ.get(
    "FF_TEST_DATABASE_URL",
    "postgresql+asyncpg://fourchette:fourchette@localhost:5432/fourchette_test",
)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def make_app(database_url: str = TEST_DATABASE_URL) -> FastAPI:
    return create_app(Settings(database_url=database_url, environment="test"))


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app = make_app()
    # The lifespan (database setup) runs inside the context of the router.
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client,
    ):
        yield client
