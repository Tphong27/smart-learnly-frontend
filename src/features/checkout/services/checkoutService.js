import apiClient from "@/services/api-client";

const SUCCESS_STATUSES = ["SUCCESS", "PAID", "MATCHED"];
const PROBLEM_STATUSES = ["FAILED", "EXPIRED", "CANCELLED", "MISMATCHED", "REFUNDED"];
const FINAL_STATUSES = [...SUCCESS_STATUSES, ...PROBLEM_STATUSES];

/** Chuẩn hóa trạng thái để việc so sánh không phụ thuộc chữ hoa/thường. */
function normalizeStatus(status) {
  return String(status || "").toUpperCase();
}

/** Lấy phần data nghiệp vụ ra khỏi ApiResponse hoặc giữ nguyên payload đã được unwrap. */
function unwrap(response) {
  return response?.data ?? response;
}

/** Chuyển giá trị API thành number an toàn cho phần hiển thị tiền. */
function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? fallback : numberValue;
}

/** Chuẩn hóa response tạo checkout thành model thanh toán dùng thống nhất trên frontend. */
function normalizeCheckout(payload) {
  const data = unwrap(payload);

  return {
    orderId: data?.orderId ?? data?.id,
    orderCode: data?.orderCode,
    transactionId: data?.transactionId,
    paymentGateway: data?.paymentGateway ?? "SEPAY",
    paymentCode: data?.paymentCode,
    transferContent: data?.transferContent ?? data?.paymentCode,
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

/** Gộp order, transaction và SePay order thành một model dùng cho polling và kết quả. */
function normalizeOrderPayment(payload) {
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
    transferContent:
      data?.transferContent ??
      sepayOrder?.transferContent ??
      data?.paymentCode ??
      sepayOrder?.paymentCode,
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

export const checkoutService = {
  /** Tạo checkout cho một khóa học online có tính phí. */
  async checkoutCourse(courseId) {
    if (!courseId) {
      throw new Error("Course ID is required");
    }

    const response = await apiClient.post("/orders/checkout", {
      itemType: "COURSE",
      courseId,
      classId: null,
    });

    return normalizeCheckout(response);
  },

  /** Tạo checkout cho một lớp học offline thuộc khóa học đã chọn. */
  async checkoutClass(courseId, classId) {
    if (!courseId) {
      throw new Error("Course ID is required");
    }

    if (!classId) {
      throw new Error("Class ID is required");
    }

    const response = await apiClient.post("/orders/checkout", {
      itemType: "CLASS",
      courseId,
      classId,
    });

    return normalizeCheckout(response);
  },

  /** Tải chi tiết order và chuẩn hóa trạng thái thanh toán liên quan. */
  async get(orderId) {
    const response = await apiClient.get(`/orders/${orderId}`);
    return normalizeOrderPayment(response);
  },

  /** Hủy một order PENDING thuộc về người dùng hiện tại. */
  async cancel(orderId) {
    const response = await apiClient.post(`/orders/${orderId}/cancel`);
    return normalizeOrderPayment(response);
  },

  /** Tải lịch sử giao dịch của người dùng hiện tại theo phân trang và bộ lọc. */
  async listTransactions({ page = 0, size = 20, keyword, status } = {}) {
    const response = await apiClient.get("/transactions", {
      params: {
        page,
        size,
        keyword: keyword || undefined,
        status: status || undefined,
      },
    });

    return unwrap(response) || {
      items: [],
      page: 0,
      size,
      totalItems: 0,
      totalPages: 0,
    };
  },

  /** Tải dữ liệu hóa đơn của một giao dịch đã thanh toán thành công. */
  async getInvoice(transactionId) {
    const response = await apiClient.get(`/transactions/${transactionId}/invoice`);
    return unwrap(response);
  },
};

/** Các phép kiểm tra trạng thái dùng chung cho polling và trang kết quả thanh toán. */
export const paymentStatusService = {
  /** Cho biết thanh toán đã được xác nhận thành công hay chưa. */
  isSuccess(status) {
    return SUCCESS_STATUSES.includes(normalizeStatus(status));
  },

  /** Cho biết frontend có thể dừng polling vì trạng thái sẽ không tiếp tục chờ. */
  isFinal(status) {
    return FINAL_STATUSES.includes(normalizeStatus(status));
  },

  /** Cho biết thanh toán kết thúc bằng lỗi, hủy, hết hạn hoặc hoàn tiền. */
  isProblem(status) {
    return PROBLEM_STATUSES.includes(normalizeStatus(status));
  },
};
