const API_BASE_URL =
  import.meta.env.VITE_API_URL
  ?? import.meta.env.VITE_API_BASE_URL
  ?? "http://localhost:8080/api/v1";

export async function request(path, options = {}) {
  // 1. Tự động lấy Token từ Storage để gắn vào Request (Chuẩn bị cho quyền Admin)
  const token = localStorage.getItem("accessToken"); // Tùy chỉnh tên key nếu team bạn đặt khác
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // 2. Kỹ thuật xử lý Header cho việc Upload File
  const isFormData = options.body instanceof FormData;
  const customHeaders = {
    ...authHeader,
    ...options.headers,
  };

  // CHỈ set application/json nếu KHÔNG PHẢI là tải file.
  // Nếu là tải file (FormData), trình duyệt sẽ tự lo phần Content-Type.
  if (!isFormData && !customHeaders["Content-Type"]) {
    customHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: customHeaders,
  });

  if (!response.ok) {
    // Cố gắng đọc thông báo lỗi từ Backend trả về (Ví dụ: "File quá lớn")
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Bỏ qua nếu lỗi không phải dạng JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
