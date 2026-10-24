import { createContext } from "react";

import type { User } from "../api/auth";

export const TOKEN_STORAGE_KEY = "ldr.access_token";

export interface AuthContextValue {
  user: User | null;
  /** True until a mirrored token has been checked against /auth/me on first load. */
  initialising: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
