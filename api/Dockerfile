# --- Build: dependencies and the app in a virtual environment, with uv ---
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS build
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app

# Dependencies first: this layer stays cached while only the code changes.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

# --- Run: the virtual environment only, as a non-root user ---
FROM python:3.13-slim-bookworm
RUN useradd --system --uid 10001 --no-create-home fourchette
WORKDIR /app
COPY --from=build --chown=fourchette:fourchette /app /app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
USER fourchette
EXPOSE 8000
# Behind Caddy: trust its X-Forwarded-* headers (client IP for the rate limits).
CMD ["uvicorn", "fourchette_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
