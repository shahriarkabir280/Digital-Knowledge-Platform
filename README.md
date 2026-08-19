# Digital Knowledge Platform

A modern digital library and knowledge-management platform for creating, organizing, and sharing academic resources in a structured, searchable, and collaborative environment.

The platform combines a document repository, circulation/loan system, project showcase, and role-based collaboration workflows, backed by a Node.js API, a Python metadata-extraction microservice, and Supabase (PostgreSQL) for data and auth.

**Live demo:** [https://csedu-dkp.farefin.com/library](https://csedu-dkp.farefin.com/library)

**Demo credentials:**

| Role | Email | Password |
|---|---|---|
| General Member | `hlw@cs.du.ac.bd` | `12345678` |
| Staff | `staff@cs.du.ac.bd` | `12345678` |

> Registration is restricted to institutional emails — new accounts must use an email ending in `@cs.du.ac.bd`.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running with Docker](#running-with-docker)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Database](#database)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

## Features

- **Digital Library** — upload, browse, search, and view academic documents (PDF, DOCX, PPTX, audio, video, images) with an in-browser viewer.
- **Search & Discovery** — full-text and metadata-driven search across the resource catalog.
- **Circulation & Loans** — catalog/circulation tracking, due-date tracking, and automated fine calculation via background jobs.
- **Collaboration & Projects** — student project showcase, project moderation, and collaborative workspaces.
- **Role-Based Access Control** — Admin, Staff, Member/Student roles with dedicated dashboards, a role-request workflow, and moderation/review queues.
- **Book Donation Tracking** — donate and track physical/digital book donations.
- **Notifications** — in-app and email notifications (SMTP-based).
- **Automated Metadata Extraction** — a Python microservice extracts text, classifies documents, and generates keywords/metadata using scikit-learn and YAKE.
- **Analytics & Activity** — library analytics and activity dashboards for staff/admins.
- **API Documentation** — interactive Swagger/OpenAPI docs generated from the route definitions.

## Architecture

```
                      ┌────────────────────┐
                      │      Frontend       │
                      │  React + Vite (SPA) │
                      └──────────┬──────────┘
                                 │ REST (JSON)
                      ┌──────────▼──────────┐
                      │       Backend        │
                      │  Node.js + Express   │
                      │  (auth, library,     │
                      │   loans, projects,   │
                      │   search, users...)  │
                      └──────┬───────┬───────┘
                             │       │
              ┌──────────────┘       └───────────────┐
   ┌──────────▼──────────┐               ┌────────────▼───────────┐
   │  Supabase / Postgres │               │  Python Metadata Svc   │
   │  (DB, Auth, Storage) │               │  FastAPI + scikit-learn│
   └───────────────────────┘               └────────────────────────┘
```

- **frontend** — React SPA that talks to the backend over a REST API.
- **backend** — Express API that owns business logic, auth (JWT), file uploads, and background jobs (due-date tracking, fine calculation), and persists to Postgres/Supabase via Knex.
- **python-service** — FastAPI microservice used by the backend for document text extraction and ML-based classification/keyword extraction.
- **shared** — types, constants, and validation schemas shared between frontend and backend.

## Tech Stack

**Frontend**
- React 19, Vite, React Router
- Tailwind CSS, Radix UI, shadcn-style components
- TanStack Query & TanStack Table
- React Hook Form + Zod
- react-pdf / pdfjs-dist for document viewing

**Backend**
- Node.js, Express 5
- Knex.js + PostgreSQL (Supabase)
- JWT-based authentication, bcrypt password hashing
- Multer for uploads, ExcelJS/PDFKit/json2csv for exports, Nodemailer for email
- node-cron for scheduled jobs
- Swagger UI (OpenAPI) for API docs

**Metadata/ML Service**
- Python, FastAPI, Uvicorn
- scikit-learn, pandas, YAKE (keyword extraction)
- SQLAlchemy + psycopg2

**Infrastructure**
- Docker & Docker Compose
- Nginx (serving the production frontend build)
- Supabase (managed Postgres, Auth, Storage)

## Project Structure

```
Digital-Knowledge-Platform/
├── frontend/                # React SPA
│   ├── src/
│   │   ├── pages/           # Route-level pages (library, admin, staff, member, auth...)
│   │   ├── modules/         # Feature modules (auth, library, search, repository)
│   │   ├── components/      # Reusable UI components
│   │   ├── services/api/    # API client layer
│   │   └── routes/          # Route definitions
│   └── Dockerfile
├── backend/                 # Express API
│   ├── src/
│   │   ├── modules/         # Feature modules: auth, users, library, loans,
│   │   │                    #   documents, projects, search, collaboration,
│   │   │                    #   roleRequests, profile
│   │   ├── api/              # Route index, controllers, validators, middlewares, OpenAPI docs
│   │   ├── db/                # Knex instance, migrations, repositories
│   │   ├── jobs/              # Scheduled jobs (due tracking, fine calculation)
│   │   ├── services/          # Cross-cutting services
│   │   └── config/            # App configuration
│   ├── python-service/       # FastAPI metadata-extraction microservice
│   ├── scripts/               # SQL schema/migration scripts
│   └── Dockerfile
├── shared/                   # Shared types, constants, and validation schemas
├── docs/                     # SRS and SDD documentation (LaTeX + PDF)
├── scripts/                  # Repo-level dev/bootstrap/lint/test scripts
├── docker-compose.yml         # Multi-service local orchestration
└── package.json               # Root scripts for running the whole stack
```

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Python 3.11+ (only if running the metadata-extraction service outside Docker)
- Git
- A [Supabase](https://supabase.com) account/project (managed Postgres + Auth)
- Docker & Docker Compose (optional, for containerized runs)

Check your versions:

```bash
node -v
npm -v
git --version
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/shahriarkabir280/Digital-Knowledge-Platform.git
cd Digital-Knowledge-Platform
```

### 2. Bootstrap the project

This installs dependencies for both `frontend` and `backend`, and creates `.env` files from the provided examples:

```bash
npm run bootstrap
```

### 3. Configure environment variables

Fill in `backend/.env` and `frontend/.env` — see [Environment Variables](#environment-variables) below. At minimum you need a Supabase `DATABASE_URL` in `backend/.env`.

### 4. Run the full stack

From the repository root:

```bash
npm run dev
```

This starts the backend and frontend dev servers together (via `scripts/dev`) and shuts both down together on exit (`Ctrl + C`).

Alternatively, run them separately in two terminals:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### 5. Open the app

```text
Frontend:      http://localhost:5173
Backend API:   http://localhost:3000/api
Health check:  http://localhost:3000/health
API docs:      http://localhost:3000/api-docs
```

## Environment Variables

### `backend/.env`

| Variable | Description |
|---|---|
| `BACKEND_PORT` | Port the API listens on (default `3000`). |
| `DATABASE_URL` | Supabase/PostgreSQL connection string (Project Settings → Database). |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Access token secret and expiry. |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | Refresh token secret and expiry. |
| `UPLOAD_MAX_SIZE_MB` | Max upload size in MB (default `500`). |
| `UPLOAD_DIR` | Directory for uploaded files (default `./uploads`). |
| `UPLOAD_ALLOWED_EXTENSIONS` | Allowed file extensions for uploads. |
| `UPLOAD_STRICT_MIME_VALIDATION` | Enforce MIME-type validation on uploads. |
| `UPLOAD_TEMP_CLEANUP_HOURS` | Age (in hours) at which temp uploads are cleaned up. |
| `PYTHON_SERVICE_URL` | URL of the metadata-extraction microservice. |
| `EMAIL_PROVIDER` | Set to `smtp` to enable email notifications; leave blank for console logging. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP credentials for outgoing email. |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL the frontend uses to reach the backend API (default `/api`). |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key. |

> **Note:** The committed `.env.example` files currently contain live-looking Supabase credentials rather than placeholders. Treat these as sensitive, rotate them if they are real, and replace them with placeholder values before making the repository public.

## Running with Docker

The `docker-compose.yml` at the repo root orchestrates all three services:

```bash
docker compose up --build
```

| Service | Container | Port |
|---|---|---|
| `backend` | `dkp-backend` | `3000` |
| `python-service` | `dkp-python-service` | `8000` |
| `frontend` (Nginx) | `dkp-frontend` | `8089` → `80` |

The backend and Python service both read their configuration from `backend/.env`. No local Postgres container is required — the database is managed by Supabase.

## Available Scripts

**Root** (`package.json`, delegates to `scripts/`):

```bash
npm run bootstrap   # Install backend + frontend dependencies, create .env files
npm run dev          # Run backend + frontend dev servers together
npm run lint          # Run lint in backend + frontend (if configured)
npm run test           # Run tests in backend + frontend (if configured)
```

**Frontend** (`frontend/package.json`):

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview the production build
npm run lint       # ESLint checks
```

**Backend** (`backend/package.json`):

```bash
npm run dev     # Start API with nodemon (auto-reload)
npm run start   # Start API in production mode
```

## API Documentation

The backend exposes an interactive OpenAPI/Swagger UI, generated programmatically from the Express route definitions:

```text
http://localhost:3000/api-docs
```

Core routes are namespaced under `/api` (library, users, loans, projects, search, collaboration, role requests, profile), with authentication endpoints under `/auth`. A `/health` endpoint is available for liveness checks.

## Database

- The database is a managed **Supabase (PostgreSQL)** instance — no local Postgres container is required.
- Schema migrations and setup SQL live in [backend/scripts](backend/scripts) (e.g. `consolidated_schema.sql`, feature-specific migration scripts) and [backend/src/db/migrations](backend/src/db/migrations) (Knex migrations).
- Configure the connection via `DATABASE_URL` in `backend/.env`; the backend connects automatically on startup (`db.ping()` in [backend/src/server.js](backend/src/server.js)).

## Troubleshooting

**Port already in use**

```bash
# Frontend
npm run dev -- --port 5174
```

```bash
# Backend — change BACKEND_PORT in backend/.env
```

**Dependency install issues**

```bash
rm -rf node_modules package-lock.json
npm install
```

**Backend fails to start / can't reach the database**

- Confirm `DATABASE_URL` in `backend/.env` is correct and the Supabase project is active.
- Check `http://localhost:3000/health` for a status response once the server is running.

## Documentation

Detailed requirements and design documentation is available in [docs](docs):

- [SRS_V2_0.pdf](docs/SRS_V2_0.pdf) / [srs.tex](docs/srs.tex) — Software Requirements Specification
- [SDD_v1.0.pdf](docs/SDD_v1.0.pdf) / [sdd.tex](docs/sdd.tex) — Software Design Document
