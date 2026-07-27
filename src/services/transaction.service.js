import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

export const transactionService = {
  async list({ page = 0, size = 20, keyword, status } = {}) {
    const response = await apiClient.get('/transactions', {
      params: {
        page,
        size,
        keyword: keyword || undefined,
        status: status || undefined,
      },
    })
    return unwrap(response) || { items: [], page: 0, size, totalItems: 0, totalPages: 0 }
  },

  async getInvoice(transactionId) {
    const response = await apiClient.get(`/transactions/${transactionId}/invoice`)
    return unwrap(response)
  },
}
