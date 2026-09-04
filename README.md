# Origin ERP — Integrated Student Management System

PS-6 build. Spring Boot + Spring Data JPA backend, React + Vite + Tailwind + shadcn/ui frontend,
H2 for zero-setup dev with a PostgreSQL profile for the "real DB".

## Layout

```
Origin/
├── backend/     Spring Boot 3.3 / Java 17 / Maven
├── frontend/    React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui
└── docs/        access matrix, data model, demo script
```

## Prerequisites

| Tool | Needed | Status on this machine |
|------|--------|------------------------|
| JDK 17+ | Spring Boot 3.x will not run on Java 8 | **Java 1.8 detected — install JDK 17 or 21** |
| Maven 3.9+ | backend build | **not installed** |
| Node 18+ | frontend build | installed |

## Run

Backend (default `h2` profile, file-based DB under `backend/data/`):

```powershell
cd backend
mvn spring-boot:run
# → http://localhost:8080/api   |  H2 console: http://localhost:8080/api/h2-console
```

Switch to Postgres:

```powershell
mvn spring-boot:run "-Dspring-boot.run.profiles=postgres"
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
# → http://localhost:5173  (proxies /api to :8080)
```

## Modules

| Module | Backend package | Frontend feature |
|--------|-----------------|------------------|
| Auth + RBAC | `security`, `auth` | `features/auth` |
| Student records | `student` | `features/students` |
| Attendance | `attendance` | `features/attendance` |
| Fees | `fee` | `features/fees` |
| Results | `result` | `features/results` |
| Reports / export | `report` | `features/reports` |
| **Risk Radar (5.1)** | `risk` | `features/risk-radar` |
| NL Query (5.2) | `nlquery`, `llm` | `features/nl-query` |
| Narrative summaries (5.3) | `report`, `llm` | `features/reports` |

Reports are generated client-side (`xlsx` + `jspdf`) — the backend only serves aggregated JSON.

## Rules that shouldn't drift

- **RBAC is enforced server-side.** `@PreAuthorize` on controller methods reading the JWT role claim.
  Frontend route guards in [ProtectedRoute.tsx](frontend/src/routes/ProtectedRoute.tsx) are convenience only.
- **Risk scores are deterministic.** Weighted formula in the `risk` package, weights configurable in
  [application.yml](backend/src/main/resources/application.yml). No ML, no LLM in the scoring path.
- **The LLM never produces logic or SQL.** It maps English → a fixed `StudentFilter` JSON schema
  (5.2) or writes prose over already-aggregated numbers (5.3). Both need a cached fallback for demo day.
