import { Outlet } from "react-router-dom";
import { LayoutBackground } from "./LayoutBackground";

export function StaffLayout({ children }) {
  return <LayoutBackground>{children || <Outlet />}</LayoutBackground>;
}
