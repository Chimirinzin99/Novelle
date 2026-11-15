# Novelle

**Share · Learn · Grow.** An academic resource-sharing web app for students of the
College of Science and Technology (CST), Royal University of Bhutan.

Students share notes, question papers, assignments and YouTube study videos for their
programme's modules. Programme admins review every upload before it is published, and a
super admin manages programmes' modules and user accounts.

Group 8 · IDE201 capstone project · CST – RUB · 2026

- **Live site:** https://novelle-lyart.vercel.app
- **Backend API:** https://novelle-backend-five.vercel.app
- **Working branch:** `develop` (deployed live). `main` holds release snapshots.

---

## Features

**Everyone**
- Sign up and log in with a CST email only (`<student number>.cst@rub.edu.bt` or a
  name-style staff address); other emails are refused by the app *and* the database.
- Password strength meter, show/hide password, password reset by email.
- Account lockout: 5 wrong passwords within 15 minutes → 15-minute wait, plus an alert email.
- Light/dark theme, adjustable text size and reduced motion (Settings).
- Edit your own display name.

**Students**
- Browse any programme's resources by type: Notes, Question Papers, Assignments, Videos,
  filtered by year, semester, module and (for papers/assignments) solved/unsolved,
  grouped by module, with "Load more".
- Search by title, module name or module code.
- Like resources ("Liked" page) and see how many students liked each one.
- Preview PDFs in the app or download them.
- Submit a PDF (up to 4 MB) for review, credited to yourself, someone else or unknown.
  Follow its status on "My Submissions" and get a notification when it is approved or rejected
  (with a reason).
- Lecturers (name-style CST emails) can request admin access from their Profile; the
  request is emailed to the super admins.

**Programme admins** (one programme each)
- Review pending submissions for their programme: preview, choose the module, approve or
  reject with a reason.
- Upload PDFs and add YouTube videos directly.
- Manage their programme's modules and resources (edit, move, delete).

**Super admin**
- Everything a programme admin can do, for all programmes.
- Dashboard with overall statistics.
- Manage users: change roles (student / programme admin / super admin), deactivate and
  reactivate accounts. Lecturers are labelled so they can be promoted.

**Security highlights**
- Row Level Security on every table; deactivated accounts can read nothing.
- All writes except likes and marking notifications read go through the backend, which
  checks the user's role on every request.
- The service-role key lives only in the backend; the browser only has the public anon key.
- Uploaded files sit in a private storage bucket and are opened through short-lived signed links.

---

## Tech stack

| Part | Built with |
| ---- | ---------- |
| `frontend/` | Next.js 16 (App Router, React Compiler) · React 19 · TypeScript · Tailwind CSS 4 |
| `backend/` | Express 5 · TypeScript · Multer (uploads) · Nodemailer via Brevo SMTP (emails) |
| Database, auth, storage | Supabase (PostgreSQL with Row Level Security, Supabase Auth, Storage) — region Tokyo |
| Hosting | Vercel (two projects: frontend and backend) — region Tokyo |

```
Novelle/
├── frontend/          Next.js app (pages in src/app, shared parts in src/components and src/lib)
├── backend/           Express API (src/routes → src/controllers, src/middleware for auth/roles)
└── database/
    ├── migrations/    001_…sql to 019_…sql, run in order
    └── schema.sql     snapshot of the whole schema (reference only)
```

---

## Run it on your computer

