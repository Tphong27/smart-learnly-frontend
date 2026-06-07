import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/authStore'
import { ProtectedRoute } from './AuthRoutes'

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, status: 'guest' })
  })

  it('preserves the requested URL when redirecting a guest', () => {
    render(
      <MemoryRouter initialEntries={['/account/profile?tab=details']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/account/profile" element={<div>Protected profile</div>} />
          </Route>
          <Route path="/login" element={<LoginState />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('/account/profile?tab=details')).toBeInTheDocument()
  })
})

function LoginState() {
  const location = useLocation()
  return <div>{location.state?.from}</div>
}
