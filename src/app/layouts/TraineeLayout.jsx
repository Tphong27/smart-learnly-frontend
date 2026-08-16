import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutBackground } from "./LayoutBackground";
import { TraineeHeader } from "./TraineeHeader";
import { authService } from "@/features/auth";
import { getCurrentUser } from "@/services";
import { SiteFooter } from "@/shared/components";
import {
    getFirstName,
    getInitials,
    getUserDisplayName,
} from "@/shared/utils/userDisplay";
import "./TraineeLayout.css";

const TRAINEE_TABS = [
    {
        label: "Dashboard",
        to: "/dashboard",
        end: true,
    },
    {
        label: "Assignment",
        to: "/learning/assignments",
    },
    {
        label: "Test",
        to: "/learning/tests",
    },
    {
        label: "Flashcards",
        to: "/flashcards",
    },
];

export function TraineeLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const user = getCurrentUser() || { fullName: "Learner" };
    const displayName = getUserDisplayName(user, "Learner");
    const isTransactionHistory = location.pathname === "/learning/transactions";

    const showLearningNavigation =
        !isTransactionHistory &&
        (location.pathname === "/dashboard" ||
            location.pathname === "/flashcards" ||
            location.pathname.startsWith("/flashcards/") ||
            location.pathname.startsWith("/learning/"));

    async function handleLogout() {
        try {
            await authService.logout();
        } finally {
            navigate("/login", { replace: true });
        }
    }

    return (
        <LayoutBackground className="trainee-layout">
            <a className="trainee-skip-link" href="#trainee-main-content">
                Skip to main content
            </a>

            <TraineeHeader
                user={user}
                onLogout={handleLogout}
                roleLabel="Learner"
            />

            {showLearningNavigation && (
                <section
                    className="trainee-shell-intro"
                    aria-label="Learning overview"
                >
                    <div className="trainee-welcome">
                        <span
                            className="trainee-welcome__avatar"
                            aria-hidden="true"
                        >
                            {getInitials(displayName)}
                        </span>
                        <div>
                            <h1>
                                Welcome back,{" "}
                                {getFirstName(displayName, "Learner")}
                            </h1>
                            <p>
                                Continue learning and keep moving toward your
                                goals.
                            </p>
                        </div>
                    </div>

                    <nav
                        className="trainee-nav"
                        aria-label="Learner navigation"
                    >
                        {TRAINEE_TABS.map((tab) => (
                            <NavLink
                                key={tab.to}
                                to={tab.to}
                                end={tab.end}
                                className={({ isActive }) =>
                                    `trainee-nav__link${isActive ? " is-active" : ""}`
                                }
                            >
                                {tab.label}
                            </NavLink>
                        ))}
                    </nav>
                </section>
            )}

            <main
                id="trainee-main-content"
                className="trainee-layout__content"
                tabIndex={-1}
            >
                {children || <Outlet />}
            </main>

            <SiteFooter />
        </LayoutBackground>
    );
}
