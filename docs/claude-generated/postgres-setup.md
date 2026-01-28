# Local Development Setup (Postgres)

KubeForge uses PostgreSQL as its database. A Docker Compose file is provided for local development.

## Prerequisites

- Docker and Docker Compose
- Node.js 20+

## Quick Start

```bash
# One-command setup
./scripts/setup.sh
```

Or manually:

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install dependencies
npm install

# 3. Generate Prisma client and run migrations
npm run db:setup

# 4. (Optional) Ingest Kubernetes schemas into DB
npm run db:ingest-schemas -- v1.33.3

# 5. Start dev server
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env`:

```
DATABASE_URL="postgresql://kubeforge:kubeforge@localhost:5433/kubeforge"
```

Port 5433 is used to avoid conflicts with any existing Postgres instances on the default port 5432.

## Database Management

```bash
npm run db:setup     # Generate Prisma client & run migrations
npm run db:reset     # Reset database (destroys all data)
npm run db:studio    # Open Prisma Studio GUI
```

## Schema Ingestion

To load Kubernetes schemas from the `schema-cache/` submodule into the database:

```bash
npm run db:ingest-schemas -- v1.33.3
```

This reads the filesystem cache and writes GVKs and schema data to the `kubernetes_schemas` and `schema_gvks` tables. The app falls back to filesystem loading if schemas aren't in the database.
