import { isRoleAllowed, normalizeRole, ROLES } from "@/shared/constants/roles";

export function getDashboardPathByRole(role) {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case ROLES.ADMIN:
      return "/admin/dashboard";
    case ROLES.TMO:
      return "/admin/courses";
    case ROLES.SME:
      return "/staff/courses";
    case ROLES.TRAINER:
      return "/staff/classrooms";
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
      prefix: "/admin/settings",
      allow: [ROLES.ADMIN],
    },
    // System activity log đã tắt trên BE — không mở cho role nào
    {
      prefix: "/admin/audit-log",
      allow: [],
    },
    {
      prefix: "/admin/orders",
      allow: [ROLES.TMO],
    },
    {
      prefix: "/admin/transactions",
      allow: [ROLES.TMO],
    },
    {
      prefix: "/admin/categories",
      allow: [ROLES.TMO],
    },
    {
      prefix: "/admin/classrooms",
      allow: [],
    },
    {
      prefix: "/admin/courses",
      match: /^\/admin\/courses\/?$/,
      allow: [ROLES.TMO],
    },
    {
      prefix: "/admin/courses/new",
      match: /^\/admin\/courses\/new\/?$/,
      allow: [ROLES.TMO],
    },
    {
      prefix: "/admin/courses",
      match: /^\/admin\/courses\/[^/]+\/preview(?:\/|$)/,
      allow: [ROLES.TMO, ROLES.SME],
    },
    {
      prefix: "/admin/courses",
      match: /\/admin\/courses\/[^/]+\/modules\/[^/]+\/questions(?:\/|$)/,
      allow: [ROLES.TMO, ROLES.SME, ROLES.TRAINER],
    },
    {
      prefix: "/admin/courses",
      match: /\/admin\/courses\/[^/]+\/(?:content|lessons)(?:\/|$)/,
      allow: [ROLES.TMO, ROLES.SME, ROLES.TRAINER],
    },
    {
      prefix: "/admin/courses",
      allow: [ROLES.TMO, ROLES.SME],
    },
    {
      prefix: "/admin",
      allow: [ROLES.ADMIN],
    },
    {
      prefix: "/staff/courses",
      match: /^\/staff\/courses\/?$/,
      allow: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
      prefix: "/staff/courses",
      match: /^\/staff\/courses\/[^/]+\/preview(?:\/|$)/,
      allow: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
      prefix: "/staff/courses",
      allow: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
      prefix: "/staff/assignments",
      match: /^\/staff\/assignments\/?$/,
      allow: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
      prefix: "/staff/assignments",
      allow: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
    },
    {
      prefix: "/staff/classrooms",
      allow: [ROLES.TRAINER, ROLES.TMO],
    },
    {
      prefix: "/staff",
      allow: [ROLES.TRAINER, ROLES.SME, ROLES.TMO],
    },
    {
      prefix: "/trainer",
      allow: [ROLES.TRAINER],
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

  for (const { prefix, match, allow } of restrictedPrefixes) {
    if (
      match
        ? match.test(pathname)
        : pathname === prefix || pathname.startsWith(`${prefix}/`)
    ) {
      return isRoleAllowed(normalizedRole, allow);
    }
  }

  return true;
}
