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
  AdminQuestionBanksPage,
  AdminQuestionBankDetailPage,
  AdminQuestionFormPage,
} from "@/features/admin";
import AdminOrdersPage from "@/features/checkout/pages/AdminOrdersPage";
import AdminTransactionsPage from "@/features/checkout/pages/AdminTransactionsPage";

import AdminCourseContentPage from "@/features/course/pages/AdminCourseContentPage";

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
              path: "dashboard",
              element: <PlaceholderPage title="Admin Dashboard" />,
            },
            { path: "courses", element: <AdminCoursesPage /> },
            { path: "courses/new", element: <AdminCourseFormPage /> },
            { path: "courses/:courseId", element: <AdminCourseFormPage /> },
            {
              path: "courses/:courseId/content",
              element: <AdminCourseContentPage />,
            },
            {
              path: "courses/:courseId/lessons/:lessonId",
              element: <AdminLessonDetailPage />,
            },
            { path: "categories", element: <AdminCategoriesPage /> },
            { path: "question-banks", element: <AdminQuestionBanksPage /> },
            { path: "question-banks/:bankId", element: <AdminQuestionBankDetailPage /> },
            { path: "question-banks/:bankId/questions/new", element: <AdminQuestionFormPage /> },
            { path: "questions/:questionId/edit", element: <AdminQuestionFormPage /> },
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
export default getAdminRoutes;


