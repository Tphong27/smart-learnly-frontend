import { request } from "../shared/api/httpClient";

const httpClient = {
  get: (path, config = {}) => {
    const { params, ...options } = config;
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request(`${path}${query}`, { method: "GET", ...options });
  },
  post: (path, body, config = {}) =>
    request(path, { method: "POST", body: JSON.stringify(body), ...config }),
  put: (path, body, config = {}) =>
    request(path, { method: "PUT", body: JSON.stringify(body), ...config }),
  delete: (path, config = {}) => request(path, { method: "DELETE", ...config }),
};

export const adminMonitoringService = {
  getOrders: async (params) => {
    // 🟩 ĐÃ SỬA: Bỏ chữ /admin/ (Mặc dù backend chưa code logic trả về list, nhưng sửa để hết lỗi 404)
    const response = await httpClient.get("/api/v1/orders", { params });
    return response;
  },
  getOrderById: async (id) => {
    const response = await httpClient.get(`/api/v1/orders/${id}`);
    return response;
  },
  getTransactions: async (params) => {
    // 🟩 ĐÃ SỬA: Bỏ chữ /admin/ để gọi đúng endpoint backend
    const response = await httpClient.get("/api/v1/transactions", { params });
    return response;
  },
  getTransactionById: async (id) => {
    const response = await httpClient.get(`/api/v1/transactions/${id}`);
    return response;
  },
  getSepayEvents: async (params) => {
    const response = await httpClient.get("/api/v1/sepay-events", { params });
    return response;
  },
  getReconciliationRuns: async (params) => {
    const response = await httpClient.get("/api/v1/reconciliation-runs", {
      params,
    });
    return response;
  },
};
