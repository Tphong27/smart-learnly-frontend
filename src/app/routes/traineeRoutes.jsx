/* eslint-disable react-refresh/only-export-components */
import { Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { AppLayout } from "../layouts/AppLayout";
import {
  CheckoutPage,
  PaymentResultPage as CheckoutPaymentResultPage,
} from "@/features/checkout";
import { MyEnrollmentsPage } from "@/features/enrollment";
import { MyTransactionsPage, PaymentResultPage } from "@/features/payment";
import {
  TraineeFlashTestListPage,
  TraineeFlashTestTakePage,
} from "@/features/flashtest";
import {
  CourseListPage,
  LearningFlashcardsPage,
  LearningWorkspacePage,
} from "@/features/course";
import { TraineeDashboardPage } from "@/features/dashboard";
import { TraineeProgressPage } from "@/features/progress";

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

function getTraineeRoutes() {
  return [
    {
      // Learning workspace - fullscreen, outside AppLayout (giống admin "view as user")
      // để màn hình học bài hiển thị y hệt chế độ admin-preview.
      path: "/learning/courses/:courseId",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [{ index: true, element: <LearningWorkspacePage /> }],
    },
    {
      path: "/learning",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <AppLayout />,
          children: [
            {
              path: "courses",
              element: (
                <CourseListPage
                  pageSize={6}
                  excludeEnrolled={true}
                  detailState={{
                    from: "/learning/courses",
                    backLabel: "Back to Course Catalog",
                  }}
                />
              ),
            },
            { path: "enrollments", element: <MyEnrollmentsPage /> },
            { path: "transactions", element: <MyTransactionsPage /> },
            {
              path: "progress",
              element: <TraineeProgressPage />,
            },
            {
              path: "classrooms",
              element: <PlaceholderPage title="Classrooms" />,
            },
            {
              path: "tests",
              element: <PlaceholderPage title="Tests" />,
            },
            {
              path: "flashcards",
              element: <LearningFlashcardsPage />,
            },
            {
              path: "ai-chatbot",
              element: <PlaceholderPage title="AI Chatbot" />,
            },
            {
              path: "flashtests",
              element: <TraineeFlashTestListPage />,
            },
            {
              path: "flashtests/take/:id/:type",
              element: <TraineeFlashTestTakePage />,
            },
          ],
        },
      ],
    },

    {
      path: "/checkout/:orderId",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <AppLayout />,
          children: [{ index: true, element: <CheckoutPage /> }],
        },
      ],
    },

    {
      path: "/checkout/:orderId/result",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <AppLayout />,
          children: [{ index: true, element: <CheckoutPaymentResultPage /> }],
        },
      ],
    },

    {
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <AppLayout />,
          children: [
            {
              path: "/my-courses",
              element: <Navigate to="/learning/courses" replace />,
            },
            {
              path: "/my-enrollments",
              element: <Navigate to="/learning/enrollments" replace />,
            },
            {
              path: "/my-transactions",
              element: <Navigate to="/learning/transactions" replace />,
            },
            { path: "/payment-result", element: <PaymentResultPage /> },
          ],
        },
      ],
    },
    {
      path: "/dashboard",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <AppLayout />,
          children: [{ index: true, element: <TraineeDashboardPage /> }],
        },
      ],
    },
  ];
}

export default getTraineeRoutes;
