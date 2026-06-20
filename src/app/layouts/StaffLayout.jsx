import { Outlet } from "react-router-dom";

export function StaffLayout({ children }) {
  return <>{children || <Outlet />}</>;
}
