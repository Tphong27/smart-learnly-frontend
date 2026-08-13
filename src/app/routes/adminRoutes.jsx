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
  AdminDashboardPage,
  AdminQuestionBankDetailPage,
  AdminAiQuestionDraftCreatePage,
  AdminAiQuestionDraftReviewPage,
} from "@/features/admin";
import { TransactionsPage } from "@/features/checkout";
import AdminCourseContentPage from "@/features/course/pages/AdminCourseContentPage";
import AdminLessonDetailPage from "@/features/course/pages/AdminLessonDetailPage";
import {
  ClassAnalyticsRedirect,
  ClassDetailPage,
  EditionClassPage,
  StaffClassListPage,
  TrainerLessonDetailPage,
} from "@/features/classroom";

/** Khai báo route quản trị và các guard theo quyền nghiệp vụ. */
function getAdminRoutes() {
  return [
    {
      path: "/admin",
      element: <AppLayout />,
      children: [
        {
          element: (
            <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.TMO, ROLES.SME]} />
          ),
          children: [
            {
              path: "courses",
              element: <AdminCoursesPage />,
            },
          ],
        },
        {
          element: <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.SME]} />,
          children: [
            {
              path: "courses/:courseId",
              element: <AdminCourseFormPage />,
            },
            {
              path: "categories",
              element: <AdminCategoriesPage />,
            },
          ],
        },
        {
          element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
          children: [
            {
              path: "courses/new",
              element: <AdminCourseFormPage />,
            },
          ],
        },
        {
          element: (
            <RoleGuard
              allowedRoles={[ROLES.ADMIN, ROLES.SME, ROLES.TRAINER]}
            />
          ),
          children: [
            {
              path: "courses/:courseId/content",
              element: <AdminCourseContentPage />,
            },
            {
              path: "courses/:courseId/modules/:moduleId/questions",
              element: <AdminQuestionBankDetailPage />,
            },
            {
              path: "courses/:courseId/lessons/:lessonId",
              element: <AdminLessonDetailPage />,
            },
          ],
        },
        {
          element: <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.SME]} />,
          children: [
            // Giữ deep-link cũ để notification đã lưu không rơi vào trang lỗi quyền.
            {
              path: "courses/:courseId/questions/ai-drafts/:batchId",
              element: <AdminAiQuestionDraftReviewPage />,
            },
            {
              path: "courses/:courseId/modules/:moduleId/questions/ai-drafts/new",
              element: <AdminAiQuestionDraftCreatePage />,
            },
            {
              path: "courses/:courseId/modules/:moduleId/questions/ai-drafts/:batchId",
              element: <AdminAiQuestionDraftReviewPage />,
            },
          ],
        },
        {
          element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
          children: [
            { path: "dashboard", element: <AdminDashboardPage /> },
            {
              path: "classrooms",
              element: <StaffClassListPage routeBase="/admin/classrooms" />,
            },
            {
              path: "classrooms/create",
              element: <EditionClassPage routeBase="/admin/classrooms" />,
            },
            {
              path: "classrooms/:classId/edit",
              element: <EditionClassPage routeBase="/admin/classrooms" />,
            },
            {
              path: "classrooms/:classId/analytics",
              element: <ClassAnalyticsRedirect routeBase="/admin/classrooms" />,
            },
            {
              path: "classrooms/:classId/workspace",
              element: (
                <ClassDetailPage
                  routeBase="/admin/classrooms"
                  coursePreviewBase="/admin/courses"
                />
              ),
            },
            {
              path: "classrooms/:classId/curriculum/lessons/:lessonId",
              element: <TrainerLessonDetailPage />,
            },
            {
              path: "users-management",
              element: <AdminUsersPage />,
            },
            { path: "audit-log", element: <AdminAuditLogPage /> },
            {
              path: "settings",
              element: <AdminSystemSettingsPage />,
            },
          ],
        },
        {
          element: <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.TMO]} />,
          children: [
            {
              path: "transactions",
              element: <TransactionsPage mode="management" />,
            },
          ],
        },
      ],
    },
  ];
}
export default getAdminRoutes;
