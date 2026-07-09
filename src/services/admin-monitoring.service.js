import { request } from "../shared/api/httpClient";

function unwrapApiResponse(response) {
  return response?.data ?? response;
}

const httpClient = {
  get: async (path, config = {}) => {
    const { params, ...options } = config;
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    const response = await request(`${path}${query}`, { method: "GET", ...options });
    return unwrapApiResponse(response);
  },
  post: async (path, body, config = {}) => {
    const response = await request(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...config,
    });
    return unwrapApiResponse(response);
  },
  put: async (path, body, config = {}) => {
    const response = await request(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...config,
    });
    return unwrapApiResponse(response);
  },
  delete: async (path, config = {}) => {
    const response = await request(path, { method: "DELETE", ...config });
    return unwrapApiResponse(response);
  },
};

export const adminMonitoringService = {
  getOrders: async (params) => {
    return httpClient.get("/orders", { params });
  },

  getOrderById: async (id) => {
    return httpClient.get(`/orders/${id}`);
  },

  getTransactions: async (params) => {
    return httpClient.get("/transactions", { params });
  },

  getTransactionById: async (id) => {
    return httpClient.get(`/transactions/${id}`);
  },

  getSepayEvents: async (params) => {
    return httpClient.get("/sepay-events", { params });
  },

  getReconciliationRuns: async (params) => {
    return httpClient.get("/reconciliation-runs", { params });
  },
};