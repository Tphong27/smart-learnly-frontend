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

// Section configuration for Island UI navigation groups
const sections = [
    {
        id: "admin",
        label: "Administration",
        icon: ShieldCheck,
        roles: [ROLES.ADMIN],
    },
    {
        id: "staff",
        label: "Staff Tools",
        icon: Wrench,
        roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
        id: "learning",
        label: "My Learning",
        icon: BookMarked,
        roles: [ROLES.TRAINEE],
    },
];

// Cấu hình chuẩn khớp 100% với adminRoutes, staffRoutes, traineeRoutes
const navItems = [
    // ADMIN SECTION
    {
        section: "admin",
        label: "Admin Dashboard",
        path: "/admin/dashboard",
        icon: Home,
        roles: [ROLES.ADMIN],
    },
    {
        section: "admin",
        label: "Users & Roles",
        path: "/admin/users-management",
        icon: ShieldCheck,
        roles: [ROLES.ADMIN],
    },
    {
        section: "admin",
        label: "Course Management",
        path: "/admin/courses",
        icon: FolderTree,
        roles: [ROLES.ADMIN, ROLES.TMO, ROLES.SME],
    },
    {
        section: "admin",
        label: "Categories",
        path: "/admin/categories",
        icon: Receipt,
        roles: [ROLES.ADMIN, ROLES.TMO],
    },
    {
        section: "admin",
        label: "Transactions",
        path: "/admin/transactions",
        icon: CreditCard,
        roles: [ROLES.ADMIN, ROLES.TMO],
    },
    {
        section: "admin",
        label: "System Activity Log",
        path: "/admin/audit-log",
        icon: ScrollText,
        roles: [ROLES.ADMIN],
    },
    {
        section: "admin",
        label: "System Settings",
        path: "/admin/settings",
        icon: Settings,
        roles: [ROLES.ADMIN],
    },

    // STAFF SECTION
    {
        section: "staff",
        label: "Course Content",
        path: "/staff/courses",
        icon: Layers3,
        roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
        section: "staff",
        label: "Tests & Questions",
        path: "/staff/tests",
        icon: FileQuestion,
        roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
        section: "staff",
        label: "Flashcards Management",
        path: "/staff/flashcards",
        icon: BookOpen,
        roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
        section: "staff",
        label: "Classrooms",
        path: "/staff/classrooms",
        icon: Users,
        roles: [ROLES.TRAINER, ROLES.TMO],
    },
    {
        section: "staff",
        label: "AI Chatbot Config",
        path: "/staff/ai-chatbot",
        icon: Settings,
        roles: [ROLES.ADMIN],
    },
    {
        section: "staff",
        label: "Reports & Analytics",
        path: "/staff/reports",
        icon: BarChart3,
        roles: [ROLES.TMO],
    },

    {
        section: "learning",
        label: "My Courses",
        path: "/learning/courses",
        icon: GraduationCap,
        roles: [ROLES.TRAINEE],
    },
    {
        section: "learning",
        label: "My Enrollments",
        path: "/learning/enrollments",
        icon: History,
        roles: [ROLES.TRAINEE],
    },
    {
        section: "learning",
        label: "My Transactions",
        path: "/learning/transactions",
        icon: Receipt,
        roles: [ROLES.TRAINEE],
    },
    {
        section: "learning",
        label: "Cart",
        path: "/cart",
        icon: ShoppingCart,
        roles: [ROLES.TRAINEE],
    },
    {
        section: "learning",
        label: "My Classes",
        path: "/learning/classrooms",
        icon: Users,
        roles: [ROLES.TRAINEE],
    },
    {
        section: "learning",
        label: "My Tests",
        path: "/learning/tests",
        icon: ClipboardCheck,
        roles: [ROLES.TRAINEE],
    },
    {
        section: "learning",
        label: "Flashcards",
        path: "/learning/flashcards",
        icon: BookOpen,
        roles: [ROLES.TRAINEE],
    },
    {
        section: "learning",
        label: "AI Assistant",
        path: "/learning/ai-chatbot",
        icon: Settings,
        roles: [ROLES.TRAINEE],
    },
];

export function Sidebar({ userRole, open, onClose }) {
    // Không dùng .toLowerCase() nữa để giữ nguyên dạng hoa khớp với ROLES hằng số
    const normalizedRole =
        typeof userRole === "string" ? userRole.toUpperCase() : userRole;

    // Filter sections based on user role
    const visibleSections = sections.filter((section) =>
        section.roles.includes(normalizedRole),
    );

    // Filter and group nav items by section
    const visibleItems = navItems.filter((item) =>
        item.roles.includes(normalizedRole),
    );

    // Group items by section
    const groupedItems = visibleSections.map((section) => ({
        ...section,
        items: visibleItems.filter((item) => item.section === section.id),
    }));

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
                    {groupedItems.map((section) => (
                        <div key={section.id} className="app-sidebar__section">
                            <div className="app-sidebar__section-header">
                                <section.icon size={14} />
                                <span>{section.label}</span>
                            </div>
                            <div className="app-sidebar__section-items">
                                {section.items.map(
                                    ({ label, path, icon: Icon }) => (
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
                                    ),
                                )}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="app-sidebar__footer">
                    <div className="app-sidebar__summary">
                        <div className="app-sidebar__summary-icon">
                            <GraduationCap size={18} />
                        </div>
                        <div className="app-sidebar__summary-content">
                            <p>SLP Program</p>
                            <small>
                                Learning management system for Accenture SLP.
                            </small>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
