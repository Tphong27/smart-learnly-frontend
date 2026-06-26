import {
    BarChart3,
    BookOpen,
    ClipboardCheck,
    FileQuestion,
    FolderTree,
    GraduationCap,
    History,
    Home,
    Layers3,
    Receipt,
    ScrollText,
    Settings,
    ShieldCheck,
    ShoppingCart,
    Users,
    X,
    Zap,
    CreditCard,
    Wrench,
    BookMarked,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROLES } from "@/shared/constants/roles";

// All navigation items - flat list, sections shown by visual grouping
const navItems = [
    // ADMIN SECTION
    {
        label: "Admin Dashboard",
        path: "/admin/dashboard",
        icon: Home,
        roles: [ROLES.ADMIN],
    },
    {
        label: "Users & Roles",
        path: "/admin/users-management",
        icon: ShieldCheck,
        roles: [ROLES.ADMIN],
    },
    {
        label: "Course Management",
        path: "/admin/courses",
        icon: FolderTree,
        roles: [ROLES.ADMIN, ROLES.TMO, ROLES.SME],
    },
    {
        label: "Categories",
        path: "/admin/categories",
        icon: Receipt,
        roles: [ROLES.ADMIN, ROLES.TMO],
    },
    {
        label: "Transactions",
        path: "/admin/transactions",
        icon: CreditCard,
        roles: [ROLES.ADMIN, ROLES.TMO],
    },
    {
        label: "System Activity Log",
        path: "/admin/audit-log",
        icon: ScrollText,
        roles: [ROLES.ADMIN],
    },
    {
        label: "System Settings",
        path: "/admin/settings",
        icon: Settings,
        roles: [ROLES.ADMIN],
    },

    // STAFF SECTION
    {
        label: "Course Content",
        path: "/staff/courses",
        icon: Layers3,
        roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
        label: "Tests & Questions",
        path: "/staff/tests",
        icon: FileQuestion,
        roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
        label: "Flashcards Management",
        path: "/staff/flashcards",
        icon: BookOpen,
        roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
        label: "Classrooms",
        path: "/staff/classrooms",
        icon: Users,
        roles: [ROLES.TRAINER, ROLES.TMO],
    },
    {
        label: "AI Chatbot Config",
        path: "/staff/ai-chatbot",
        icon: Settings,
        roles: [ROLES.ADMIN],
    },
    {
        label: "Reports & Analytics",
        path: "/staff/reports",
        icon: BarChart3,
        roles: [ROLES.TMO],
    },

    // LEARNING SECTION
    {
        label: "My Courses",
        path: "/learning/courses",
        icon: GraduationCap,
        roles: [ROLES.TRAINEE],
    },
    {
        label: "My Enrollments",
        path: "/learning/enrollments",
        icon: History,
        roles: [ROLES.TRAINEE],
    },
    {
        label: "My Transactions",
        path: "/learning/transactions",
        icon: Receipt,
        roles: [ROLES.TRAINEE],
    },
    {
        label: "Cart",
        path: "/cart",
        icon: ShoppingCart,
        roles: [ROLES.TRAINEE],
    },
    {
        label: "My Classes",
        path: "/learning/classrooms",
        icon: Users,
        roles: [ROLES.TRAINEE],
    },
    {
        label: "My Tests",
        path: "/learning/tests",
        icon: ClipboardCheck,
        roles: [ROLES.TRAINEE],
    },
    {
        label: "Flashcards",
        path: "/learning/flashcards",
        icon: BookOpen,
        roles: [ROLES.TRAINEE],
    },
    {
        label: "AI Assistant",
        path: "/learning/ai-chatbot",
        icon: Settings,
        roles: [ROLES.TRAINEE],
    },
];

export function Sidebar({ userRole, open, onClose }) {
    const normalizedRole =
        typeof userRole === "string" ? userRole.toUpperCase() : userRole;

    // Filter nav items based on user role
    const visibleItems = navItems.filter((item) =>
        item.roles.includes(normalizedRole),
    );

    const overlayClassName = open
        ? "app-sidebar-overlay app-sidebar-overlay--open"
        : "app-sidebar-overlay";
    const sidebarClassName = open
        ? "app-sidebar app-sidebar--open"
        : "app-sidebar";

    return (
        <>
            <div
                className={overlayClassName}
                onClick={onClose}
                aria-hidden="true"
            />

            <aside className={sidebarClassName}>
                <nav className="app-sidebar__nav">
                    {visibleItems.map(({ label, path, icon: Icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            onClick={onClose}
                            className={({ isActive }) =>
                                isActive
                                    ? "app-sidebar__link app-sidebar__link--active"
                                    : "app-sidebar__link"
                            }
                        >
                            <Icon size={18} />
                            {label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
}
