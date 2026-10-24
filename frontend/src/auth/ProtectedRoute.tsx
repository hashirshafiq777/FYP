import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./useAuth";

/**
 * Gate for authenticated routes.
 *
 * By the time this renders, `AuthGate` in App.tsx has already finished
 * validating any stored token, so there is no "checking…" state here and no
 * flash of the login page on reload.
 */
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
