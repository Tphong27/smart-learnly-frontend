import { Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { PlaceholderPage } from "./PlaceholderPage";
import { ROLES } from "@/shared/constants/roles";
import { TraineeLayout } from "../layouts/TraineeLayout";
import {
  CheckoutPage,
  MyTransactionsPage,
  PaymentResultPage,
} from "@/features/checkout";
import { MyEnrollmentsPage } from "@/features/enrollment";
import {
  TraineeFlashTestListPage,
  TraineeFlashTestTakePage,
  TraineeAssignmentTakePage,
  TraineeTestListPage,
  TraineeTestTakePage,
  TestAttemptDetailPage,
} from "@/features/flashtest";
import {
  CourseListPage,
  LearningFlashcardsPage,
} from "@/features/course";
import { LearningWorkspacePage } from "@/features/learning";
import { TraineeDashboardPage } from "@/features/dashboard";
import { TraineeProgressPage } from "@/features/progress";
import { OpeningSchedulePage } from "@/features/opening-schedule";
import { SchedulePage } from "@/features/schedule";

/** Tạo cấu hình route dành cho học viên, giữ nguyên guard và URL công khai. */
function getTraineeRoutes() {
  return [
    {
      // Learning workspace - fullscreen, outside TraineeLayout (giống admin "view as user")
      // để màn hình học bài hiển thị y hệt chế độ admin-preview.
      path: "/learning/courses/:courseId",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [{ index: true, element: <LearningWorkspacePage /> }],
    },
    {
      path: "/learning/flashtests/take/:id/:type",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [{ index: true, element: <TraineeFlashTestTakePage /> }],
    },
    {
      path: "/learning/assignments/take/:id/:type",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [{ index: true, element: <TraineeAssignmentTakePage /> }],
    },
    {
      path: "/learning/tests/take/:id/:type",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [{ index: true, element: <TraineeTestTakePage /> }],
    },
    {
      path: "/learning",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <TraineeLayout />,
          children: [
            {
              path: "courses",
              element: (
                <CourseListPage
                  pageSize={6}
                  defaultSort="NEWEST"
                  detailState={{
                    from: "/learning/courses",
                    backLabel: "Back to Course Catalog",
                  }}
                />
              ),
            },
            {
              path: "opening-schedule",
              element: (
                <OpeningSchedulePage
                  pageSize={6}
                  detailState={{
                    from: "/learning/opening-schedule",
                    backLabel: "Back to Opening Schedule",
                  }}
                />
              ),
            },
            { path: "enrollments", element: <MyEnrollmentsPage /> },
            { path: "transactions", element: <MyTransactionsPage /> },
            { path: "progress", element: <TraineeProgressPage /> },
            {
              path: "schedule",
              element: <SchedulePage />,
            },
            {
              path: "classrooms",
              element: <PlaceholderPage title="Classrooms" />,
            },
            {
              path: "tests",
              element: <TraineeTestListPage />,
            },
            {
              path: "tests/attempts/:testId/:attemptId",
              element: <TestAttemptDetailPage />,
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
              path: "assignments",
              element: <TraineeFlashTestListPage variant="assignment" />,
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
          element: <TraineeLayout />,
          children: [{ index: true, element: <CheckoutPage /> }],
        },
      ],
    },
    {
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <TraineeLayout />,
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
            {
              path: "/payment-result",
              element: <PaymentResultPage />,
            },
          ],
        },
      ],
    },
    {
      path: "/dashboard",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <TraineeLayout />,
          children: [{ index: true, element: <TraineeDashboardPage /> }],
        },
      ],
    },
  ];
}

export default getTraineeRoutes;
