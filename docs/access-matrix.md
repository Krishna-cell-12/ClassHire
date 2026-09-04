# Role-Based Access Matrix

Enforced **server-side** with `@PreAuthorize` on controller methods, reading the role claim from the
JWT. Frontend route guards and sidebar filtering are convenience only — judges do poke at this.

(The source plan said "Express middleware"; that was a leftover from an earlier Node draft. The
enforcement point here is Spring Security.)

| Module | ADMIN | FACULTY | STUDENT |
|--------|-------|---------|---------|
| Student records | Full CRUD, all depts | View + edit own dept students | View own profile only |
| Attendance | View all, export | Mark for own subjects, view own dept | View own % only |
| Fees | Full CRUD, view all | View own dept | View own dues, no edit |
| Results | Full CRUD | Enter marks for own subjects | View own results |
| Reports / export | All modules, all depts | Own dept / subjects only | Own record only |
| Risk Radar (5.1) | All students, all depts | Own dept students | Not shown |
| NL Query Assistant (5.2) | Full DB scope | Scoped to own dept | Not shown |

## Scoping notes

Two distinct checks are needed and it's easy to ship only the first:

1. **Role check** — can this role touch this endpoint at all (`@PreAuthorize("hasRole('FACULTY')")`).
2. **Row scope** — is this row inside the caller's department / own record. A faculty user hitting
   `GET /students/{id}` for another department must get 403, not data. Resolve the scope from the
   authenticated principal in the service layer; never from a request parameter the client controls.

## Demo accounts

Seeded by `com.origin.erp.seed.DataSeeder` when `app.seed.enabled=true`. No public registration flow.
Keep credentials fixed and written down for the demo — 5–6 accounts covering all three roles.