You need **Node.js 20+** and the two settings files (ask the group for the real values —
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

**Checks before pushing**

| Command | Where | Expect |
| ------- | ----- | ------ |
| `npx tsc --noEmit` | `frontend/` and `backend/` | no output = OK |
| `npm run lint` | `frontend/` | no problems |
| `npm run build` | `frontend/` (stop `npm run dev` first) | build succeeds |

---

## Settings (environment variables)

| Where | Name | What it is |
| ----- | ---- | ---------- |
| backend | `SUPABASE_URL` | Supabase project URL |
| backend | `SUPABASE_SERVICE_ROLE_KEY` | **Secret** service role key (backend only, never in the frontend) |
| backend | `FRONTEND_URL` | Frontend address(es) allowed to call the API, comma-separated. The **first** one is used in email links |
| backend | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Mail server for the lockout alert and admin-request emails (Brevo: `smtp-relay.brevo.com`, port 587, Brevo SMTP login + SMTP key, sender `novelle.cst@gmail.com`). Old `GMAIL_USER` / `GMAIL_APP_PASSWORD` still work as a fallback |
| backend | `PORT` | Optional — 5000 locally; hosts set it themselves |
| frontend | `NEXT_PUBLIC_BACKEND_URL` | Backend address |
| frontend | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| frontend | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |

`backend/.env.example` and `frontend/.env.example` list the same names with placeholder values.

---

## Database

The database lives in Supabase. Every change to it is a numbered SQL file in
`database/migrations/`, run **by hand, in order**, in the Supabase SQL editor
(001 → 019). Deploys do not run migrations. Never edit a migration that has already
been run — add a new one (the next number is **020**).

| # | Migration | # | Migration |
| - | --------- | - | --------- |
| 001 | submission review | 011 | RUB email only |
| 002 | students see own submissions | 012 | notifications |
| 003 | browse all programmes | 013 | author and solved |
| 004 | resource type check | 014 | login attempts (lockout) |
| 005 | video type | 015 | students read own modules |
| 006 | user management | 016 | like counts in one go |
| 007 | profiles: own row only | 017 | CST email only |
| 008 | storage read policies | 018 | drop old like count |
| 009 | remove browser writes | 019 | module code + advisor fixes |
| 010 | active accounts only | | |

`database/schema.sql` shows the resulting tables, constraints, indexes, functions, RLS
policies and storage rules in one file. It is **for reading only** — the migrations are
the source of truth. Update it whenever a new migration is added.

> The first tables (`programmes`, `profiles`, `modules`, `resources`, `favourites`,
> `resource_submissions`), the sign-up trigger and the storage bucket were created in the
> Supabase dashboard before migrations were introduced; `schema.sql` documents them.

---

## Deployment (Vercel)

Both parts run on **Vercel** (free Hobby plan) as **two Vercel projects** from this one repo.

| Setting | Backend project | Frontend project |
| ------- | --------------- | ---------------- |
| Root Directory | `backend` | `frontend` |
| Framework | Express (detected from `src/server.ts`) | Next.js |
| Production branch | `develop` | `develop` |
| Function region | **Tokyo (`hnd1`)** — next to the Supabase database | Tokyo (`hnd1`) |
| Environment variables | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL` (live frontend address first), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | `NEXT_PUBLIC_BACKEND_URL` (live backend address), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Things to know:

- **PDF uploads are limited to 4 MB** (`backend/src/constants/uploads.ts`, `frontend/src/lib/uploads.ts`),
  because a request to a Vercel function can be at most 4.5 MB.
- The backend becomes one Vercel Function: it only works while answering a request, so
  anything it does (like sending an email) must be awaited before the reply is sent.
- A push to `develop` deploys both projects automatically; other branches (including `main`)
  get preview addresses. A failed build keeps the last working version live; older versions
  can be restored with one click (Instant Rollback).
- Supabase → Authentication → URL Configuration: the Site URL and Redirect URLs must include
  the live `/reset-password` and `/login` addresses, or email links open the wrong page.
- Supabase's free plan pauses a project after 7 days without activity (resume it in the dashboard).
- Vercel's automatic DDoS protection challenges an IP that sends a flood of requests. **Do not
  load-test the live site** — it can lock you out for a while.

---

## Load test

Measured with [autocannon](https://github.com/mcollina/autocannon) against production builds
running on a laptop (`next start` / `node dist/server.js`), 15 Nov 2026:

| Target | Connections | Avg requests/s | Median latency | Errors |
| ------ | ----------- | -------------- | -------------- | ------ |
| Landing page | 10 | ~2,750 | 3 ms | 0 |
| Login page | 10 | ~2,620 | 3 ms | 0 |
| Landing page | 50 | ~2,710 | 18 ms | 0 |
| Backend health check | 10 | ~16,900 | < 1 ms | 0 |
| Backend route without a token (401) | 10 | ~15,700 | < 1 ms | 0 |

Requests without a valid token are rejected before any database call. Tested locally, so
there is no network delay; Supabase was not load-tested (free plan).

---

## Team — Group 8

| Name | Role |
| ---- | ---- |
| Ashis Rai | Frontend developer |
| Chimi Rinzin | Project lead · Full-stack developer · Database & deployment |
| Norzin Wangmo | Frontend developer (admin & auth) |
| Dechen Yangzom | UI/UX designer |
| Ngawang Norbu | UI developer · Database |

Guide: Mr. Pema Thinley

Campus photos: College of Science and Technology.
