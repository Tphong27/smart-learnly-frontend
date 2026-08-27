import {
    BrowserRouter,
    Navigate,
    useLocation,
    useRoutes,
} from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { AuthAwareLayout } from "./layouts/AuthAwareLayout";
import { TraineeLayout } from "./layouts/TraineeLayout";
import { TrainerLayout } from "./layouts/TrainerLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleGuard } from "./routes/RoleGuard";
import {
    isRoleAllowed,
    normalizeRole,
    PERSONAL_FLASHCARD_ROLES,
    PERSONAL_FLASHCARD_STAFF_LAYOUT_ROLES,
    PROFILE_ROLES,
    ROLES,
} from "@/shared/constants/roles";
import { getCurrentUser } from "@/services";
import { HomePage } from "../features/home/HomePage";
import { LegalPage } from "@/features/legal";
import { CourseDetailPage} from "../features/course";
import { LearningWorkspacePage } from "@/features/learning";
import {
    LoginPage,
    RegisterPage,
    ForgotPasswordPage,
    ResetPasswordPage,
    VerifyEmailPage,
    ProfilePage,
} from "../features/auth";
import {
    OpeningScheduleDetailPage,
    OpeningSchedulePage,
} from "../features/opening-schedule";
import getTraineeRoutes from "./routes/traineeRoutes";
import getStaffRoutes from "./routes/staffRoutes";
import getAdminRoutes from "./routes/adminRoutes";
import { getDashboardPathByRole } from "./routes/dashboard-path";
import { NotFoundPage } from "./pages/error/NotFoundPage";
import { ForbiddenPage } from "./pages/error/ForbiddenPage";
import { ServerErrorPage } from "./pages/error/ServerErrorPage";
import { SiteFooter } from "@/shared/components/SiteFooter";
import {
    PersonalFlashcardLibraryPage,
    PersonalFlashcardSetDetailPage,
    PersonalFlashcardStudyPage,
} from "@/features/personal-flashcards";
import { NotificationProvider } from "@/features/notification";

/** Hiển thị homepage cho khách và chuyển tài khoản đã đăng nhập tới trang mặc định theo role. */
function RootRoute() {
    const user = getCurrentUser();
    const roleLandingPath = getDashboardPathByRole(user?.role);

    if (user && roleLandingPath !== "/") {
        return <Navigate to={roleLandingPath} replace />;
    }

    return (
        <AuthAwareLayout>
            <HomePage />
        </AuthAwareLayout>
    );
}

/** Chọn layout flashcard cá nhân theo role hiện tại của người dùng. */
function PersonalFlashcardLayoutBoundary() {
    const user = getCurrentUser();
    const normalizedRole = normalizeRole(user?.role);

    if (normalizedRole === ROLES.TRAINEE) {
        return <TraineeLayout />;
    }

    if (isRoleAllowed(normalizedRole, PERSONAL_FLASHCARD_STAFF_LAYOUT_ROLES)) {
        return <TrainerLayout />;
    }

    return <Navigate to="/403" replace />;
}

const appRoutes = [
    {
        path: "/",
        element: <RootRoute />,
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
        path: "/privacy-policy",
        element: (
            <PublicLayout>
                <LegalPage type="privacy" />
            </PublicLayout>
        ),
    },
    {
        path: "/terms-of-service",
        element: (
            <PublicLayout>
                <LegalPage type="terms" />
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
        path: "/opening-schedule",
        element: (
            <AuthAwareLayout>
                <OpeningSchedulePage />
            </AuthAwareLayout>
        ),
    },
    {
        path: "/opening-schedule/:classId",
        element: (
            <AuthAwareLayout>
                <OpeningScheduleDetailPage />
            </AuthAwareLayout>
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
                        allowedRoles={[ROLES.TMO, ROLES.SME]}
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

            // Profile dùng header ngang chung, không hiển thị welcome/tab bar theo role.
            {
                element: <RoleGuard allowedRoles={PROFILE_ROLES} />,
                children: [
                    {
                        element: <TrainerLayout />,
                        children: [
                            { path: "/profile", element: <ProfilePage /> },
                        ],
                    },
                ],
            },
            {
                element: <RoleGuard allowedRoles={PERSONAL_FLASHCARD_ROLES} />,
                children: [
                    {
                        element: <PersonalFlashcardLayoutBoundary />,
                        children: [
                            {
                                path: "/flashcards",
                                element: <PersonalFlashcardLibraryPage />,
                            },
                            {
                                path: "/flashcards/:setId",
                                element: <PersonalFlashcardSetDetailPage />,
                            },
                            {
                                path: "/flashcards/:setId/study",
                                element: <PersonalFlashcardStudyPage />,
                            },
                        ],
                    },
                ],
            },

            // Nhóm 2: Bung riêng cụm Trainee thông qua thực thi hàm
            ...getTraineeRoutes(),

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

/** Render cây route chính của ứng dụng. */
function AppRoutes() {
    return useRoutes(appRoutes);
}

/** Bọc routes với notification provider và footer public theo path hiện tại. */
function RoutedApp() {
    const { pathname } = useLocation();
    const showPublicFooter =
        pathname === "/" ||
        pathname === "/privacy-policy" ||
        pathname === "/terms-of-service" ||
        /^\/courses\/[^/]+$/.test(pathname) ||
        /^\/trainers\/[^/]+$/.test(pathname);

    return (
        <NotificationProvider>
            <AppRoutes />
            {showPublicFooter && <SiteFooter />}
        </NotificationProvider>
    );
}

/** Khởi tạo BrowserRouter cho toàn bộ ứng dụng frontend. */
export function AppShell() {
    return (
        <BrowserRouter>
            <RoutedApp />
        </BrowserRouter>
    );
}
