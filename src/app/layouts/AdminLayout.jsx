import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import Breadcrumb from "../../shared/components/Breadcrumb";
import { getCurrentUser } from "@/services";
import "./AdminLayout.css";

export function AdminLayout() {
  const navigate = useNavigate();

  // Lấy thông tin user hiện tại hoặc dùng dữ liệu mặc định hệ thống
  const user = getCurrentUser() || {
    role: "admin",
    firstName: "System",
    lastName: "Admin",
    email: "admin@smartlearnly.com",
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="app-layout-wrapper">
      {/* 📌 SIDEBAR CỐ ĐỊNH BÊN TRÁI */}
      <Sidebar userRole={user.role} />

      {/* ⚙️ KHỐI CHỨA NỘI DUNG CHÍNH BÊN PHẢI */}
      <div className="app-main-wrapper">
        {/* VÙNG CHỨA HEADER */}
        <div className="app-admin-header-zone">
          <Header user={user} onLogout={handleLogout} />
        </div>

        {/* VÙNG HIỂN THỊ NỘI DUNG CÁC TRANG CON */}
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
