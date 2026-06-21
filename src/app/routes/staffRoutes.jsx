import { Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { AppLayout } from "../layouts/AppLayout";
import { StaffLayout } from "@/app/layouts/StaffLayout";
import { AdminCoursesPage } from "@/features/admin";

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

function getStaffRoutes() {
  return [
    {
      // 🟩 ĐƯA THẲNG APPLAYOUT LÊN ĐÂY: Để Sidebar/Topbar ôm trọn cụm /staff
      path: "/staff",
      element: <AppLayout />,
      children: [
        // NHÓM CHUNG: Cả 3 quyền Trainer, TMO, SME đều xem được danh sách khoá học, bài test, flashcard
        {
          element: (
            <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.TMO, ROLES.SME]} />
          ),
          children: [
            { path: "courses", element: <AdminCoursesPage /> },
            {
              path: "tests",
              element: <PlaceholderPage title="Tests & Questions" />,
            },
            {
              path: "flashcards",
              element: <PlaceholderPage title="Flashcards Management" />,
            },
          ],
        },
        // NHÓM RIÊNG 1: Chỉ Trainer và TMO vào được quản lý lớp học
        {
          element: <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.TMO]} />,
          children: [
            {
              path: "classrooms",
              element: <PlaceholderPage title="Classrooms" />,
            },
          ],
        },
        // NHÓM RIÊNG 2: Chỉ TMO và SME vào được cấu hình Bot AI
        {
          element: <RoleGuard allowedRoles={[ROLES.TMO, ROLES.SME]} />,
          children: [
            {
              path: "ai-chatbot",
              element: <PlaceholderPage title="AI Chatbot Config" />,
            },
          ],
        },
        // NHÓM RIÊNG 3: Chỉ duy nhất TMO xem được báo cáo doanh thu/hệ thống
        {
          element: <RoleGuard allowedRoles={[ROLES.TMO]} />,
          children: [
            {
              path: "reports",
              element: <PlaceholderPage title="Reports & Analytics" />,
            },
          ],
        },
      ],
    },
    {
      path: "/trainer/dashboard",
      element: <Navigate to="/staff/courses" replace />,
    },
    {
      path: "/sme/dashboard",
      element: <Navigate to="/staff/courses" replace />,
    },
    {
      path: "/tmo/dashboard",
      element: <Navigate to="/staff/courses" replace />,
    },
  ];
}

export default getStaffRoutes;
