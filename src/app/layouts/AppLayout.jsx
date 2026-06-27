import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { authService, getCurrentUser } from "@/services";
import { ROLES } from "@/shared/constants/roles";
import "./app-layout.css";

export function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const storedUser = getCurrentUser();
    const user = storedUser ?? {
        fullName: "Guest",
        email: "",
        role: ROLES.TRAINEE,
    };

    const userRole = user.role || ROLES.TRAINEE;

    async function handleLogout() {
        try {
            await authService.logout();
        } finally {
            navigate("/login", { replace: true });
        }
    }

    return (
        <div className="app-layout-shell">
            {/* Header at top level */}
            <Header
                user={user}
                onToggleSidebar={() => setSidebarOpen(true)}
                onLogout={handleLogout}
            />

            <div className="app-layout-shell__inner">
                <Sidebar
                    userRole={userRole}
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <main className="app-layout-shell__content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
