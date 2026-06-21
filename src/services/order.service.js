import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

export function normalizeCheckout(payload) {
  const data = unwrap(payload)

  return {
    orderId: data?.orderId ?? data?.id,
    orderCode: data?.orderCode,
    transactionId: data?.transactionId,
    paymentGateway: data?.paymentGateway ?? 'SEPAY',
    paymentCode: data?.paymentCode,
    amount: Number(data?.amount ?? data?.totalAmount ?? 0),
    currency: data?.currency ?? 'VND',
    bankAccountNumber: data?.bankAccountNumber,
    bankName: data?.bankName,
    accountName: data?.accountName,
    qrUrl: data?.qrUrl,
    status: data?.status ?? 'PENDING',
    expiresAt: data?.expiresAt,
  }
}

export function normalizeOrderPayment(payload) {
  const data = unwrap(payload)

  return {
    orderId: data?.orderId ?? data?.id,
    orderCode: data?.orderCode,
    transactionId: data?.transactionId ?? data?.transaction?.id,
    paymentGateway:
      data?.paymentGateway ??
      data?.transaction?.paymentGateway ??
      'SEPAY',
    paymentCode:
      data?.paymentCode ??
      data?.sepayOrder?.paymentCode,
    amount: Number(
      data?.amount ??
      data?.totalAmount ??
      data?.transaction?.amount ??
      data?.sepayOrder?.amount ??
      0,
    ),
    currency: data?.currency ?? 'VND',
    bankAccountNumber:
      data?.bankAccountNumber ??
      data?.sepayOrder?.bankAccountNumber,
    bankName:
      data?.bankName ??
      data?.sepayOrder?.bankName,
    accountName:
      data?.accountName ??
      data?.sepayOrder?.accountName,
    qrUrl:
      data?.qrUrl ??
      data?.sepayOrder?.qrUrl,
    status:
      data?.transaction?.status ??
      data?.status ??
      data?.sepayOrder?.status ??
      'PENDING',
    expiresAt:
      data?.expiresAt ??
      data?.transaction?.expiresAt ??
      data?.sepayOrder?.expiresAt,
  }
}

export const orderService = {
  async checkout(cartId) {
    const response = await apiClient.post('/orders/checkout', {
      cartId,
    })

    return normalizeCheckout(response)
  },

  async getOrder(orderId) {
    const response = await apiClient.get(`/orders/${orderId}`)
    return normalizeOrderPayment(response)
  },

  async cancelOrder(orderId) {
    const response = await apiClient.post(`/orders/${orderId}/cancel`)
    return unwrap(response)
  },
}
