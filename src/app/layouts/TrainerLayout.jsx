import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutBackground } from "./LayoutBackground";
import { TraineeHeader } from "./TraineeHeader";
import { authService } from "@/features/auth";
import { getCurrentUser } from "@/services";
import { SiteFooter } from "@/shared/components";
import { isRoleAllowed, normalizeRole, ROLES } from "@/shared/constants/roles";
import {
    getFirstName,
    getInitials,
    getUserDisplayName,
    getUserRoleLabel,
} from "@/shared/utils/userDisplay";
import "./TrainerLayout.css";

const STAFF_TABS = [
    {
        label: "Category Management",
        to: "/admin/categories",
        roles: [ROLES.SME],
    },
    {
        label: "Course Management",
        to: "/admin/courses",
        roles: [ROLES.SME, ROLES.TMO],
    },
    {
        label: "Transactions",
        to: "/admin/transactions",
        roles: [ROLES.TMO],
    },
    {
        label: "Classrooms",
        to: "/staff/classrooms",
        roles: [ROLES.TMO],
    },
];

/** Xác định các trang nhân sự cần hiển thị phần giới thiệu của workspace. */
function isStaffPage(pathname) {
    return (
        pathname.startsWith("/admin/") ||
        pathname.startsWith("/staff/") ||
        pathname === "/flashcards" ||
        pathname.startsWith("/flashcards/") ||
        pathname.startsWith("/trainer/") ||
        pathname.startsWith("/sme/") ||
        pathname.startsWith("/tmo/")
    );
}

/** Hiển thị layout ngang cho nhân sự; Trainer chỉ dùng nội dung lớp được phân công. */
export function TrainerLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();

    const storedUser = getCurrentUser();
    const user = storedUser ?? {
        fullName: "Trainer",
        email: "",
        role: ROLES.TRAINER,
    };

    const displayName = getUserDisplayName(user, "Trainer");
    const showStaffNavigation = isStaffPage(location.pathname);

    const normalizedRole = normalizeRole(user.role);
    const workspaceDescription =
        normalizedRole === ROLES.TMO
            ? "Manage transactions and classrooms, and review courses in read-only mode."
            : "Manage your courses, classrooms, and training materials.";

    const visibleTabs = STAFF_TABS.filter((tab) =>
        isRoleAllowed(normalizedRole, tab.roles),
    );

    /** Đăng xuất và luôn đưa người dùng về trang đăng nhập. */
    async function handleLogout() {
        try {
            await authService.logout();
        } finally {
            navigate("/login", { replace: true });
        }
    }

    return (
        <LayoutBackground className="trainer-layout">
            <a className="trainer-skip-link" href="#trainer-main-content">
                Skip to main content
            </a>

            <TraineeHeader
                user={user}
                onLogout={handleLogout}
                roleLabel={getUserRoleLabel(user.role, "Trainee")}
            />

            {showStaffNavigation && (
                <section
                    className="trainer-shell-intro"
                    aria-label="Staff overview"
                >
                    <div className="trainer-welcome">
                        <span
                            className="trainer-welcome__avatar"
                            aria-hidden="true"
                        >
                            {getInitials(displayName)}
                        </span>
                        <div>
                            <h1>
                                Welcome, {getFirstName(displayName, "Trainer")}
                            </h1>
                            <p>{workspaceDescription}</p>
                        </div>
                    </div>

                    {visibleTabs.length > 0 && (
                        <nav className="trainer-nav" aria-label="Staff navigation">
                            {visibleTabs.map((tab) => (
                                <NavLink
                                    key={tab.to}
                                    to={tab.to}
                                    end={tab.end}
                                    className={({ isActive }) =>
                                        `trainer-nav__link${isActive ? " is-active" : ""}`
                                    }
                                >
                                    {tab.label}
                                </NavLink>
                            ))}
                        </nav>
                    )}
                </section>
            )}

            <main
                id="trainer-main-content"
                className="trainer-layout__content"
                tabIndex={-1}
            >
                {children || <Outlet />}
            </main>

            <SiteFooter />
        </LayoutBackground>
    );
}
