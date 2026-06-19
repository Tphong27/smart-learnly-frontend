import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

export const orderService = {
  async checkout(cartId) {
    const response = await apiClient.post('/orders/checkout', { cartId })
    return unwrap(response)
  },

  async get(orderId) {
    const response = await apiClient.get(`/orders/${orderId}`)
    return unwrap(response)
  },

  async cancel(orderId) {
    const response = await apiClient.post(`/orders/${orderId}/cancel`)
    return unwrap(response)
  },
}
