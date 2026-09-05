# Role-Based Access Matrix

Enforced **server-side** in Express, per route, by two middlewares reading the verified JWT:
`verifyJwt` (authentication) and `requireRole(...)` (role), plus per-route ownership guards in the
route files themselves. Client route guards and sidebar filtering are convenience only.

This document describes what the code actually enforces. When they disagree, the code in
`server/src/modules/*/**.routes.ts` is the truth.

## Two checks, not one

1. **Role check** — may this role call this endpoint at all (`requireRole(Role.ADMIN)`).
2. **Row scope** — is this row inside the caller's own scope. Resolved from the authenticated
   principal via `lib/ownership.ts`, never from a client-supplied parameter.

Faculty scope is **course ownership**, not department: `assertCourseOwnedByFaculty()` checks
`Course.facultyId` against the faculty profile linked to the caller's user id. A faculty member
hitting another lecturer's course gets 403 even within their own department.

## Matrix

| Endpoint | ADMIN | FACULTY | STUDENT |
|----------|-------|---------|---------|
| `POST /auth/login` | public | public | public |
| `GET /auth/me` | ✔ | ✔ | ✔ |
| `POST /auth/register` | ✔ | ✖ | ✖ |
| `GET /dashboard` | institution-wide | own courses + their students | own record only |
| `GET /departments`, `GET /courses` | ✔ | ✔ | ✔ |
| `POST/PATCH/DELETE /departments`, `/courses` | ✔ | ✖ | ✖ |
| `GET /courses/:id/students` | ✔ | own courses | ✖ |
| `GET /students` (directory) | ✔ | ✔ | **✖ (403)** |
| `POST /students/search-nl` | ✔ | ✔ | **✖ (403)** |
| `GET /students/:id`, `/:id/summary` | ✔ | ✔ | own record only |
| `POST/PATCH/DELETE /students` | ✔ | ✖ | ✖ |
| `GET /faculty` | ✔ | ✖ | ✖ |
| `GET /faculty/:id` | ✔ | own record only | ✖ |
| `POST /attendance/sessions`, `/:id/mark` | ✔ | own courses | ✖ |
| `GET /attendance/students/:id` | ✔ | **any student** (advising) | own record only |
| `GET /attendance/courses/:id/summary` | ✔ | own courses | ✖ |
| `GET /fees/slabs` | ✔ | ✔ | ✔ |
| `POST/PATCH /fees/slabs`, `POST /fees/payments` | ✔ | ✖ | ✖ |
| `GET /fees/payments`, `/students/:id/status` | ✔ | **✖ (403)** | own record only |
| `GET /exams` | ✔ | ✔ | ✔ |
| `POST/PATCH /exams`, `/:id/marks` | ✔ | own courses | ✖ |
| `GET /exams/students/:id/results` | ✔ | ✔ | own record only |
| `GET /risk` | ✔ | ✔ (all students) | **✖ (403)** |
| `GET /reports/students/:id/report-card.pdf` | ✔ | ✔ | own record only |
| `GET /reports/attendance/course/:id.xlsx` | ✔ | own courses | ✖ |
| `GET /reports/results/exam/:id.pdf` | ✔ | own courses | ✖ |
| `GET /reports/fees/defaulters.xlsx`, `/students/export.xlsx` | ✔ | ✖ | ✖ |

## Deliberate asymmetries

Three rows above are easy to misread as bugs. They aren't:

- **Faculty may read any student's attendance** (`GET /attendance/students/:id`) but only their own
  courses' registers. The route carries an explicit comment: this is for advising.
- **Faculty may read the full risk list**, not a department slice. `GET /risk` accepts an optional
  `departmentId` filter, but does not force one.
- **Faculty cannot see individual fee records.** Fees are admin-only, so the client's Fees page shows
  faculty the published slab table rather than controls that would 403.

## Risk is withheld from students structurally

`GET /risk` is `requireRole(ADMIN, FACULTY)`. Separately, `GET /students/:id/summary` is shared with
students for their own record, and the controller attaches the `risk` field **only** when the caller
is admin or faculty — a student's own summary has no such key at all. The same applies to the
dashboard: `studentOverview()` computes no risk score.

## Demo accounts

Created by `server/prisma/seed.ts` (fixed faker seed, so addresses are stable across re-seeds). No
public registration flow — `POST /auth/register` is admin-only.

| Role | Email |
|------|-------|
| ADMIN | `admin@college.edu` |
| FACULTY | `wyman.donnelly@college.edu` |
| STUDENT | `nia.schamberger49@college.edu` |

All seeded accounts share the password `Password123!`. The student above is the seed's guaranteed
high-risk account, so the eligibility and fee warnings are visibly firing during a demo.
