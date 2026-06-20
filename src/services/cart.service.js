import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

function normalizeCart(payload) {
  const data = unwrap(payload)

  const items =
    data?.items ??
    data?.cartItems ??
    data?.content ??
    []

  return {
    id: data?.id ?? data?.cartId ?? null,
    items: Array.isArray(items) ? items : [],
    totalAmount: Number(data?.totalAmount ?? data?.total ?? 0),
    currency: data?.currency ?? 'VND',
    updatedAt: data?.updatedAt ?? null,
  }
}

export const cartService = {
  async getCart() {
    const response = await apiClient.get('/cart')
    return normalizeCart(response)
  },

  async addItem({ courseId, classId = null }) {
    const response = await apiClient.post('/cart/items', {
      courseId,
      classId,
    })

    return unwrap(response)
  },

  async removeItem(itemId) {
    const response = await apiClient.delete(`/cart/items/${itemId}`)
    return unwrap(response)
  },
}