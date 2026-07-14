/* eslint-disable react-refresh/only-export-components */
import { Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { TrainerLayout } from "../layouts/TrainerLayout";
// ĐÃ SỬA: Import đầy đủ các trang quản lý bài test từ feature flashtest
import {
  StaffFlashTestListPage,
  StaffFlashTestCreatePage,
  StaffFlashTestMonitorPage,
  StaffTestListPage,
  StaffTestCreatePage,
  StaffTestMonitorPage,
} from "@/features/flashtest";
// import { StaffLayout } from "@/app/layouts/StaffLayout";
import { AdminCoursesPage, AdminCourseFormPage } from "@/features/admin";
import AdminCourseContentPage from "@/features/course/pages/AdminCourseContentPage";
import AdminLessonDetailPage from "@/features/course/pages/AdminLessonDetailPage";
import {
  StaffClassListPage,
  TmoCreateClassPage,
  ClassDetailPage,
  TrainerLessonDetailPage,
  ClassAnalyticsPage,
} from "@/features/classroom";

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
      path: "/staff",
      element: <TrainerLayout />,
      children: [
        // NHÓM CHUNG: Cả 3 quyền Trainer, TMO, SME đều xem được danh sách khoá học, bài test, flashcard
        {
          element: (
            <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.TMO, ROLES.SME]} />
          ),
          children: [
            {
              path: "classrooms/:classId/analytics",
              element: <ClassAnalyticsPage />,
            },
            { path: "courses", element: <AdminCoursesPage /> },
            {
              path: "courses/:courseId/edit",
              element: <AdminCourseFormPage />,
            },
            {
              path: "courses/:courseId/content",
              element: <AdminCourseContentPage />,
            },
            {
              path: "courses/:courseId/lessons/:lessonId",
              element: <AdminLessonDetailPage />,
            },
            {
              path: "tests",
              element: <StaffTestListPage />,
            },
            {
              path: "tests/create",
              element: <StaffTestCreatePage />,
            },
            {
              path: "tests/edit/:id/:type",
              element: <StaffTestCreatePage />,
            },
            {
              path: "tests/monitor/:id/:type",
              element: <StaffTestMonitorPage />,
            },
            {
              path: "flashcards",
              element: <PlaceholderPage title="Flashcards Management" />,
            },
            {
              path: "flashtests",
              element: <StaffFlashTestListPage />,
            },
            {
              path: "flashtests/create",
              element: <StaffFlashTestCreatePage />,
            },
            {
              path: "flashtests/edit/:id/:type",
              element: <StaffFlashTestCreatePage />,
            },
            {
              path: "flashtests/monitor/:id/:type",
              element: <StaffFlashTestMonitorPage />,
            },
            {
              path: "assignments",
              element: <StaffFlashTestListPage variant="assignment" />,
            },
            {
              path: "assignments/create",
              element: <StaffFlashTestCreatePage variant="assignment" />,
            },
            {
              path: "assignments/edit/:id/:type",
              element: <StaffFlashTestCreatePage variant="assignment" />,
            },
            {
              path: "assignments/monitor/:id/:type",
              element: <StaffFlashTestMonitorPage />,
            },
          ],
        },
        // NHÓM RIÊNG 1: Chỉ Trainer và TMO vào được quản lý lớp học
        {
          element: <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.TMO]} />,
          children: [
            {
              path: "classrooms",
              element: <StaffClassListPage />,
            },
            {
              path: "classrooms/create",
              element: <RoleGuard allowedRoles={[ROLES.TMO]} />,
              children: [{ index: true, element: <TmoCreateClassPage /> }],
            },
            {
              path: "classrooms/:classId/workspace",
              element: <ClassDetailPage />,
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
    // Trainer lesson editor mirror of AdminLessonDetailPage, scoped to a
    // class draft curriculum. Audit history is hidden here.
    {
      path: "/trainer",
      element: <TrainerLayout />,
      children: [
        {
          element: (
            <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.TMO, ROLES.ADMIN]} />
          ),
          children: [
            {
              path: "classes/:classId/curriculum/lessons/:lessonId",
              element: <TrainerLessonDetailPage />,
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
