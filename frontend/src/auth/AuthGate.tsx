import type { ReactNode } from "react";

import FullPageLoader from "../components/FullPageLoader";
import { useAuth } from "./useAuth";

/**
 * Holds the whole app back until a stored token has been checked.
 *
 * Without this, the first paint is the login page (no user yet), replaced a
 * moment later by the dashboard — which looks like a bug and, worse, like
 * having been signed out. One branded splash is calmer and tells the truth.
 *
 * It must wrap every route, including the public ones: `ProtectedRoute` would
 * otherwise redirect while `/auth/me` is still in flight.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { initialising } = useAuth();
  if (initialising) return <FullPageLoader />;
  return <>{children}</>;
}
