# Core Entities

```
User            (id, name, email, passwordHash, role[ADMIN|FACULTY|STUDENT], department, avatarUrl)
Student         (id, userId, rollNo, department, semester, admissionYear)
Faculty         (id, userId, department, subjectsTaught[])
Department      (id, name, code)
Subject         (id, name, code, departmentId, semester)
AttendanceRecord(id, studentId, subjectId, date, status[PRESENT|ABSENT], markedBy)
FeeRecord       (id, studentId, semester, amountDue, amountPaid, dueDate, status[PAID|PENDING|OVERDUE])
ExamResult      (id, studentId, subjectId, semester, marksObtained, maxMarks, grade)
RiskFlag        (id, studentId, score, reasons[], computedAt)   -- computed, never user-entered
```

Mirrored in TypeScript at [frontend/src/types/index.ts](../frontend/src/types/index.ts) — keep the two in sync.

## Risk Radar scoring (Feature 5.1)

Deterministic and explainable. No model training, no LLM in the scoring path.

```
risk = 0.40 * attendanceShortfall
     + 0.35 * feeOverdueDays
     + 0.25 * gradeDecline
```

Weights and bucket thresholds live under `app.risk.*` in
[application.yml](../backend/src/main/resources/application.yml) so they can be tuned without a rebuild.
Bucket into LOW / MEDIUM / HIGH and attach plain-language reasons —
`"attendance 68%, below 75% eligibility"`, `"fees overdue 22 days"`. The reasons are the feature; a
bare number isn't actionable.

Each of the three inputs must be normalised to a 0–1 scale before weighting, or fee overdue days
(unbounded) will swamp attendance shortfall (capped at 100).

## Seed data

`DataSeeder` should deliberately place ~8–10% of students in the attendance + fee + grade combination
that lands in HIGH risk, so the dashboard shows visible signal rather than noise. Use the college's
real department codes, semester structure, and fee slabs — placeholder names read as junk to judges.
