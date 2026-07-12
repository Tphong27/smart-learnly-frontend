import { Outlet } from "react-router-dom";
import { LayoutBackground } from "./LayoutBackground";

export function TraineeLayout({ children }) {
  // Nếu có children truyền vào thì render children, không thì render Outlet của Router
  return <LayoutBackground>{children || <Outlet />}</LayoutBackground>;
}
