<<<<<<< Updated upstream
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { clearAuthSession, getCurrentUser } from '@/services/api-client'
import { demoUsers } from '@/data/demo'
import { ROLES } from '@/shared/constants/roles'
=======
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ROLES } from "@/shared/constants/roles";
import { demoUsers } from "@/data/demo/demoUsers";
import { clearAuthSession, setAuthSession } from "@/services";

function getInitialDemoUser() {
  const rawUser = localStorage.getItem("user");

  if (rawUser) {
    try {
      return JSON.parse(rawUser);
    } catch {
      localStorage.removeItem("user");
    }
  }

  return demoUsers[ROLES.ADMIN];
}
>>>>>>> Stashed changes

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(getInitialDemoUser);
  const navigate = useNavigate();

<<<<<<< Updated upstream
  const user = getCurrentUser() || demoUsers[ROLES.TRAINEE]

  const handleLogout = () => {
    clearAuthSession()
    navigate('/login', { replace: true })
  }
=======
  useEffect(() => {
    setAuthSession({
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      user,
    });
  }, [user]);

  const handleRoleChange = (role) => {
    const nextUser = demoUsers[role];
    if (!nextUser) return;

    setUser(nextUser);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };
>>>>>>> Stashed changes

  return (
    <div className="demo-app-layout">
      <div className="demo-app-layout__inner">
        <Sidebar
          userRole={user.role}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="demo-app-layout__main">
          <Header
            user={user}
            onToggleSidebar={() => setSidebarOpen(true)}
            onLogout={handleLogout}
            onRoleChange={handleRoleChange}
          />

          <main className="demo-app-layout__content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
<<<<<<< Updated upstream
  )
}
=======
  );
}
>>>>>>> Stashed changes
