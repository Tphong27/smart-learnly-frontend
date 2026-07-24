export const ROLES = {
  GUEST: "guest",
  TRAINEE: "trainee",
  TRAINER: "trainer",
  SME: "sme",
  TMO: "tmo",
  ADMIN: "admin",
};

export function normalizeRole(role) {
  return typeof role === "string" ? role.toLowerCase() : role;
}

export function isRoleAllowed(role, allowedRoles = []) {
  const normalizedRole = normalizeRole(role);
  return allowedRoles.map(normalizeRole).includes(normalizedRole);
}

export const CLASS_ACCESS_ROLES = Object.freeze({
  VIEW: Object.freeze([ROLES.ADMIN, ROLES.TMO, ROLES.TRAINER]),
  MANAGE: Object.freeze([ROLES.ADMIN, ROLES.TMO]),
});

export function canViewClasses(role) {
  return isRoleAllowed(role, CLASS_ACCESS_ROLES.VIEW);
}

export function canManageClasses(role) {
  return isRoleAllowed(role, CLASS_ACCESS_ROLES.MANAGE);
}
