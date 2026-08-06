import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { setAuthSession } from "@/services/api-client";
import { ROLES } from "@/shared/constants/roles";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleGuard } from "./RoleGuard";

function renderProtectedRoute() {
  render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<p>Private page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderRoleGuard() {
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/403" element={<p>Forbidden page</p>} />
        <Route element={<RoleGuard allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/admin" element={<p>Admin page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Route guard integration", () => {
  it("FE-IT-AUTH-004 - protected routes redirect an anonymous visitor to login", () => {
    renderProtectedRoute();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("FE-IT-AUTH-005 - role guard accepts an admin role returned in uppercase", () => {
    setAuthSession({ accessToken: "admin-token", user: { role: "ADMIN" } });
    renderRoleGuard();
    expect(screen.getByText("Admin page")).toBeInTheDocument();
  });

  it("FE-IT-AUTH-006 - role guard redirects a trainee away from an admin route", () => {
    setAuthSession({ accessToken: "trainee-token", user: { role: "TRAINEE" } });
    renderRoleGuard();
    expect(screen.getByText("Forbidden page")).toBeInTheDocument();
  });
});
