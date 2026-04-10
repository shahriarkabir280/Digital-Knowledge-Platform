# Backend Setup

This backend uses PostgreSQL with Knex for query access and migrations.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose

## Local Database

Start PostgreSQL:

```bash
docker compose up -d db
```

The default database settings come from `backend/.env.example`:

```text
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dkp
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
```

## Install Dependencies

```bash
cd backend
npm install
```

## Migration Commands

```bash
npm run db:migrate
npm run db:rollback
npm run db:seed
npm run db:smoke
```

## Run the Backend

```bash
npm run dev
```

The API health endpoint checks the database connection and should return a `database: connected` field when PostgreSQL is reachable.

## Core Schema

The first migration creates these tables:

- users
- labs
- documents
- metadata
- research_papers
- annotations
- items
- loans
- citations

## Notes

- Schema changes should always go through migrations.
- Use the repository modules under `src/db/repositories` for user, document, and loan write paths.