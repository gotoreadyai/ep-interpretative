// src/auth/AuthProvider.tsx
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { AuthCtx } from "./useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return <AuthCtx.Provider value={{ user, loading }}>{children}</AuthCtx.Provider>;
}
