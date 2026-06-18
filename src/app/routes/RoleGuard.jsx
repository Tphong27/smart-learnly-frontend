import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "@/services";
import { ROLES } from "@/shared/constants/roles"; // Đảm bảo đúng đường dẫn tới file roles.js

export function RoleGuard({ allowedRoles = [] }) {
  const user = getCurrentUser();

  // 1. Chưa đăng nhập -> Đẩy về login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Đặc quyền: ADMIN được vào tất cả mọi nơi
  if (user.role === ROLES.ADMIN) {
    return <Outlet />;
  }

  // 3. Kiểm tra các Role khác
  if (!allowedRoles.includes(user.role)) {
    // Đổi "/403" thành path bạn định nghĩa cho ForbiddenPage (ví dụ: /forbidden)
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
