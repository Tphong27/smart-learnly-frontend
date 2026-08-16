import { Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { TrainerLayout } from "../layouts/TrainerLayout";
import {
  StaffAssessmentListPage,
  StaffAssessmentCreatePage,
  TeacherMonitorPage,
  TestAttemptDetailPage,
} from "@/features/test";
// import { TrainerLayout } from "@/app/layouts/TrainerLayout";
import {
  AdminCoursesPage,
  AdminCourseFormPage,
  AdminQuestionBankDetailPage,
} from "@/features/admin";
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
        // TMO chỉ dùng danh sách course ở chế độ xem và danh sách assignment theo lớp.
        {
          element: (
            <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.TMO, ROLES.SME]} />
          ),
          children: [
            { path: "courses", element: <AdminCoursesPage /> },
            {
              path: "assignments",
              element: <StaffAssessmentListPage variant="assignment" />,
            },
            {
              path: "tests",
              element: <StaffAssessmentListPage variant="test" />,
            },
          ],
        },
        // Trainer và SME giữ các công cụ authoring và assignment mutation.
        {
          element: <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.SME]} />,
          children: [
            {
              path: "courses/:courseId",
              element: <AdminCourseFormPage />,
            },
            {
              path: "courses/:courseId/modules/:moduleId/questions",
              element: <AdminQuestionBankDetailPage />,
            },
            {
              path: "courses/:courseId/edit",
              element: <RoleGuard allowedRoles={[ROLES.TRAINER]} />,
              children: [
                {
                  index: true,
                  element: <AdminCourseFormPage />,
                },
              ],
            },
            {
              path: "assignments/create",
              element: <StaffAssessmentCreatePage variant="assignment" />,
            },
            {
              path: "tests/create",
              element: <StaffAssessmentCreatePage variant="test" />,
            },
            {
              path: "assignments/edit/:id/:type",
              element: <StaffAssessmentCreatePage variant="assignment" />,
            },
            {
              path: "tests/edit/:id/:type",
              element: <StaffAssessmentCreatePage variant="test" />,
            },
            {
              path: "assignments/monitor/:id/:type",
              element: <TeacherMonitorPage variant="assignment" />,
            },
            {
              path: "tests/monitor/:id/:type",
              element: <TeacherMonitorPage variant="test" />,
            },
            {
              path: "tests/attempts/:testId/:attemptId",
              element: <TestAttemptDetailPage />,
            },
          ],
        },
        // Master course curriculum chỉ do SME author; Trainer chỉnh theo từng lớp.
        {
          element: <RoleGuard allowedRoles={[ROLES.SME]} />,
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
            {
              path: "classrooms/:classId/curriculum/lessons/:lessonId",
              element: <RoleGuard allowedRoles={[ROLES.TRAINER]} />,
              children: [
                {
                  index: true,
                  element: <TrainerLessonDetailPage />,
                },
              ],
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
            <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.ADMIN]} />
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
      element: <Navigate to="/staff/classrooms" replace />,
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
