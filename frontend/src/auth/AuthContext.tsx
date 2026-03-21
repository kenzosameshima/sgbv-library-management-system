import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiRequest } from "../api/client";
import type { AuthUser } from "../types";

interface LoginResponse {
  csrfToken: string;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_KEY = "sgb_session";
const USER_KEY = "sgb_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem(SESSION_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest<MeResponse>("/auth/me");
        setUser(data.user);
        setToken("cookie-session");
        localStorage.setItem(SESSION_KEY, "cookie-session");
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch {
        setToken(null);
        setUser(null);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_KEY);
      }
    })();
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const data = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    setToken("cookie-session");
    setUser(data.user);
    localStorage.setItem(SESSION_KEY, "cookie-session");
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  function logout(): void {
    void apiRequest("/auth/logout", {
      method: "POST",
      body: JSON.stringify({})
    });

    setToken(null);
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
  }

  const value = useMemo(
    () => ({ user, token, login, logout }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}
