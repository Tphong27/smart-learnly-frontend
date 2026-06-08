import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { RoleGuard } from './routes/RoleGuard'
import { LoginPage } from '../features/auth/LoginPage'
import { HomePage } from '../features/home/HomePage'
import { CourseCatalogPage } from '../features/course/CourseCatalogPage'
import { CourseDetailPage } from '../features/course/CourseDetailPage'
import { MyAnalyticsPage } from '../features/analytics/MyAnalyticsPage'
import { TestDetailPage } from '../features/assessment/TestDetailPage'
import { TestListPage } from '../features/assessment/TestListPage'
import { TestResultPage } from '../features/assessment/TestResultPage'
import { TakeTestPage } from '../features/assessment/TakeTestPage'
import { MyCoursesPage } from '../features/enrollment/MyCoursesPage'
import { LearningWorkspacePage } from '../features/learning/LearningWorkspacePage'
import { LessonDetailPage } from '../features/learning/LessonDetailPage'
import { CheckoutPage } from '../features/payment/CheckoutPage'
import { PaymentSimulationPage } from '../features/payment/PaymentSimulationPage'
import { ROLES } from '@/shared/constants/roles'

function PlaceholderPage({ title }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">
        This is a placeholder page for <strong>{title}</strong>. Content will be added in future sprints.
      </p>
    </section>
  )
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

        <Route
          path="/courses"
          element={
            <PublicLayout>
              <CourseCatalogPage />
            </PublicLayout>
          }
        />

        <Route
          path="/courses/:courseId"
          element={
            <PublicLayout>
              <CourseDetailPage />
            </PublicLayout>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
            <Route path="/profile" element={<PlaceholderPage title="Profile" />} />
            <Route path="/checkout/:courseId" element={<CheckoutPage />} />
            <Route path="/payment/simulation/:courseId" element={<PaymentSimulationPage />} />
            <Route path="/my-courses" element={<MyCoursesPage />} />
            <Route path="/learning" element={<LearningWorkspacePage />} />
            <Route path="/learning/:courseId" element={<LearningWorkspacePage />} />
            <Route path="/learning/:courseId/lessons/:lessonId" element={<LessonDetailPage />} />
            <Route path="/tests" element={<TestListPage />} />
            <Route path="/tests/:testId" element={<TestDetailPage />} />
            <Route path="/tests/:testId/take" element={<TakeTestPage />} />
            <Route path="/tests/:testId/result/:attemptId" element={<TestResultPage />} />
            <Route path="/analytics/me" element={<MyAnalyticsPage />} />

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
