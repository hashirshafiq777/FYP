import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "./useAuth";

/** Signed-in visitors have no business on /login or /signup. */
export default function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
