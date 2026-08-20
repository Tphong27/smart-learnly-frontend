export const ROLES = {
  GUEST: "guest",
  TRAINEE: "trainee",
  TRAINER: "trainer",
  SME: "sme",
  TMO: "tmo",
  ADMIN: "admin",
};

export const PERSONAL_FLASHCARD_ROLES = Object.freeze([
  ROLES.TRAINEE,
  ROLES.TRAINER,
  ROLES.SME,
]);

export const PROFILE_ROLES = Object.freeze([
  ROLES.TRAINEE,
  ROLES.TRAINER,
  ROLES.SME,
  ROLES.TMO,
]);

export const PERSONAL_FLASHCARD_STAFF_LAYOUT_ROLES = Object.freeze([
  ROLES.TRAINER,
  ROLES.SME,
]);

export function normalizeRole(role) {
  return typeof role === "string" ? role.toLowerCase() : role;
}

export function isRoleAllowed(role, allowedRoles = []) {
  const normalizedRole = normalizeRole(role);
  return allowedRoles.map(normalizeRole).includes(normalizedRole);
}

export const CLASS_ACCESS_ROLES = Object.freeze({
  VIEW: Object.freeze([ROLES.TMO, ROLES.TRAINER]),
  MANAGE: Object.freeze([ROLES.TMO]),
});

export function canViewClasses(role) {
  return isRoleAllowed(role, CLASS_ACCESS_ROLES.VIEW);
}

export function canManageClasses(role) {
  return isRoleAllowed(role, CLASS_ACCESS_ROLES.MANAGE);
}
