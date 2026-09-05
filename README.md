# Origin ERP — Integrated Student Management System

PS-6 build. An Express + Prisma + PostgreSQL API behind a React + Vite + Tailwind client, with a
deterministic student **Risk Radar**, a **natural-language query** assistant that never writes SQL,
and server-generated PDF/Excel reports.

Every screen reads from the database. There is no mock data anywhere in the client.

## Layout

```
Origin1/
├── server/      Express 4 · TypeScript · Prisma 5 · PostgreSQL 16 · Zod · JWT
├── frontend/    React 18 · Vite 5 · TypeScript · Tailwind · Framer Motion · Recharts
├── docs/        access matrix, data model
└── docker-compose.yml   PostgreSQL for local dev
```

## Prerequisites

| Tool | Needed for |
|------|-----------|
| Node 18+ | API and client |
| Docker Desktop | the PostgreSQL container (or bring your own Postgres 14+) |

Postgres specifically — the schema uses `citext`-style case-insensitive matching
(`mode: 'insensitive'`) and `Decimal` columns, so SQLite is not a drop-in substitute.

## Quick start

```bash
npm run install:all     # root + server + frontend dependencies
cp server/.env.example server/.env      # then set JWT_SECRET and, optionally, an LLM key
npm run setup           # start Postgres, run migrations, seed ~400 students
npm run dev             # API on :4000, client on :5173
```

Open <http://localhost:5173>.

### Demo accounts

All seeded accounts share the password **`Password123!`**.

| Role | Email | What it shows |
|------|-------|---------------|
| Admin | `admin@college.edu` | Whole-institution dashboard, every module |
| Faculty | `wyman.donnelly@college.edu` | Six CSE courses, own-course registers and marks |
| Student | `nia.schamberger49@college.edu` | The seed's designated high-risk student — attendance and fee warnings actually fire |

The login screen has one-tap buttons for all three.

## Scripts

Run from the repo root:

| Script | Does |
|--------|------|
| `npm run dev` | API + client together, colour-tagged |
| `npm run setup` | `db:up` → `migrate` → `seed` |
| `npm run db:up` / `db:down` | start / stop the Postgres container |
| `npm run db:reset` | destroy the volume and start clean (re-run `migrate` + `seed` after) |
| `npm run migrate` / `npm run seed` | Prisma migrate deploy / seed |
| `npm run typecheck` | typecheck both packages |
| `npm run build` | production build of both |

The database container publishes **5433**, not 5432, so it can't collide with a Postgres you already
run locally. `DATABASE_URL` in `server/.env` must match.

## Configuration

`server/.env` (see `.env.example`):

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | 16+ chars, required |
| `PORT` | default 4000 |
| `CORS_ORIGIN` | the client origin, default `http://localhost:5173` |
| `LLM_PROVIDER` | `groq` or `gemini`, for the NL query feature |
| `GROQ_API_KEY` / `GEMINI_API_KEY` | only the active provider's key is needed |

The NL feature is **optional**. With no key set the server still boots, logs a warning, and that one
endpoint returns a clean error — nothing else is affected.

The client needs no configuration in dev: it calls `/api/*` and Vite proxies to the API. For a
deployed build, set `VITE_API_BASE_URL` to the API's absolute URL.

## Modules

| Module | API | Client |
|--------|-----|--------|
| Auth + RBAC | `modules/auth`, `middleware/auth` | `features/auth`, `store/auth-context` |
| Dashboard | `modules/dashboard` | `features/dashboard` |
| Students | `modules/students` | `features/students` |
| Attendance | `modules/attendance` | `features/attendance` |
| Fees | `modules/fees` | `features/fees` |
| Results | `modules/exams` | `features/results` |
| Reports / export | `modules/reports` | `features/reports` |
| **Risk Radar** | `modules/risk` | `features/risk-radar` |
| **NL Query** | `modules/students/nlSearch.*` | `features/nl-query` |

## Rules that shouldn't drift

- **RBAC is enforced server-side**, per route, reading the role claim from the JWT. Two separate
  checks: role (can this role call this at all) and row scope (is this row theirs). Faculty are
  scoped by **course ownership**, not department. The client's route guards and sidebar filtering are
  convenience only — see [docs/access-matrix.md](docs/access-matrix.md) for the enforced matrix.

- **Risk scores are deterministic.** A weighted formula over attendance, fee delay and grade trend.
  No ML, no LLM in the scoring path. The formula lives in exactly one function — `riskFromInputs()` in
  [risk.service.ts](server/src/modules/risk/risk.service.ts). Both the single-student path and the
  bulk path feed it, so the dashboard and the radar can't disagree.

- **Students never see risk.** Not their own, not anyone's. `GET /api/risk` is 403 for a student, and
  the student summary endpoint omits the field entirely rather than hiding it in the UI.

- **The LLM never produces logic or SQL.** It maps English onto a fixed, whitelisted `StudentFilter`
  JSON schema, validated with a `.strict()` Zod schema before anything touches the database. An
  unrecognised field rejects the whole query. Report summaries are written over already-aggregated
  totals — no student records are sent to the model.

- **Reports are generated server-side** from live data (PDFKit / ExcelJS) and are authenticated, so
  the client fetches them as blobs with the bearer token attached rather than linking to them.

- **Don't commit `frontend/vite.config.js`.** It's compiled output from `tsc -b`, and Vite resolves
  `.js` ahead of `.ts` — a stale one silently overrides the real config. It's gitignored, and
  `tsconfig.node.json` now emits to `node_modules/.tmp` to stop it reappearing.

## Troubleshooting

**`ECONNREFUSED` on every `/api` request in dev** — the API isn't running, or a stale
`frontend/vite.config.js` is shadowing the real proxy config. Delete it.

**Port 5433 already allocated** — something else holds it; change both `docker-compose.yml` and
`DATABASE_URL`.

**`Invalid environment variables`** on API start — `JWT_SECRET` is missing or under 16 characters.
