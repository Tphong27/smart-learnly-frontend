import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import TraineeLayout from "@/app/layouts/TraineeLayout";

export const traineeRoutes = [
  {
    path: "/learning",
    element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
    children: [
      {
        element: <TraineeLayout />,
        children: [
          // TRAINEE được vào: Course, Class, Test, Flashcard, AI Chatbot
          { path: "courses", element: <div>Trang Courses của Học viên</div> },
          { path: "classrooms", element: <div>Trang Class của Học viên</div> },
          { path: "tests", element: <div>Trang Tests của Học viên</div> },
          { path: "flashcards", element: <div>Trang Flashcards</div> },
          { path: "ai-chatbot", element: <div>Trang AI Chatbot</div> },
        ],
      },
    ],
  },
];
