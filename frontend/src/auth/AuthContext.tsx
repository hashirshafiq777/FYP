import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import * as authApi from "../api/auth";
import { setAccessToken, setUnauthorizedHandler } from "../api/client";
import { AuthContext, TOKEN_STORAGE_KEY, type AuthContextValue } from "./context";

/** sessionStorage can throw (private mode, blocked storage); never let that break auth. */
function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token === null) window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    else window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Session simply will not survive a reload; in-memory auth still works.
  }
}

/** Routes that must never be interrupted by the "session expired" redirect. */
const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(null);
  // Derived synchronously: with no mirrored token there is nothing to validate,
  // so the app is ready on the first render instead of after an extra one.
  const [initialising, setInitialising] = useState(() => readStoredToken() !== null);

  const navigate = useNavigate();
  const location = useLocation();
  const mounted = useRef(true);
  // Mirrored into a ref so the 401 handler can read the current path without
  // being re-registered on every navigation. Written in an effect, never
  // during render.
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    writeStoredToken(null);
    setUser(null);
  }, []);

  const applyToken = useCallback((token: string) => {
    setAccessToken(token);
    writeStoredToken(token);
  }, []);

  // A 401 on any request that carried a token means the session is over:
  // the token expired, or logout revoked it in another tab.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      writeStoredToken(null);
      if (!mounted.current) return;
      setUser(null);
      if (!PUBLIC_PATHS.has(pathnameRef.current)) {
        navigate("/login?reason=expired", { replace: true });
      }
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  // On load, revalidate a mirrored token against the API rather than trusting it.
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    const stored = readStoredToken();

    if (stored === null) {
      return () => {
        mounted.current = false;
        controller.abort();
      };
    }

    setAccessToken(stored);
    authApi
      .fetchMe(controller.signal)
      .then((me) => {
        if (mounted.current) setUser(me);
      })
      .catch(() => {
        // Expired, revoked or unreachable: start signed out rather than
        // rendering the app with a token we could not confirm.
        if (!controller.signal.aborted) clearAuth();
      })
      .finally(() => {
        if (mounted.current) setInitialising(false);
      });

    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, [clearAuth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login(email, password);
      applyToken(tokens.access_token);
      try {
        setUser(await authApi.fetchMe());
      } catch (error) {
        clearAuth();
        throw error;
      }
    },
    [applyToken, clearAuth],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // The server may already consider the token invalid; sign out locally anyway.
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initialising,
      isAuthenticated: user !== null,
      signIn,
      signOut,
    }),
    [user, initialising, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
