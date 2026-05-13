# Backend Setup

This backend uses Supabase (PostgreSQL) with Knex for query access.

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase account (https://supabase.com)

## Supabase Setup

1. Create a new project in Supabase
2. Get your database connection string from: Project Settings → Database
3. Copy it to `backend/.env` as `DATABASE_URL`

Example:
```
DATABASE_URL=postgresql://postgres:your_password@db.your_project.supabase.co:5432/postgres
```

## Install Dependencies

```bash
cd backend
npm install
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