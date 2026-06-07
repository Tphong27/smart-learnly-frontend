import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureAuthClient, request } from './httpClient'

describe('httpClient refresh handling', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does not retry the original request when refresh fails', async () => {
    const refresh = vi.fn().mockRejectedValue(new Error('Refresh failed'))
    configureAuthClient({ getAccessToken: () => 'expired', refresh })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(request('/auth/profile')).rejects.toThrow('Refresh failed')
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
