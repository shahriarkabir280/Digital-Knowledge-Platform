# Render Deployment

This project deploys to Render as three services:

- `dkp-frontend`: static React/Vite site
- `dkp-backend`: public Node/Express API
- `dkp-python-service`: public FastAPI metadata-extraction service

The root `render.yaml` defines these services for Render Blueprints.

## Required Backend Environment Variables

Set these on `dkp-backend` during Blueprint setup or in the Render dashboard:

```text
DATABASE_URL=<supabase-postgres-url>
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-refresh-secret>
PYTHON_SERVICE_URL=https://<dkp-python-service>.onrender.com
```

For a free-only Render deployment, the Python service is a public web service. After Render creates `dkp-python-service`, copy its public `onrender.com` URL and set it as `PYTHON_SERVICE_URL` on `dkp-backend`.

Optional email variables:

```text
EMAIL_PROVIDER=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Digital Knowledge Platform Library <no-reply@library.local>"
```

## Required Frontend Environment Variables

Set these on `dkp-frontend` before building:

```text
VITE_API_BASE_URL=https://<dkp-backend-service>.onrender.com/api
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Do not use `/api` for `VITE_API_BASE_URL` on Render static hosting unless you add a proxy in front of both frontend and backend.

## Notes

- The backend reads Render's `PORT` automatically, with `BACKEND_PORT` as a local fallback.
- The Python Docker image reads Render's `PORT`, with `8000` as a local Docker fallback.
- This Blueprint is free-only: frontend is a free static site, backend is a free web service, and Python metadata extraction is a free web service.
- Free web services spin down after idle time, so the first metadata extraction after inactivity can be slow.
- Render private services do not have a free plan. If you later want the Python service hidden from the public internet, change it to `type: pserv` and use a paid compute plan.
- Render free web services cannot send SMTP on common mail ports such as `587`; use a paid plan or a provider/API that works with Render's networking limits if production email is required.
