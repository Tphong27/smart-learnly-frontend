import { isRoleAllowed, normalizeRole, ROLES } from "@/shared/constants/roles";

export function getDashboardPathByRole(role) {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case ROLES.ADMIN:
      return "/admin/dashboard";
    case ROLES.TMO:
      return "/admin/courses";
    case ROLES.SME:
      return "/admin/courses";
    case ROLES.TRAINER:
      return "/staff/courses";
    case ROLES.TRAINEE:
      return "/dashboard";
    default:
      return "/";
  }
}

export function isPathAllowedForRole(pathname, role) {
  if (!pathname) return false;

  const normalizedRole = normalizeRole(role);

  const restrictedPrefixes = [
    {
      prefix: "/admin/dashboard",
      allow: [ROLES.ADMIN],
    },
    {
      prefix: "/admin/users-management",
      allow: [ROLES.ADMIN],
    },
    {
      prefix: "/admin/audit-log",
      allow: [ROLES.ADMIN],
    },
    {
      prefix: "/admin/settings",
      allow: [ROLES.ADMIN],
    },
    {
      prefix: "/admin/orders",
      allow: [ROLES.ADMIN, ROLES.TMO],
    },
    {
      prefix: "/admin/transactions",
      allow: [ROLES.ADMIN, ROLES.TMO],
    },
    {
      prefix: "/admin/question-banks",
      allow: [ROLES.ADMIN, ROLES.TMO, ROLES.SME, ROLES.TRAINER],
    },
    {
      prefix: "/admin/courses",
      allow: [ROLES.ADMIN, ROLES.TMO, ROLES.SME],
    },
    {
      prefix: "/admin/questions",
      allow: [ROLES.ADMIN, ROLES.TMO, ROLES.SME, ROLES.TRAINER],
    },
    {
      prefix: "/admin",
      allow: [ROLES.ADMIN, ROLES.TMO, ROLES.SME],
    },
    {
      prefix: "/staff",
      allow: [ROLES.ADMIN, ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
      prefix: "/learning",
      allow: [ROLES.TRAINEE],
    },
    {
      prefix: "/dashboard",
      allow: [ROLES.TRAINEE],
    },
  ];

  for (const { prefix, allow } of restrictedPrefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return isRoleAllowed(normalizedRole, allow);
    }
  }

  return true;
}
