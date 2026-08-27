import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { AppLayout } from "@/app/layouts/AppLayout";
import {
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
import { CourseQuestionLegacyRedirect } from "./CourseQuestionLegacyRedirect";

/** Khai báo route quản trị: ADMIN = hệ thống; TMO/SME = tài nguyên. */
function getAdminRoutes() {
  return [
    {
      path: "/admin",
      element: <AppLayout />,
      children: [
        // TMO: lifecycle khóa học + taxonomy + commerce ops
        {
          element: <RoleGuard allowedRoles={[ROLES.TMO]} />,
          children: [
            {
              path: "courses",
              element: <AdminCoursesPage />,
            },
            {
              path: "courses/new",
              element: <AdminCourseFormPage />,
            },
            {
              path: "categories",
              element: <AdminCategoriesPage />,
            },
            {
              path: "transactions",
              element: <TransactionsPage mode="management" />,
            },
          ],
        },
        // TMO + SME: form chi tiết khóa học (SME read-only ở page)
        {
          element: <RoleGuard allowedRoles={[ROLES.TMO, ROLES.SME]} />,
          children: [
            {
              path: "courses/:courseId",
              element: <AdminCourseFormPage />,
            },
          ],
        },
        // Nội dung khóa học / question bank — không còn ADMIN
        {
          element: (
            <RoleGuard allowedRoles={[ROLES.TMO, ROLES.SME, ROLES.TRAINER]} />
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
              path: "courses/:courseId/modules/:moduleId/questions",
              element: <CourseQuestionLegacyRedirect basePath="/admin" />,
            },
            {
              path: "courses/:courseId/lessons/:lessonId",
              element: <AdminLessonDetailPage />,
            },
          ],
        },
        {
          element: (
            <RoleGuard allowedRoles={[ROLES.SME, ROLES.TMO, ROLES.TRAINER]} />
          ),
          children: [
            // Giữ deep-link cũ để notification đã lưu không rơi vào trang lỗi quyền.
            {
              path: "courses/:courseId/questions/ai-drafts/:batchId",
              element: <AdminAiQuestionDraftReviewPage />,
            },
            {
              path: "courses/:courseId/questions/ai-drafts/new",
              element: <AdminAiQuestionDraftCreatePage />,
            },
            {
              path: "courses/:courseId/modules/:moduleId/questions/ai-drafts/new",
              element: (
                <CourseQuestionLegacyRedirect
                  basePath="/admin"
                  destination="ai-create"
                />
              ),
            },
            {
              path: "courses/:courseId/modules/:moduleId/questions/ai-drafts/:batchId",
              element: (
                <CourseQuestionLegacyRedirect
                  basePath="/admin"
                  destination="ai-review"
                />
              ),
            },
          ],
        },
        // ADMIN only: dashboard hệ thống, user admin, settings
        {
          element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
          children: [
            { path: "dashboard", element: <AdminDashboardPage /> },
            {
              path: "users-management",
              element: <AdminUsersPage />,
            },
            {
              path: "settings",
              element: <AdminSystemSettingsPage />,
            },
          ],
        },
      ],
    },
  ];
}
export default getAdminRoutes;
