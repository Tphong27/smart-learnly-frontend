import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "@/services";
import { isRoleAllowed } from "@/shared/constants/roles"; // Đảm bảo đúng đường dẫn tới file roles.js

export function RoleGuard({ allowedRoles = [] }) {
  const user = getCurrentUser();

  // 1. Chưa đăng nhập -> Đẩy về login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isRoleAllowed(user.role, allowedRoles)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />;
}
