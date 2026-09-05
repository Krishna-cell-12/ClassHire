import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { StudentsPage } from '@/features/students/StudentsPage'
import { AttendancePage } from '@/features/attendance/AttendancePage'
import { FeesPage } from '@/features/fees/FeesPage'
import { ResultsPage } from '@/features/results/ResultsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { RiskRadarPage } from '@/features/risk-radar/RiskRadarPage'
import { NlQueryPage } from '@/features/nl-query/NlQueryPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Every authenticated role. Each of these pages renders a different view
            per role, backed by an endpoint that role is actually allowed to call. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="fees" element={<FeesPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Route>

        {/* Admin + faculty only — see the access matrix in docs/. The student
            directory belongs here too: GET /api/students is ADMIN/FACULTY only,
            so letting a student route here would render a guaranteed 403. */}
        <Route element={<ProtectedRoute allow={['ADMIN', 'FACULTY']} />}>
          <Route element={<AppShell />}>
            <Route path="students" element={<StudentsPage />} />
            <Route path="risk-radar" element={<RiskRadarPage />} />
            <Route path="query" element={<NlQueryPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
