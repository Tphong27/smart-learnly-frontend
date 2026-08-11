import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { AppLayout } from "@/app/layouts/AppLayout";
import { PlaceholderPage } from "./PlaceholderPage";
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
} from "@/features/classroom";

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
          element: <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.TMO]} />,
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
              allowedRoles={[ROLES.ADMIN, ROLES.TMO, ROLES.SME, ROLES.TRAINER]}
            />
          ),
          children: [
            {
              path: "courses/:courseId/content",
              element: <AdminCourseContentPage />,
            },
            {
              path: "courses/:courseId/questions",
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
            {
              path: "courses/:courseId/questions/ai-drafts/new",
              element: <AdminAiQuestionDraftCreatePage />,
            },
            {
              path: "courses/:courseId/questions/ai-drafts/:batchId",
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
              path: "users-management",
              element: <AdminUsersPage />,
            },
            { path: "audit-log", element: <AdminAuditLogPage /> },
            {
              path: "flashtests",
              element: <PlaceholderPage title="Flash Tests Management" />,
            },
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
