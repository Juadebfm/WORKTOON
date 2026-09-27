import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { login, logout } from "../api/client";
import type { SupportSession } from "../api/types";

const storageKey = "worktoon-support-session";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthContextValue {
  session: SupportSession | null;
  isLoading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

function readStoredSession(): SupportSession | null {
  const stored = sessionStorage.getItem(storageKey);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as SupportSession;
    return new Date(session.expiresAt) > new Date() ? session : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SupportSession | null>(readStoredSession);
  const [isLoading, setIsLoading] = useState(false);
  const value = useMemo<AuthContextValue>(() => ({
    session,
    isLoading,
    async signIn(email, password) {
      setIsLoading(true);
      try {
        const nextSession = await login(email, password);
        sessionStorage.setItem(storageKey, JSON.stringify(nextSession));
        setSession(nextSession);
      } finally { setIsLoading(false); }
    },
    async signOut() {
      if (session) await logout(session.token).catch(() => undefined);
      sessionStorage.removeItem(storageKey);
      setSession(null);
    },
  }), [isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
