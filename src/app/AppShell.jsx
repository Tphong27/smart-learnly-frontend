import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleGuard } from "./routes/RoleGuard";
import { HomePage } from "../features/home/HomePage";
import { ROLES } from "../shared/constants/roles";

// =========================================================
// IMPORT CÁC TRANG BÁO LỖI XỊN TỪ THƯ MỤC PAGES
// =========================================================
import { NotFoundPage } from "./pages/error/NotFoundPage";
import { ForbiddenPage } from "./pages/error/ForbiddenPage";
import { ServerErrorPage } from "./pages/error/ServerErrorPage";

// Hàm hiển thị tạm thời (BẮT BUỘC PHẢI CÓ để các trang dưới không bị crash)
function PlaceholderPage({ title }) {
  return (
    <section
      className="app-placeholder"
      style={{ padding: "40px", textAlign: "center" }}
    >
      <h1>{title} Màn Hình Phẳng</h1>
      <p>
        Đây là giao diện tạm thời cho trang <strong>{title}</strong>.
      </p>
    </section>
  );
}

// ---------------------------------------------------------
// CẤU HÌNH COMPONENT LOGIN & REGISTER
// ---------------------------------------------------------
function LoginPage() {
  return <PlaceholderPage title="Login" />;
}

function RegisterPage() {
  return <PlaceholderPage title="Register" />;
}

export function AppShell() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========================================================= */}
        {/* 1. PUBLIC ROUTES: Hiển thị phẳng trực tiếp, không bọc gì cả */}
        {/* ========================================================= */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ========================================================= */}
        {/* 2. PROTECTED ROUTES: Luồng đăng nhập kiểm tra quyền        */}
        {/* ========================================================= */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route
              path="/dashboard"
              element={<PlaceholderPage title="Dashboard" />}
            />
            <Route
              path="/profile"
              element={<PlaceholderPage title="Profile" />}
            />
            <Route
              path="/my-courses"
              element={<PlaceholderPage title="My Courses" />}
            />
            <Route path="/tests" element={<PlaceholderPage title="Tests" />} />

            {/* Phân quyền: SME & ADMIN */}
            <Route
              element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.SME]} />}
            >
              <Route
                path="/sme/content"
                element={<PlaceholderPage title="Course Content" />}
              />
              <Route
                path="/sme/questions"
                element={<PlaceholderPage title="Question Bank" />}
              />
            </Route>

            {/* Phân quyền: Chỉ ADMIN */}
            <Route element={<RoleGuard allowedRoles={[ROLES.ADMIN]} />}>
              <Route
                path="/admin/courses"
                element={<PlaceholderPage title="Admin Course Management" />}
              />
              <Route
                path="/admin/users"
                element={<PlaceholderPage title="Users & Roles" />}
              />
              <Route
                path="/settings"
                element={<PlaceholderPage title="System Settings" />}
              />
            </Route>

            {/* Phân quyền: TMO & ADMIN */}
            <Route
              element={<RoleGuard allowedRoles={[ROLES.TMO, ROLES.ADMIN]} />}
            >
              <Route
                path="/reports"
                element={<PlaceholderPage title="Reports" />}
              />
            </Route>

            {/* Phân quyền: TRAINER */}
            <Route element={<RoleGuard allowedRoles={[ROLES.TRAINER]} />}>
              <Route
                path="/trainer/classes"
                element={<PlaceholderPage title="Trainer Classes" />}
              />
            </Route>
          </Route>
        </Route>

        {/* ========================================================= */}
        {/* 3. ERROR ROUTES: Trả trực tiếp các trang lỗi phẳng        */}
        {/* ========================================================= */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
