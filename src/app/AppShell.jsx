import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthenticatedLayout } from './layouts/AuthenticatedLayout'
import { GuestRoute, ProtectedRoute } from './routes/AuthRoutes'
import { HomePage } from '@/features/home/HomePage'
import {
  AppLandingPage,
  ChangePasswordPage,
  ForgotPasswordPage,
  LoginPage,
  ProfilePage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from '@/features/auth/AuthPages'

export function AppShell() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/app" element={<AppLandingPage />} />
          <Route path="/account/profile" element={<ProfilePage />} />
          <Route path="/account/change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
