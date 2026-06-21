/* eslint-disable react-refresh/only-export-components */
import { Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { AppLayout } from "../layouts/AppLayout";
import { CartPage } from "@/features/cart";
import { MyCoursesPage } from "@/features/course";
import { CheckoutPage, PaymentResultPage as CheckoutPaymentResultPage } from "@/features/checkout";
import { MyEnrollmentsPage } from "@/features/enrollment";
import { MyTransactionsPage, PaymentResultPage } from "@/features/payment";

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

// 🟩 ĐỔI THÀNH: Hàm thường không export trực tiếp trên dòng này
function getTraineeRoutes() {
  return [
    {
      path: "/learning",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { path: "courses", element: <MyCoursesPage /> },
            { path: "enrollments", element: <MyEnrollmentsPage /> },
            { path: "transactions", element: <MyTransactionsPage /> },
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
              element: <PlaceholderPage title="Flashcards" />,
            },
            {
              path: "ai-chatbot",
              element: <PlaceholderPage title="AI Chatbot" />,
            },
          ],
        },
      ],
    },
    {
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { path: "/my-courses", element: <Navigate to="/learning/courses" replace /> },
            { path: "/my-enrollments", element: <Navigate to="/learning/enrollments" replace /> },
            { path: "/my-transactions", element: <Navigate to="/learning/transactions" replace /> },
            { path: "/cart", element: <CartPage /> },
            { path: "/checkout/:orderId", element: <CheckoutPage /> },
            { path: "/checkout/:orderId/result", element: <CheckoutPaymentResultPage /> },
            { path: "/payment-result", element: <PaymentResultPage /> },
          ],
        },
      ],
    },
    {
      path: "/dashboard",
      element: <Navigate to="/learning/courses" replace />,
    },
  ];
}

// 🟩 THÊM DÒNG NÀY Ở CUỐI FILE: Xuất bản mặc định để loại bỏ lỗi "does not provide an export"
export default getTraineeRoutes;
