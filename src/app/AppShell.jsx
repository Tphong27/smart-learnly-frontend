import {
    BrowserRouter,
    Navigate,
    useLocation,
    useRoutes,
} from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { AuthAwareLayout } from "./layouts/AuthAwareLayout";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleGuard } from "./routes/RoleGuard";
import { ROLES } from "@/shared/constants/roles";
import { HomePage } from "../features/home/HomePage";
import {
    CourseDetailPage,
    LearningWorkspacePage,
    TrainerProfilePage,
} from "../features/course";
import {
    LoginPage,
    RegisterPage,
    ForgotPasswordPage,
    ResetPasswordPage,
    VerifyEmailPage,
    ProfilePage,
} from "../features/auth";
import getTraineeRoutes from "./routes/traineeRoutes";
import getStaffRoutes from "./routes/staffRoutes";
import getAdminRoutes from "./routes/adminRoutes";
import { NotFoundPage } from "./pages/error/NotFoundPage";
import { ForbiddenPage } from "./pages/error/ForbiddenPage";
import { ServerErrorPage } from "./pages/error/ServerErrorPage";
import { SiteFooter } from "@/shared/components/SiteFooter";

const appRoutes = [
    {
        path: "/",
        element: (
            <AuthAwareLayout>
                <HomePage />
            </AuthAwareLayout>
        ),
    },
    {
        path: "/login",
        element: (
            <PublicLayout>
                <LoginPage />
            </PublicLayout>
        ),
    },
    {
        path: "/register",
        element: (
            <PublicLayout>
                <RegisterPage />
            </PublicLayout>
        ),
    },
    {
        path: "/forgot-password",
        element: (
            <PublicLayout>
                <ForgotPasswordPage />
            </PublicLayout>
        ),
    },
    {
        path: "/reset-password",
        element: (
            <PublicLayout>
                <ResetPasswordPage />
            </PublicLayout>
        ),
    },
    {
        path: "/verify-email",
        element: (
            <PublicLayout>
                <VerifyEmailPage />
            </PublicLayout>
        ),
    },
    {
        path: "/courses/:courseId/preview",
        element: (
            <PublicLayout>
                <LearningWorkspacePage mode="guest" />
            </PublicLayout>
        ),
    },
    {
        path: "/courses/:courseId/learn",
        element: (
            <PublicLayout>
                <LearningWorkspacePage previewMode={true} />
            </PublicLayout>
        ),
    },
    {
        path: "/courses/:slug",
        element: (
            <AuthAwareLayout>
                <CourseDetailPage />
            </AuthAwareLayout>
        ),
    },

    {
        path: "/trainers/:trainerId",
        element: (
            <PublicLayout>
                <TrainerProfilePage />
            </PublicLayout>
        ),
    },

    // =========================================================
    // BẢO VỆ CHẶT CHẼ: Cô lập không gian chạy của từng nhóm quyền
    // =========================================================
    {
        element: <ProtectedRoute />,
        children: [
            // Admin Course Learning Preview - fullscreen, outside AppLayout
            {
                element: (
                    <RoleGuard
                        allowedRoles={[ROLES.ADMIN, ROLES.TMO, ROLES.SME]}
                    />
                ),
                children: [
                    {
                        path: "/admin/courses/:courseId/preview",
                        element: <LearningWorkspacePage mode="admin-preview" />,
                    },
                ],
            },

            // Staff learning preview - keep staff inside the /staff route space.
            {
                element: (
                    <RoleGuard
                        allowedRoles={[ROLES.TRAINER, ROLES.TMO, ROLES.SME]}
                    />
                ),
                children: [
                    {
                        path: "/staff/courses/:courseId/preview",
                        element: <LearningWorkspacePage mode="admin-preview" />,
                    },
                ],
            },

            // Nhóm 1: Trang cá nhân dùng chung AppLayout hệ thống
            {
                element: <AppLayout />,
                children: [{ path: "/profile", element: <ProfilePage /> }],
            },

            // Nhóm 2: Bung riêng cụm Trainee thông qua thực thi hàm
            ...getTraineeRoutes(), // 🟩 ĐÃ SỬA: Gọi thực thi hàm với cặp ngoặc ()

            // Nhóm 3: Bung riêng cụm Staff
            ...getStaffRoutes(),

            // Nhóm 4: Bung riêng toàn bộ cụm Admin
            ...getAdminRoutes(),
        ],
    },
    { path: "/403", element: <ForbiddenPage /> },
    { path: "/500", element: <ServerErrorPage /> },
    { path: "/404", element: <NotFoundPage /> },
    { path: "*", element: <Navigate to="/404" replace /> },
];

function AppRoutes() {
    return useRoutes(appRoutes);
}

function RoutedApp() {
    const { pathname } = useLocation();
    const showPublicFooter =
        pathname === "/" ||
        /^\/courses\/[^/]+$/.test(pathname) ||
        /^\/trainers\/[^/]+$/.test(pathname);

    return (
        <>
            <AppRoutes />
            {showPublicFooter && <SiteFooter />}
        </>
    );
}

export function AppShell() {
    return (
        <BrowserRouter>
            <RoutedApp />
        </BrowserRouter>
    );
}
