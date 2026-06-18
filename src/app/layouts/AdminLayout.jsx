import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import Breadcrumb from "../../shared/components/Breadcrumb"; // Dùng đường dẫn tương đối để tránh lỗi alias thương hiệu
import { getCurrentUser } from "@/services";

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const user = getCurrentUser() || {
    role: "admin",
    firstName: "System",
    lastName: "Admin",
    email: "admin@smartlearnly.com",
  };

  const handleToggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const handleCloseSidebar = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="app-layout-wrapper">
      <Sidebar
        userRole={user.role}
        open={isSidebarOpen}
        onClose={handleCloseSidebar}
      />

      <div className="app-main-wrapper">
        <Header
          user={user}
          onToggleSidebar={handleToggleSidebar}
          onLogout={handleLogout}
        />

        <main className="app-content-area">
          <div className="app-content-inner">
            <Breadcrumb />

            <div className="app-page-container">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
