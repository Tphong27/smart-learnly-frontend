import { Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { TrainerLayout } from "../layouts/TrainerLayout";
import {
  StaffFlashTestListPage,
  StaffFlashTestCreatePage,
  StaffFlashTestMonitorPage,
  StaffTestListPage,
  StaffTestCreatePage,
  StaffTestMonitorPage,
  TestAttemptDetailPage,
} from "@/features/flashtest";
// import { TrainerLayout } from "@/app/layouts/TrainerLayout";
import { AdminCoursesPage, AdminCourseFormPage } from "@/features/admin";
import AdminCourseContentPage from "@/features/course/pages/AdminCourseContentPage";
import AdminLessonDetailPage from "@/features/course/pages/AdminLessonDetailPage";
import {
  StaffClassListPage,
  EditionClassPage,
  ClassDetailPage,
  TrainerLessonDetailPage,
  ClassAnalyticsRedirect
} from "@/features/classroom";

/** Khai báo route staff theo từng nhóm quyền Trainer, TMO và SME. */
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
            { path: "courses", element: <AdminCoursesPage /> },
            {
              path: "courses/:courseId",
              element: <AdminCourseFormPage />,
            },
            {
              element: <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.TMO]} />,
              children: [
                {
                  path: "courses/:courseId/edit",
                  element: <AdminCourseFormPage />,
                },
              ],
            },
            // Master curriculum authoring: chỉ SME/TMO (và admin routes riêng).
            // Trainer customize theo class tại /staff/classrooms/:classId/workspace?tab=curriculum.
            {
              element: <RoleGuard allowedRoles={[ROLES.TMO, ROLES.SME]} />,
              children: [
                {
                  path: "courses/:courseId/content",
                  element: <AdminCourseContentPage />,
                },
                {
                  path: "courses/:courseId/lessons/:lessonId",
                  element: <AdminLessonDetailPage />,
                },
              ],
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
              path: "tests/attempts/:testId/:attemptId",
              element: <TestAttemptDetailPage />,
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
              children: [
                {
                  index: true,
                  element: <EditionClassPage />,
                },
              ],
            },
            {
              path: "classrooms/:classId/edit",
              element: <RoleGuard allowedRoles={[ROLES.TMO]} />,
              children: [
                {
                  index: true,
                  element: <EditionClassPage />,
                },
              ],
            },
            {
              path: "classrooms/:classId/analytics",
              element: <ClassAnalyticsRedirect />,
            },
            {
              path: "classrooms/:classId/workspace",
              element: <ClassDetailPage />,
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
      element: <Navigate to="/admin/courses" replace />,
    },
    {
      path: "/tmo/dashboard",
      element: <Navigate to="/staff/courses" replace />,
    },
  ];
}

export default getStaffRoutes;
