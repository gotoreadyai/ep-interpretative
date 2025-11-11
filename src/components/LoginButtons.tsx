// src/components/LoginButtons.tsx
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "../lib/firebase";
import { useAuth } from "../auth/useAuth";

export default function LoginButtons() {
  const { user } = useAuth();

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signInWithPopup(auth, provider)}
        className="px-3 py-2 border-2 border-black text-sm hover:bg-amber-50"
      >
        Zaloguj przez Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-600">👋 {user.displayName}</span>
      <button
        type="button"
        onClick={() => signOut(auth)}
        className="px-3 py-2 border-2 border-black text-sm hover:bg-neutral-50"
      >
        Wyloguj
      </button>
    </div>
  );
}
