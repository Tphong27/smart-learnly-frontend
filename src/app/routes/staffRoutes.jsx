import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import StaffLayout from "@/app/layouts/StaffLayout";

export const staffRoutes = [
  {
    path: "/staff",
    element: <StaffLayout />,
    children: [
      // 🟩 NHÓM 1: Cả TRAINER, TMO, SME đều được vào
      // Gồm: Course, Test, Flashcard
      {
        element: (
          <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.TMO, ROLES.SME]} />
        ),
        children: [
          {
            path: "courses",
            element: <div>Trang Courses (Import component vào)</div>,
          },
          { path: "tests", element: <div>Trang Tests/Assessment</div> },
          { path: "flashcards", element: <div>Trang Flashcards</div> },
        ],
      },

      // 🟦 NHÓM 2: Chỉ TRAINER và TMO được vào
      // Gồm: Class (Lớp học)
      {
        element: <RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.TMO]} />,
        children: [
          { path: "classrooms", element: <div>Trang Classrooms</div> },
        ],
      },

      // 🟨 NHÓM 3: Chỉ TMO và SME được vào
      // Gồm: AI Chatbot
      {
        element: <RoleGuard allowedRoles={[ROLES.TMO, ROLES.SME]} />,
        children: [
          { path: "ai-chatbot", element: <div>Trang AI Chatbot</div> },
        ],
      },

      // 🟪 NHÓM 4: Chỉ DÀNH RIÊNG cho TMO
      // Gồm: Report (Analytics)
      {
        element: <RoleGuard allowedRoles={[ROLES.TMO]} />,
        children: [
          { path: "reports", element: <div>Trang Report / Analytics</div> },
        ],
      },
    ],
  },
];
