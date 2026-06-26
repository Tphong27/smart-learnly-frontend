import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? fallback : numberValue;
}

export function normalizeCheckout(payload) {
  const data = unwrap(payload);

  return {
    orderId: data?.orderId ?? data?.id,
    orderCode: data?.orderCode,
    transactionId: data?.transactionId,
    paymentGateway: data?.paymentGateway ?? "SEPAY",
    paymentCode: data?.paymentCode,
    amount: toNumber(data?.amount ?? data?.totalAmount),
    currency: data?.currency ?? "VND",
    bankAccountNumber: data?.bankAccountNumber,
    bankName: data?.bankName,
    accountName: data?.accountName,
    qrUrl: data?.qrUrl,
    status: data?.status ?? "PENDING",
    expiresAt: data?.expiresAt,
  };
}

export function normalizeOrderPayment(payload) {
  const data = unwrap(payload);
  const transaction = data?.transaction;
  const sepayOrder = data?.sepayOrder;

  return {
    ...data,
    orderId: data?.orderId ?? data?.id,
    orderCode: data?.orderCode,
    transactionId: data?.transactionId ?? transaction?.id,
    paymentGateway:
      data?.paymentGateway ?? transaction?.paymentGateway ?? "SEPAY",
    paymentCode: data?.paymentCode ?? sepayOrder?.paymentCode,
    amount: toNumber(
      data?.amount ??
        data?.totalAmount ??
        transaction?.amount ??
        sepayOrder?.amount,
    ),
    currency: data?.currency ?? transaction?.currency ?? "VND",
    bankAccountNumber: data?.bankAccountNumber ?? sepayOrder?.bankAccountNumber,
    bankName: data?.bankName ?? sepayOrder?.bankName,
    accountName: data?.accountName ?? sepayOrder?.accountName,
    qrUrl: data?.qrUrl ?? sepayOrder?.qrUrl,
    status:
      data?.status ?? transaction?.status ?? sepayOrder?.status ?? "PENDING",
    transactionStatus: transaction?.status,
    sepayOrderStatus: sepayOrder?.status,
    expiresAt:
      data?.expiresAt ?? transaction?.expiresAt ?? sepayOrder?.expiresAt,
  };
}

export const orderService = {
  async checkout(cartId) {
    const response = await apiClient.post("/orders/checkout", { cartId });
    return normalizeCheckout(response);
  },

  async buyNowCheckout({ courseId, classId }) {
    const response = await apiClient.post("/orders/checkout/buy-now", {
      courseId,
      classId,
    });

    return normalizeCheckout(response);
  },

  async get(orderId) {
    const response = await apiClient.get(`/orders/${orderId}`);
    return normalizeOrderPayment(response);
  },

  async getOrder(orderId) {
    return this.get(orderId);
  },

  async cancel(orderId) {
    const response = await apiClient.post(`/orders/${orderId}/cancel`);
    return normalizeOrderPayment(response);
  },

  async cancelOrder(orderId) {
    return this.cancel(orderId);
  },
};
