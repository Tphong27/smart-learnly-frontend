/* eslint-disable react-refresh/only-export-components */
import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { AppLayout } from "@/app/layouts/AppLayout";
import {
  AdminAuditLogPage,
  AdminCategoriesPage,
  AdminCoursesPage,
  AdminCourseFormPage,
  AdminUsersPage,
  AdminSystemSettingsPage,
} from "@/features/admin";
// IMPORT TRANG KÉO THẢ NỘI DUNG CỦA DEV F VÀO ĐÂY
import AdminOrdersPage from "@/features/checkout/pages/AdminOrdersPage";
import AdminTransactionsPage from "@/features/checkout/pages/AdminTransactionsPage";

// IMPORT TRANG KÉO THẢ NỘI DUNG CỦA DEV F VÀO ĐÂY
import AdminCourseContentPage from "@/features/course/pages/AdminCourseContentPage";

// 🛠️ THÊM MỚI: Import trang cấu hình chi tiết nội dung bài học
import AdminLessonDetailPage from "@/features/course/pages/AdminLessonDetailPage";

function PlaceholderPage({ title }) {
  return (
    <section className="placeholder-page">
      <span className="placeholder-page__eyebrow">Coming soon</span>
      <h1 className="placeholder-page__title">{title}</h1>
      <p className="placeholder-page__text">
        This is a placeholder page for <strong>{title}</strong>. Content will be
        added in future sprints.
      </p>
    </section>
  );
}

// 🟩 ĐỔI THÀNH HÀM giống y hệt getTraineeRoutes
function getAdminRoutes() {
  return [
    {
      path: "/admin",
      element: <AppLayout />,
      children: [
        {
          // 🟩 ĐÃ SỬA: Mở khóa Frontend cho TMO và SME vào quản lý khóa học
          element: (
            <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.TMO, ROLES.SME]} />
          ),
          children: [
            {
              path: "dashboard",
              element: <PlaceholderPage title="Admin Dashboard" />,
            },
            { path: "courses", element: <AdminCoursesPage /> },
            { path: "courses/new", element: <AdminCourseFormPage /> },
            { path: "courses/:courseId", element: <AdminCourseFormPage /> },

            // 🛠️ THÊM ROUTE NÀY: Trang cấu trúc chương & bài học (Dev F - Sprint 2)
            {
              path: "courses/:courseId/content",
              element: <AdminCourseContentPage />,
            },

            // 🛠️ THÊM ROUTE NÀY: Trang cấu hình chi tiết bài học (Sửa lỗi 404)
            {
              path: "courses/:courseId/lessons/:lessonId",
              element: <AdminLessonDetailPage />,
            },
            { path: "categories", element: <AdminCategoriesPage /> },
          ],
        },
        {
          element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
          children: [
            { path: "users-management", element: <AdminUsersPage /> },
            { path: "audit-log", element: <AdminAuditLogPage /> },
            { path: "settings", element: <AdminSystemSettingsPage /> },
          ],
        },
        {
          element: <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.TMO]} />,
          children: [
            { path: "orders", element: <AdminOrdersPage /> },
            { path: "transactions", element: <AdminTransactionsPage /> },
          ],
        },
      ],
    },
  ];
}

// Xuất bản mặc định hàm
export default getAdminRoutes;
