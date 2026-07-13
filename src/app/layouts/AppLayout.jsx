import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { LayoutBackground } from "./LayoutBackground";
import { authService, getCurrentUser } from "@/services";
import { ROLES } from "@/shared/constants/roles";
import "./AppLayout.css";

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
    const searchParams = new URLSearchParams(location.search);
    const isCurriculumPage = /\/courses\/[^/]+\/content\/?$/.test(location.pathname);
    const focusMode = isCurriculumPage && searchParams.get("focus") === "1";

    const workspaceLabel = (() => {
        const path = location.pathname;
        if (path.includes("/courses")) return "Course Management";
        if (path.includes("/question-banks")) return "Question Bank";
        if (path.includes("/users-management")) return "Users & Roles";
        if (path.includes("/categories")) return "Categories";
        if (path.includes("/transactions")) return "Transactions";
        if (path.includes("/audit-log")) return "System Activity Log";
        if (path.includes("/settings")) return "System Settings";
        if (path.includes("/classrooms")) return "Classrooms";
        if (path.includes("/tests")) return "Tests Management";
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

    async function handleLogout() {
        try {
            await authService.logout();
        } finally {
            navigate("/login", { replace: true });
        }
    }

    return (
        <LayoutBackground
            className={`app-layout-shell${sidebarCollapsed ? " app-layout-shell--sidebar-collapsed" : ""}${focusMode ? " app-layout-shell--focus" : ""}`}
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
