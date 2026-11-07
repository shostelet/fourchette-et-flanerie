from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from importlib.metadata import version

from fastapi import FastAPI

from fourchette_api.config import Settings, get_settings
from fourchette_api.db import Database
from fourchette_api.routes import health


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.database = Database(settings.database_url)
        yield
        await app.state.database.dispose()

    app = FastAPI(
        title="Fourchette & Flânerie",
        version=version("fourchette-api"),
        lifespan=lifespan,
        # The interactive docs are for development only.
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.environment != "production" else None,
    )
    app.include_router(health.router)
    return app


app = create_app()
