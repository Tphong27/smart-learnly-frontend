import { Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { PlaceholderPage } from "./PlaceholderPage";
import { ROLES } from "@/shared/constants/roles";
import { TraineeLayout } from "../layouts/TraineeLayout";
import {
  CheckoutPage,
  TransactionsPage,
  PaymentResultPage,
} from "@/features/checkout";
import { MyEnrollmentsPage } from "@/features/enrollment";
import {
  TraineeAssessmentListPage,
  TraineeAssignmentTakePage,
  TraineeTestTakePage,
  TestAttemptDetailPage,
} from "@/features/test";
import { LearningWorkspacePage } from "@/features/learning";
import { TraineeDashboardPage } from "@/features/dashboard";
import { OpeningSchedulePage } from "@/features/opening-schedule";

/** Tạo cấu hình route dành cho học viên, giữ nguyên guard và URL công khai. */
function getTraineeRoutes() {
  return [
    {
      // Learning workspace - fullscreen, outside TraineeLayout (giống admin "view as user")
      // để màn hình học bài hiển thị y hệt chế độ admin-preview.
      // TMO/SME/TRAINER cũng vào được khi preview quiz từ staff preview.
      path: "/learning/courses/:courseId",
      element: (
        <RoleGuard
          allowedRoles={[ROLES.TRAINEE, ROLES.TMO, ROLES.SME, ROLES.TRAINER]}
        />
      ),
      children: [{ index: true, element: <LearningWorkspacePage /> }],
    },
    {
      path: "/learning/assignments/take/:id/:type",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [{ index: true, element: <TraineeAssignmentTakePage /> }],
    },
    {
      path: "/learning/course-quizzes/:id",
      element: (
        <RoleGuard
          allowedRoles={[ROLES.TRAINEE, ROLES.TMO, ROLES.SME, ROLES.TRAINER]}
        />
      ),
      children: [{ index: true, element: <TraineeTestTakePage /> }],
    },
    // Attempt detail must allow TMO/SME/TRAINER (view-as-trainee submit flow).
    // Lifted out of TRAINEE-only /learning parent so staff do not hit FE 403.
    {
      path: "/learning/course-quizzes/attempts/:testId/:attemptId",
      element: (
        <RoleGuard
          allowedRoles={[ROLES.TRAINEE, ROLES.TMO, ROLES.SME, ROLES.TRAINER]}
        />
      ),
      children: [
        {
          element: <TraineeLayout />,
          children: [{ index: true, element: <TestAttemptDetailPage /> }],
        },
      ],
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
                <Navigate to="/learning/opening-schedule" replace />
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
            {
              path: "transactions",
              element: <TransactionsPage mode="personal" />,
            },
            {
              path: "progress",
              element: <Navigate to="/dashboard" replace />,
            },
            {
              path: "classrooms",
              element: <PlaceholderPage title="Classrooms" />,
            },
            {
              path: "tests",
              element: <TraineeAssessmentListPage variant="test" />,
            },
            {
              path: "tests/attempts/:testId/:attemptId",
              element: <TestAttemptDetailPage />,
            },
            {
              path: "ai-chatbot",
              element: <PlaceholderPage title="AI Chatbot" />,
            },
            {
              path: "assignments",
              element: <TraineeAssessmentListPage variant="assignment" />,
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
              element: (
                <Navigate to="/learning/opening-schedule" replace />
              ),
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
