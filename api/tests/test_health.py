import pytest
from httpx import ASGITransport, AsyncClient

from fourchette_api.config import Settings
from fourchette_api.main import create_app
from tests.conftest import make_app

pytestmark = pytest.mark.anyio


async def test_health_is_ok_with_the_database(client: AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["version"]


async def test_health_reports_an_unreachable_database() -> None:
    # Nothing listens on port 1: the database can't be reached.
    app = make_app("postgresql+asyncpg://nobody:nothing@127.0.0.1:1/none")
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.get("/health")

    assert response.status_code == 503
    assert response.json()["database"] == "unreachable"


async def test_docs_are_hidden_in_production() -> None:
    app = create_app(Settings(environment="production"))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.get("/docs")).status_code == 404
        assert (await client.get("/openapi.json")).status_code == 404
