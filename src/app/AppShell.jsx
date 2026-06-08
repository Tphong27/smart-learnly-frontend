import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { RoleGuard } from './routes/RoleGuard'
import { HomePage } from '../features/home/HomePage'
import { ROLES } from '@/shared/constants/roles'

function PlaceholderPage({ title }) {
  return (
    <section className="app-placeholder">
      <h1>{title}</h1>
      <p>
        This is a placeholder page for <strong>{title}</strong>. Content will be added in future sprints.
      </p>
    </section>
  )
}

function LoginPage() {
  return <PlaceholderPage title="Login" />
}

function RegisterPage() {
  return <PlaceholderPage title="Register" />
}

function ForbiddenPage() {
  return <PlaceholderPage title="403 - Bạn không có quyền truy cập" />
}

function NotFoundPage() {
  return <PlaceholderPage title="404 - Trang không tồn tại" />
}

export function AppShell() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicLayout>
              <HomePage />
            </PublicLayout>
          }
        />

        <Route
          path="/login"
          element={
            <PublicLayout>
              <LoginPage />
            </PublicLayout>
          }
        />

        <Route
          path="/register"
          element={
            <PublicLayout>
              <RegisterPage />
            </PublicLayout>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
            <Route path="/profile" element={<PlaceholderPage title="Profile" />} />
            <Route path="/my-courses" element={<PlaceholderPage title="My Courses" />} />
            <Route path="/tests" element={<PlaceholderPage title="Tests" />} />

            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    ROLES.ADMIN,
                    ROLES.SME,
                  ]}
                />
              }
            >
              <Route path="/sme/content" element={<PlaceholderPage title="Course Content" />} />
              <Route path="/sme/questions" element={<PlaceholderPage title="Question Bank" />} />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={[ROLES.ADMIN]}
                />
              }
            >
              <Route path="/admin/courses" element={<PlaceholderPage title="Admin Course Management" />} />
              <Route path="/admin/users" element={<PlaceholderPage title="Users & Roles" />} />
              <Route path="/settings" element={<PlaceholderPage title="System Settings" />} />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    ROLES.TMO,
                    ROLES.ADMIN,
                  ]}
                />
              }
            >
              <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={[ROLES.TRAINER]}
                />
              }
            >
              <Route path="/trainer/classes" element={<PlaceholderPage title="Trainer Classes" />} />
            </Route>
          </Route>
        </Route>

        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
