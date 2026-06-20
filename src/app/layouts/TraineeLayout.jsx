import { Outlet } from "react-router-dom";

export function TraineeLayout({ children }) {
  // Nếu có children truyền vào thì render children, không thì render Outlet của Router
  return <>{children || <Outlet />}</>;
}
