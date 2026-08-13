/** Trích dữ liệu nghiệp vụ từ cấu trúc response chuẩn của API. */
export function unwrap(response) {
  return response?.data ?? response;
}

/** Chuẩn hóa response danh sách, kể cả khi backend trả Page hoặc ApiResponse. */
export function normalizeList(payload) {
  const data = unwrap(payload);
  const items =
    data?.content ??
    data?.data ??
    data?.items ??
    data?.categories ??
    data?.courses ??
    data;
  return Array.isArray(items) ? items : [];
}
