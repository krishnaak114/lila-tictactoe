"use client";

import { useCallback, useEffect, useState } from "react";
import { Session } from "@heroiclabs/nakama-js";
import {
  authenticateEmail,
  clearSession,
  getAccount,
  loadSession,
  nakamaClient,
  refreshSession,
  registerEmail,
} from "@/lib/nakama";

export interface AuthUser {
  userId: string;
  username: string;
  email?: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      const stored = loadSession();
      if (stored) {
        try {
          // Try refresh if expired
          let active: Session | null = stored;
          if (stored.isexpired(Date.now() / 1000)) {
            active = await refreshSession(stored);
          }
          if (active) {
            setSession(active);
            await _fetchUser(active);
          }
        } catch {
          clearSession();
        }
      }
      setLoading(false);
    })();
  }, []);

  async function _fetchUser(s: Session) {
    try {
      const account = await getAccount(s);
      setUser({
        userId: account.user?.id || "",
        username: account.user?.username || "",
        email: account.email,
      });
    } catch (e: any) {
      setError(e.message);
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const s = await authenticateEmail(email, password);
      setSession(s);
      await _fetchUser(s);
    } catch (e: any) {
      setError(e.message || "Login failed");
      throw e;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    setError(null);
    try {
      const s = await registerEmail(email, password, username);
      setSession(s);
      await _fetchUser(s);
    } catch (e: any) {
      setError(e.message || "Registration failed");
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setUser(null);
  }, []);

  return { session, user, loading, error, login, register, logout };
}
