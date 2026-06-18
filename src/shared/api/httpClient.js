const API_BASE_URL =
  import.meta.env.VITE_API_URL
  ?? import.meta.env.VITE_API_BASE_URL
  ?? "http://localhost:8080/api/v1";

export async function request(path, options = {}) {
  // 1. Tự động lấy Token từ Storage để gắn vào Request
  const token = localStorage.getItem("accessToken");

  // SỬA TẠI ĐÂY: Chỉ gắn Header Authorization nếu có token thực sự (không chấp nhận chuỗi "undefined" hoặc "null")
  const authHeader =
    token && token !== "undefined" && token !== "null"
      ? { Authorization: `Bearer ${token}` }
      : {};

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

  // Tự động xóa token rác và đá về trang login nếu Backend trả về 401 khi đang gọi các API cần quyền hạn khác
  if (
    response.status === 401 &&
    !path.includes("/auth/login") &&
    !path.includes("/auth/register")
  ) {
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
    return null;
  }

  // SỬA TẠI ĐÂY: Cải tiến bộ bắt lỗi để đẩy đủ dữ liệu về cho giao diện (UI) hiển thị
  if (!response.ok) {
    let errorData = null;
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Bỏ qua nếu lỗi không phải dạng JSON
    }

    // Tạo custom error mang theo thông tin status và data của lỗi
    const customError = new Error(errorMessage);
    customError.status = response.status;
    customError.data = errorData;

    throw customError;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
