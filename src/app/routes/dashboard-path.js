import { ROLES } from "@/shared/constants/roles";

export function getDashboardPathByRole(role) {
  const normalizedRole =
    typeof role === "string" ? role.toUpperCase() : role;

  switch (normalizedRole) {
    case ROLES.ADMIN:
    case ROLES.TMO:
    case ROLES.SME:
      return "/admin/dashboard";

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

  const normalizedRole =
    typeof role === "string" ? role.toUpperCase() : role;

  const restrictedPrefixes = [
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
      prefix: "/cart",
      allow: [ROLES.TRAINEE],
    },
  ];

  for (const { prefix, allow } of restrictedPrefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return allow.includes(normalizedRole);
    }
  }

  return true;
}