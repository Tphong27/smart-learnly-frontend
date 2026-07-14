import { normalizeRole } from "@/shared/constants/roles";

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCurrentRole() {
  return normalizeRole(getCurrentUser()?.role) || "";
}