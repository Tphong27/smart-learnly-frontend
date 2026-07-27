import { useNavigate } from "react-router-dom";
import { LayoutBackground } from "./LayoutBackground";
import { TraineeHeader } from "./TraineeHeader";
import { authService, getCurrentUser } from "@/services";
import { SiteHeader } from "@/shared/components/SiteHeader";

export function AuthAwareLayout({ children }) {
  const navigate = useNavigate();
  const storedUser = getCurrentUser();

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <LayoutBackground variant="public">
      {storedUser ? (
        <TraineeHeader user={storedUser} onLogout={handleLogout} />
      ) : (
        <SiteHeader />
      )}

      {children}
    </LayoutBackground>
  );
}