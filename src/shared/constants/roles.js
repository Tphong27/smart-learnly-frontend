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
