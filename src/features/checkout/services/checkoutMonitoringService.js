import { request } from "@/shared/api/httpClient";

/** Lấy payload nghiệp vụ ra khỏi ApiResponse của backend. */
function unwrapApiResponse(response) {
  return response?.data ?? response;
}

const httpClient = {
  /** Gửi GET có query params bằng HTTP client hiện tại của màn hình monitoring. */
  get: async (path, config = {}) => {
    const { params, ...options } = config;
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    const response = await request(`${path}${query}`, {
      method: "GET",
      ...options,
    });
    return unwrapApiResponse(response);
  },
};

export const checkoutMonitoringService = {
  /** Tải danh sách đơn cho màn hình Admin/TMO. */
  getOrders: async (params) => {
    return httpClient.get("/orders", { params });
  },

  /** Tải chi tiết một đơn cho màn hình giám sát. */
  getOrderById: async (id) => {
    return httpClient.get(`/orders/${id}`);
  },

  /** Tải danh sách giao dịch theo bộ lọc quản trị. */
  getTransactions: async (params) => {
    return httpClient.get("/transactions", { params });
  },

  /** Tải các giá trị bộ lọc giao dịch đang có trong hệ thống. */
  getTransactionFilterOptions: async () => {
    return httpClient.get("/transactions/filter-options");
  },

  /** Tải chi tiết một giao dịch cho màn hình giám sát. */
  getTransactionById: async (id) => {
    return httpClient.get(`/transactions/${id}`);
  },

  /** Tải lịch sử webhook SePay cùng trạng thái xử lý. */
  getSepayEvents: async (params) => {
    return httpClient.get("/sepay-events", { params });
  },

  /** Tải lịch sử các lần reconciliation khi backend cung cấp endpoint này. */
  getReconciliationRuns: async (params) => {
    return httpClient.get("/reconciliation-runs", { params });
  },
};
