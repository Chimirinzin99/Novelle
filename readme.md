# Novelle

Academic resource-sharing web app for CST students (Group 8, IDE201 capstone, CST – RUB).
Students share notes, question papers and assignments; programme admins review them;
a super admin manages modules and users.

The working branch is **`develop`** (not `main`).

| Folder       | Purpose                                                        |
| ------------ | -------------------------------------------------------------- |
| `frontend/`  | Next.js 16 + React 19 + Tailwind CSS 4 user interface          |
| `backend/`   | Express 5 + TypeScript API (uploads, reviews, users, login)    |
| `database/`  | Numbered SQL migrations (`database/migrations/001…`), run by hand in the Supabase SQL editor |

Database, file storage and sign-in: **Supabase** (project region Tokyo).

---

## Run it on your computer

You need Node.js 20+ and the two settings files (ask the group for the real values —
they are never on GitHub).

1. **Backend**
   ```bash
   cd backend
   npm install
   # copy .env.example to .env and fill in the values
   npm run dev          # → "Novelle backend running on http://localhost:5000"
   ```
2. **Frontend** (second terminal)
   ```bash
   cd frontend
   npm install
   # copy .env.example to .env.local and fill in the values
   npm run dev          # → http://localhost:3000
   ```

The backend must be running to log in (login goes through `POST /api/auth/login`).

Type checks: `npx tsc --noEmit` in each folder (no output = OK). Production build of
the frontend: `npm run build` (stop `npm run dev` first).

---

## Settings (environment variables)

| Where | Name | What it is |
| ----- | ---- | ---------- |
| backend | `SUPABASE_URL` | Supabase project URL |
| backend | `SUPABASE_SERVICE_ROLE_KEY` | **Secret** service role key (backend only, never in the frontend) |
| backend | `FRONTEND_URL` | Frontend address(es) allowed to call the API, comma-separated. The **first** one is used in the lockout email's reset link |
| backend | `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Optional — Gmail app password "Novelle backend" for lockout alert emails |
| backend | `PORT` | Optional — 5000 locally; hosts set it themselves |
| frontend | `NEXT_PUBLIC_BACKEND_URL` | Backend address |
| frontend | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| frontend | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |

`backend/.env.example` and `frontend/.env.example` list the same names with placeholder values.

---

## Deployment (Vercel)

Both parts run on **Vercel** (free Hobby plan) as **two Vercel projects** from this one repo.

| Setting | Backend project | Frontend project |
| ------- | --------------- | ---------------- |
| Root Directory | `backend` | `frontend` |
| Framework | Express (detected from `src/server.ts`) | Next.js |
| Production branch | `develop` | `develop` |
| Function region | **Tokyo (`hnd1`)** — next to the Supabase database | Tokyo (`hnd1`) |
| Environment variables | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL` (live frontend address first), `GMAIL_USER`, `GMAIL_APP_PASSWORD` | `NEXT_PUBLIC_BACKEND_URL` (live backend address), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Things to know:

- **PDF uploads are limited to 4 MB** (`backend/src/constants/uploads.ts`, `frontend/src/lib/uploads.ts`),
  because a request to a Vercel function can be at most 4.5 MB.
- The backend becomes one Vercel Function: it only works while answering a request, so
  anything it does (like the lockout email) must be awaited before the reply is sent.
- A push to `develop` deploys both projects automatically; other branches get preview
  addresses. A failed build keeps the last working version live; older versions can be
  restored with one click (Instant Rollback).
- Supabase → Authentication → URL Configuration: the Site URL and Redirect URLs must include
  the live `/reset-password` and `/login` addresses, or email links open the wrong page.
- Supabase's free plan pauses a project after 7 days without activity (resume it in the dashboard).
- Database migrations are **not** run by deploys — they are still run by hand in the Supabase SQL editor.