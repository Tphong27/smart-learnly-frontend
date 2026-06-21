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
    // 🟩 ĐÃ SỬA: Xóa "/api/v1", chỉ để lại "/orders"
    const response = await httpClient.get("/orders", { params });
    return response;
  },
  getOrderById: async (id) => {
    // 🟩 ĐÃ SỬA: Xóa "/api/v1"
    const response = await httpClient.get(`/orders/${id}`);
    return response;
  },
  getTransactions: async (params) => {
    // 🟩 ĐÃ SỬA: Xóa "/api/v1", chỉ để lại "/transactions"
    const response = await httpClient.get("/transactions", { params });
    return response;
  },
  getTransactionById: async (id) => {
    // 🟩 ĐÃ SỬA: Xóa "/api/v1"
    const response = await httpClient.get(`/transactions/${id}`);
    return response;
  },
  getSepayEvents: async (params) => {
    // 🟩 ĐÃ SỬA: Xóa "/api/v1", chỉ để lại "/sepay-events"
    const response = await httpClient.get("/sepay-events", { params });
    return response;
  },
  getReconciliationRuns: async (params) => {
    // 🟩 ĐÃ SỬA: Xóa "/api/v1", chỉ để lại "/reconciliation-runs"
    const response = await httpClient.get("/reconciliation-runs", {
      params,
    });
    return response;
  },
};
