import apiClient from "@/services/api-client";

/** Lấy payload nghiệp vụ ra khỏi ApiResponse của backend. */
function unwrapApiResponse(response) {
  return response?.data ?? response;
}

/** Gửi GET qua API client chuẩn và trả payload nghiệp vụ đã unwrap. */
async function get(path, params) {
  return unwrapApiResponse(await apiClient.get(path, { params }));
}

export const checkoutMonitoringService = {
  /** Tải danh sách đơn cho màn hình Admin/TMO. */
  getOrders: async (params) => {
    return get("/orders", params);
  },

  /** Tải chi tiết một đơn cho màn hình giám sát. */
  getOrderById: async (id) => {
    return get(`/orders/${id}`);
  },

  /** Tải danh sách giao dịch theo bộ lọc quản trị. */
  getTransactions: async (params) => {
    return get("/transactions", params);
  },

  /** Tải các giá trị bộ lọc giao dịch đang có trong hệ thống. */
  getTransactionFilterOptions: async () => {
    return get("/transactions/filter-options");
  },

  /** Tải chi tiết một giao dịch cho màn hình giám sát. */
  getTransactionById: async (id) => {
    return get(`/transactions/${id}`);
  },

  /** Tải lịch sử webhook SePay cùng trạng thái xử lý. */
  getSepayEvents: async (params) => {
    return get("/sepay-events", params);
  },

  /** Tải lịch sử các lần reconciliation khi backend cung cấp endpoint này. */
  getReconciliationRuns: async (params) => {
    return get("/reconciliation-runs", params);
  },
};
