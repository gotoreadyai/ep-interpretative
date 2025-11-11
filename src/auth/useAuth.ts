// src/auth/useAuth.ts
import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export type AuthCtxType = { user: User | null; loading: boolean };

export const AuthCtx = createContext<AuthCtxType>({ user: null, loading: true });

export function useAuth(): AuthCtxType {
  return useContext(AuthCtx);
}
