# Data Model

The schema of record is [server/prisma/schema.prisma](../server/prisma/schema.prisma). The client
mirrors the API's response shapes in
[frontend/src/types/index.ts](../frontend/src/types/index.ts) — keep the two in sync.

## Entities

```
User              (id, email, passwordHash, role[ADMIN|FACULTY|STUDENT], isActive)
Department        (id, name, code)
Student           (id, userId→User, rollNumber, firstName, lastName, dateOfBirth, gender,
                   phone, address, departmentId, currentSemester, batchYear, admissionDate, isActive)
Faculty           (id, userId→User, employeeCode, firstName, lastName, phone,
                   departmentId, designation, isActive)
Course            (id, code, name, departmentId, semester, credits, facultyId→Faculty?)
Enrollment        (id, studentId, courseId, academicYear)          unique(student, course, year)
AttendanceSession (id, courseId, date, topic)                      unique(course, date)
AttendanceRecord  (id, sessionId, studentId, status, markedAt)     unique(session, student)
FeeSlab           (id, departmentId, semester, batchYear,
                   tuitionFee, labFee, libraryFee, otherFee, totalAmount, dueDate)
                                                                   unique(dept, semester, batchYear)
FeePayment        (id, studentId, feeSlabId, amountPaid, paymentDate, paymentMode,
                   transactionRef, status)
Exam              (id, courseId, examType[MIDTERM|FINAL|QUIZ|ASSIGNMENT], title, examDate, maxMarks)
ResultMark        (id, examId, studentId, marksObtained, grade, remarks, enteredBy)
                                                                   unique(exam, student)
```

Every id is a UUID. `User` owns authentication; `Student` and `Faculty` are separate profile rows
linked by `userId`. **The profile id is not the user id** — endpoints such as
`/api/fees/students/:studentId/status` want the profile id, which is why the client's auth context
resolves and stores `studentId` / `facultyId` alongside `id`.

## Derived values

Three things the UI treats as fields are not columns. They are computed, and each has exactly one
implementation:

| Value | Rule | Where |
|-------|------|-------|
| Attendance % | `(PRESENT + LATE) / total × 100`, `null` when there are no records | `attendance.service.ts` |
| Fee standing | `PAID` if paid ≥ total; else `PARTIAL` if paid > 0; else `OVERDUE` if past due; else `PENDING` | `feeStandingFor()` in `fees.service.ts` |
| Risk score | see below | `riskFromInputs()` in `risk.service.ts` |

Each has a single-row path and a bulk path (`attendanceForStudents`,
`computeFeeStandingForStudents`, `computeRiskForStudents`) that share the same rule. The bulk paths
exist because the naive version issued roughly six queries per student — several thousand for one
Risk Radar page load. They collapse it to a fixed handful of grouped queries.

`Decimal` columns serialise to JSON as **strings**. Coerce before doing arithmetic
(`toNumber()` in the client, explicit `Number()` in the services) or `+` silently concatenates.

## Risk Radar scoring

Deterministic and explainable. No model training, no LLM anywhere in the scoring path.

```
score = round( 0.40 × attendanceSubScore
             + 0.35 × feeSubScore
             + 0.25 × gradeSubScore )

attendanceSubScore = clamp(100 − attendancePct, 0, 100)      null attendance → 0
feeSubScore        = clamp(min(daysOverdue × 2, 100) × unpaidFraction, 0, 100)
                     0 unless actually overdue
gradeSubScore      = clamp(−trendPoints × 7, 0, 100)          0 unless declining

level = HIGH ≥ 70 · MEDIUM ≥ 40 · LOW otherwise
```

Each sub-score is normalised to 0–100 *before* weighting, so unbounded days-overdue can't swamp the
capped attendance shortfall.

**Why the fee term is scaled by unpaid fraction.** Every seeded slab shares one due date, so as of
today every non-paid student is ~230 days overdue. Raw days-overdue alone would score a student who
owes ₹500 identically to one who has paid nothing. Weighting by the unpaid fraction restores the
distinction using data that actually varies, while still gating entirely on "is this overdue at all".

**Grade trend** is per-course and self-relative: the most recent exam's percentage versus the average
of that student's own earlier exams in the same course, averaged over every course with 2+ results.
`null` when no course has enough data. Improving or flat contributes zero risk.

Every score carries a plain-language `reason` (`"Attendance is 10%, fees overdue by 233 days, grades
down 35 points vs. their own average"`) and a per-factor `subScore` breakdown. The reasons are the
feature; a bare number isn't actionable.

## NL query filter

The only shape the LLM may emit, validated with a `.strict()` Zod schema before any database access
([nlSearch.schema.ts](../server/src/modules/students/nlSearch.schema.ts)):

```
department?  attendanceBelow?  attendanceAbove?  feeStatus?
riskLevel?   semester?         batchYear?        name?
```

`.strict()` is the security boundary: any key outside this list rejects the entire query, so a
prompt-injection attempt has nothing to land on. `isActive` is deliberately **not** in the list and
is hardcoded `true` in the query, so no model output can surface a deactivated student. A named
department is resolved against real `Department` rows — a hallucinated one is rejected, not guessed.

Attendance, fee and risk filters can't be expressed as Prisma `where` clauses (they're derived), so
they're applied in memory after the database query, using the same shared rules above.

## Seed data

`server/prisma/seed.ts`, fixed faker seed (42) so every run is identical.

```
5 departments · 20 faculty · 120 courses · 20 fee slabs · 400 students
1,200 enrollments · 1,800 sessions (36,000 attendance records)
180 exams (3,600 result marks) · 356 fee payments
```

Per-student biases are applied deliberately so the dashboard shows signal rather than noise, and one
student is forced into HIGH risk. The seed prints that student's id and credentials at the end.
