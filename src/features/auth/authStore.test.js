import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./authService', () => ({
  authService: {
    refresh: vi.fn(),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  },
}))

import { authService } from './authService'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ accessToken: null, user: null, status: 'idle' })
  })

  it('restores an authenticated session from refresh', async () => {
    authService.refresh.mockResolvedValue({
      data: { accessToken: 'new-token', user: { id: 'user-id', role: 'TRAINEE' } },
    })

    await useAuthStore.getState().restoreSession()

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'new-token',
      user: { id: 'user-id', role: 'TRAINEE' },
      status: 'authenticated',
    })
  })

  it('settles as guest when refresh fails', async () => {
    authService.refresh.mockRejectedValue(new Error('Expired'))

    await useAuthStore.getState().restoreSession()

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      user: null,
      status: 'guest',
    })
  })
})
