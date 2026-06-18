import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "@/services";
import { ROLES } from "@/shared/constants/roles"; // Đảm bảo đúng đường dẫn tới file roles.js

export function RoleGuard({ allowedRoles = [] }) {
  const user = getCurrentUser();

  // 1. Chưa đăng nhập -> Đẩy về login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = typeof user.role === 'string' ? user.role.toLowerCase() : user.role
  const normalized = allowedRoles.map((r) => (typeof r === 'string' ? r.toLowerCase() : r))

  if (!normalized.includes(userRole)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />;
}
