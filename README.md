# SyncWalk

SyncWalk is a full-stack audio tour platform with solo and group listening modes.

## Tech stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Zustand, Socket.IO client
- Backend: FastAPI, SQLAlchemy, Alembic, Redis, Socket.IO server
- Infrastructure: Docker Compose, Nginx
- Payments: WayForPay

## Project structure

- `frontend` - web app for authentication, tours, payments, and room sessions
- `backend` - API, business logic, websocket handling, and database migrations
- `nginx` - reverse proxy and SSL-related configuration
- `scripts` - deployment, backup, restore, and SSL helper scripts
- `docs` - project documentation and operational notes

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ with `pnpm` (for local frontend development without Docker)
- Python 3.11+ (for local backend development without Docker)

## Environment setup

1. Copy `.env.example` to `.env`.
2. Fill in required values for database, Redis, JWT, and WayForPay credentials.
3. Verify `NEXT_PUBLIC_API_URL` and backend domain-related variables match your environment.

## Run with Docker

```bash
docker compose up --build
```

Default services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

## Local development

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
pnpm install
pnpm dev
```

## Database migrations

```bash
cd backend
alembic upgrade head
```

## Useful scripts

- `scripts/deploy.sh` - deployment helper
- `scripts/backup-db.sh` - backup PostgreSQL data
- `scripts/restore-db.sh` - restore PostgreSQL data
- `scripts/setup-ssl.sh` - request SSL certificates

## Notes

- Keep `.env` out of version control.
- Payment callbacks depend on reachable public backend URLs.
- Group room synchronization depends on Redis and websocket connectivity.
