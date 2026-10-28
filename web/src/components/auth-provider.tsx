"use client";

import { onIdTokenChanged, signInWithEmailAndPassword, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type AuthState = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  /** Re-reads custom claims (needed right after the admin role is granted). */
  refreshClaims: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  isAdmin: false,
  loading: true,
  refreshClaims: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onIdTokenChanged(auth, async (next) => {
        // Local emulators only: sign straight in as the seeded admin (functions/scripts/seed-emulator.mjs), no login page.
        if (!next && process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
          signInWithEmailAndPassword(auth, "admin@demo.test", "password123").catch(() => setLoading(false));
          return;
        }
        setUser(next);
        setIsAdmin(next ? (await next.getIdTokenResult()).claims.admin === true : false);
        setLoading(false);
      }),
    [],
  );

  const refreshClaims = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    await current.reload();
    await current.getIdToken(true);
    setIsAdmin((await current.getIdTokenResult()).claims.admin === true);
  }, []);

  return <AuthContext.Provider value={{ user, isAdmin, loading, refreshClaims }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
