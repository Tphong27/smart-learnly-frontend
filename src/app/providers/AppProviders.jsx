import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@/shared/components/ui/Toast";
import { useAuthStore } from "@/features/auth/authStore";

function SessionRestorer({ children }) {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);
  return children;
}

export function AppProviders({ children }) {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SessionRestorer>{children}</SessionRestorer>
      </ToastProvider>
    </BrowserRouter>
  );
}
