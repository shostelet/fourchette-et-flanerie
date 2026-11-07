from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from fourchette_api.deps import get_session

router = APIRouter(tags=["supervision"])


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["ok", "unreachable"]
    version: str


@router.get("/health")
async def health(
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Health:
    """Is the API up, and can it reach PostgreSQL? Used by the uptime probe and the deployment."""
    try:
        await session.execute(text("SELECT 1"))
        database: Literal["ok", "unreachable"] = "ok"
    except (SQLAlchemyError, OSError):
        database = "unreachable"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return Health(
        status="ok" if database == "ok" else "degraded",
        database=database,
        version=request.app.version,
    )
