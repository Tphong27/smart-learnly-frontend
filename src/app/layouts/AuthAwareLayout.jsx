import { useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { LayoutBackground } from "./LayoutBackground";
import { authService, getCurrentUser } from "@/services";
import { SiteHeader } from "@/shared/components/SiteHeader";
import { ROLES } from "@/shared/constants/roles";
import "./AppLayout.css";

export function AuthAwareLayout({ children }) {
  const navigate = useNavigate();
  const storedUser = getCurrentUser();

  if (!storedUser) {
    return (
      <LayoutBackground variant="public">
        <SiteHeader />
        {children}
      </LayoutBackground>
    );
  }

  const user = storedUser ?? {
    fullName: "Guest",
    email: "",
    role: ROLES.TRAINEE,
  };

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <LayoutBackground className="app-layout-shell course-auth-layout">
      <Header user={user} onLogout={handleLogout} onToggleSidebar={undefined} />
      <main className="course-auth-layout__content">{children}</main>
    </LayoutBackground>
  );
}
