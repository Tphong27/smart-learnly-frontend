import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  PAID: 'PAID',
  MATCHED: 'MATCHED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  MISMATCHED: 'MISMATCHED',
  REFUNDED: 'REFUNDED',
}

export function normalizePaymentStatus(payload) {
  const data = unwrap(payload)

  return {
    transactionId: data?.transactionId ?? data?.id,
    orderId: data?.orderId,
    status:
      data?.status ??
      data?.transactionStatus ??
      data?.paymentStatus ??
      'PENDING',
    orderStatus: data?.orderStatus,
    sepayOrderStatus: data?.sepayOrderStatus,
    message: data?.message,
    paidAt: data?.paidAt,
    expiresAt: data?.expiresAt,
  }
}

export const paymentStatusService = {
  async getStatus(transactionId) {
    const response = await apiClient.get(`/payments/${transactionId}/status`)
    return normalizePaymentStatus(response)
  },

  isSuccess(status) {
    return ['SUCCESS', 'PAID', 'MATCHED'].includes(String(status || '').toUpperCase())
  },

  isFinal(status) {
    return [
      'SUCCESS',
      'PAID',
      'MATCHED',
      'FAILED',
      'EXPIRED',
      'CANCELLED',
      'MISMATCHED',
      'REFUNDED',
    ].includes(String(status || '').toUpperCase())
  },

  isProblem(status) {
    return [
      'FAILED',
      'EXPIRED',
      'CANCELLED',
      'MISMATCHED',
      'REFUNDED',
    ].includes(String(status || '').toUpperCase())
  },
}
