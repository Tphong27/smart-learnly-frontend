import { RoleGuard } from "./RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import AdminLayout from "@/app/layouts/AdminLayout";

export const adminRoutes = [
  {
    path: "/admin",
    element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: "dashboard", element: <div>Admin Dashboard</div> },
          { path: "users-management", element: <div>Quản lý Users</div> },
          // Thêm các tính năng riêng của Admin tại đây
        ],
      },
    ],
  },
];
