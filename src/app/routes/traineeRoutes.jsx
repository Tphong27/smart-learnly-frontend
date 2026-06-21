import { Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { AppLayout } from "../layouts/AppLayout";
import { MyCoursesPage } from "@/features/course";
import { CartPage } from "@/features/cart/pages/CartPage";
import { CheckoutPage } from "@/features/checkout/pages/CheckoutPage";
import { PaymentResultPage } from "@/features/checkout/pages/PaymentResultPage";

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
      path: "/learning",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { path: "courses", element: <MyCoursesPage /> },
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
      path: "/cart",
      element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
      children: [
        {
          element: <AppLayout />,
          children: [{ index: true, element: <CartPage /> }],
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
          children: [{ index: true, element: <PaymentResultPage /> }],
        },
      ],
    },

    {
      path: "/dashboard",
      element: <Navigate to="/learning/courses" replace />,
    },
  ];
}

export default getTraineeRoutes;