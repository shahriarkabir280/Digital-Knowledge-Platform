---
{
  "id": "file_bmxzc1q7",
  "filetype": "document",
  "filename": "README",
  "created_at": "2026-04-09T16:22:01.868Z",
  "updated_at": "2026-04-09T16:22:01.869Z",
  "meta": {
    "location": "/",
    "tags": [],
    "categories": [],
    "description": "",
    "source": "markdown"
  }
}
---
# Digital-Knowledge-Platform
A modern Digital Knowledge Platform for creating, organizing, and sharing academic resources in a structured, searchable, and collaborative environment.

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Git
- Supabase account (https://supabase.com)

Check versions:

```bash
node -v
npm -v
git --version
```

## Project Structure

- [frontend](frontend): Frontend application source (UI, pages, components).
- [backend](backend): Backend API and business logic.
- [shared](shared): Shared constants, types, and reusable contracts.
- [docs](docs): Project documentation and design notes.
- [infra](infra): Infrastructure and deployment-related files.
- [scripts](scripts): Utility scripts for local setup and automation.
- [to_do_for_tamim.md](to_do_for_tamim.md): Sprint and implementation task plan.
- [understanding.md](understanding.md): Project understanding notes.
- [.env.example](.env.example): Root environment variable template.

## Quick Start (New User)

1. Clone the repository:

```bash
git clone https://github.com/shahriarkabir280/Digital-Knowledge-Platform.git
cd Digital-Knowledge-Platform
```

2. Go to frontend app:

```bash
cd frontend
```

3. Create frontend environment file:

```bash
cp .env.example .env
```

4. Install dependencies:

```bash
npm install
```

5. Run development server:

```bash
npm run dev
```

6. Open in browser:

```text
http://localhost:5173/
```

Stop the server anytime with `Ctrl + C`.

## Backend Setup and Run

1. Open a new terminal and go to backend:

```bash
cd backend
```

2. Create backend environment file:

```bash
cp .env.example .env
```

3. Get Supabase connection string:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings → Database
   - Copy the connection string under "JDBC" or "PostgreSQL"
   - Paste into `backend/.env` as `DATABASE_URL`

4. Install dependencies:

```bash
npm install
```

5. Run backend in development mode:

```bash
npm run dev
```

6. Verify backend is running:

```text
http://localhost:3000/health
http://localhost:3000/api/status
```

Stop backend with `Ctrl + C`.

## Run Frontend and Backend Together

Use two terminals:

- Terminal 1:

```bash
cd frontend
npm run dev
```

- Terminal 2:

```bash
cd backend
npm run dev
```

Note: You can now run `npm run dev` from the repo root, or run `npm run dev` separately from `frontend` and `backend` folders.

## Database Setup (Supabase)

1. Create a Supabase project at https://supabase.com
2. Go to Project Settings → Database
3. Copy the connection string (PostgreSQL URI)
4. Paste it into `backend/.env` as `DATABASE_URL`
5. The backend will automatically connect on startup

## Useful Commands (Frontend)

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run lint checks
```

## Troubleshooting

- Port already in use:

```bash
npm run dev -- --port 5174
```

- If dependencies fail to install, remove lock and retry:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Current Status

- Frontend scaffold is ready and runnable.
- Backend API is runnable with Supabase connectivity.
- Core database functionality is in place.

## Local Run and Deploy Note

- Local development currently runs with two terminals (`frontend` and `backend`) using `npm run dev`.
- Database is managed by Supabase - no local Docker services needed.
- Simple, clean setup focused on Supabase.
