import { create } from 'zustand'
import { configureAuthClient } from '@/shared/api/httpClient'
import { authService } from './authService'

export const useAuthStore = create((set, get) => ({
  accessToken: null,
  user: null,
  status: 'idle',

  login: async (credentials) => {
    const response = await authService.login(credentials)
    set({ accessToken: response.data.accessToken, user: response.data.user, status: 'authenticated' })
    return response
  },

  loginWithGoogle: async (idToken) => {
    const response = await authService.loginWithGoogle(idToken)
    set({ accessToken: response.data.accessToken, user: response.data.user, status: 'authenticated' })
    return response
  },

  refreshSession: async () => {
    try {
      const response = await authService.refresh()
      set({ accessToken: response.data.accessToken, user: response.data.user, status: 'authenticated' })
      return response
    } catch (error) {
      set({ accessToken: null, user: null, status: 'guest' })
      throw error
    }
  },

  restoreSession: async () => {
    if (get().status !== 'idle') return
    set({ status: 'restoring' })
    try {
      await get().refreshSession()
    } catch {
      // A missing or expired refresh cookie is the normal guest state.
    }
  },

  logout: async () => {
    try {
      await authService.logout()
    } finally {
      set({ accessToken: null, user: null, status: 'guest' })
    }
  },

  setUser: (user) => set({ user }),
}))

configureAuthClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refresh: () => useAuthStore.getState().refreshSession(),
})
