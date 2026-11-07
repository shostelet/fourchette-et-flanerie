# API Fourchette & Flânerie

FastAPI + PostgreSQL. Voir le plan : étapes, choix et conventions.

## Lancer en local

Depuis la racine du dépôt :

```sh
docker compose up --build      # API sur http://localhost:8000, Mailpit sur http://localhost:8025
```

- Documentation interactive : http://localhost:8000/docs
- Santé : http://localhost:8000/health
- Le code de `api/src` est monté dans le conteneur : il se recharge à chaque enregistrement.

## Développer sans Docker pour l'API

PostgreSQL tourne toujours dans Docker (`docker compose up db`), l'API sur ta machine :

```sh
cd api
uv sync                       # crée .venv et installe tout (dont les outils de dev)
cp .env.example .env
uv run uvicorn fourchette_api.main:app --reload
```

## Vérifications (les mêmes que la CI)

```sh
uv run ruff check .           # lint
uv run ruff format .          # formatage (--check en CI)
uv run mypy src tests         # types, mode strict
uv run pytest                 # tests : base fourchette_test (créée par docker compose)
```

## Dépendances

`uv add <paquet>` (ou `uv add --dev <paquet>`) met à jour `pyproject.toml` et `uv.lock`.
Les deux fichiers se committent ensemble.
