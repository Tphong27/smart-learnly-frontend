import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { TrainerLayout } from "./TrainerLayout";
import { LayoutBackground } from "./LayoutBackground";
import { authService } from "@/features/auth";
import { getCurrentUser } from "@/services";
import {
    isRoleAllowed,
    normalizeRole,
    ROLES,
} from "@/shared/constants/roles";
import "./AppLayout.css";

/** Hiển thị application shell phù hợp với role và giữ navigation nhất quán. */
export function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
        window.localStorage.getItem("smart-learnly:sidebar-collapsed") === "true"
    );
    const navigate = useNavigate();
    const location = useLocation();

    const storedUser = getCurrentUser();
    const user = storedUser ?? {
        fullName: "Guest",
        email: "",
        role: ROLES.TRAINEE,
    };

    const userRole = user.role || ROLES.TRAINEE;
    const normalizedRole = normalizeRole(userRole);
    const usesHorizontalStaffLayout = isRoleAllowed(normalizedRole, [
        ROLES.SME,
        ROLES.TMO,
    ]);
    const workspaceLabel = (() => {
        const path = location.pathname;
        if (/\/courses\/[^/]+\/modules\/[^/]+\/questions/.test(path)) return "Module Questions";
        if (path.includes("/courses")) return "Course Management";
        if (path.includes("/users-management")) return "Users & Roles";
        if (path.includes("/categories")) return "Categories";
        if (path.includes("/transactions")) return "Transactions";
        if (path.includes("/settings")) return "System Settings";
        if (path.includes("/classrooms")) return "Classrooms";
        if (path.includes("/course-quizzes")) return "Course quiz";
        if (path.includes("/flashcards")) return "Flashcards";
        if (path.includes("/dashboard")) return "Dashboard";
        return "Workspace";
    })();

    useEffect(() => {
        if (!sidebarOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function handleEscape(event) {
            if (event.key === "Escape") setSidebarOpen(false);
        }

        document.addEventListener("keydown", handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [sidebarOpen]);

    /** Thu gọn hoặc mở sidebar và ghi nhớ lựa chọn của người dùng. */
    function handleToggleCollapsed() {
        setSidebarCollapsed((current) => {
            const next = !current;
            window.localStorage.setItem(
                "smart-learnly:sidebar-collapsed",
                String(next),
            );
            return next;
        });
    }

    /** Đăng xuất rồi luôn đưa người dùng về trang login. */
    async function handleLogout() {
        try {
            await authService.logout();
        } finally {
            navigate("/login", { replace: true });
        }
    }

    if (usesHorizontalStaffLayout) {
        return <TrainerLayout />;
    }

    return (
        <LayoutBackground
            className={`app-layout-shell${sidebarCollapsed ? " app-layout-shell--sidebar-collapsed" : ""}`}
        >
            <a className="app-skip-link" href="#app-main-content">
                Skip to main content
            </a>

            <Sidebar
                userRole={userRole}
                open={sidebarOpen}
                collapsed={sidebarCollapsed}
                onClose={() => setSidebarOpen(false)}
                onToggleCollapsed={handleToggleCollapsed}
            />

            <section className="app-layout-shell__workspace">
                <Header
                    user={user}
                    embedded
                    showBrand={false}
                    workspaceLabel={workspaceLabel}
                    sidebarOpen={sidebarOpen}
                    onToggleSidebar={() => setSidebarOpen(true)}
                    onLogout={handleLogout}
                />

                <main
                    id="app-main-content"
                    className="app-layout-shell__content"
                    tabIndex={-1}
                >
                    <Outlet />
                </main>
            </section>
        </LayoutBackground>
    );
}
