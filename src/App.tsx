// src/App.tsx
import type { ReactElement } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import InterpretacjaReader from "./pages/InterpretacjaReader";
import InterpretacjeBrowser from "./pages/InterpretacjeBrowser";
import MotywyBrowser from "./pages/MotywyBrowser";
import MotywPage from "./pages/MotywPage";
import AddInterpretacjaPage from "./pages/AddInterpretacjaPage";
import { AuthProvider } from "./auth/AuthProvider";
import { useAuth } from "./auth/useAuth";
import LoginButtons from "./components/LoginButtons";

function PrivateRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Ładowanie…</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto p-3 flex items-center justify-between">
          <a href="/" className="font-semibold">Ogarnij Maturę</a>
          <LoginButtons />
        </div>
      </div>

      <Routes>
        <Route path="/" element={<MotywyBrowser />} />
        <Route path="/motyw/:motywId" element={<MotywPage />} />
        <Route path="/interpretacje" element={<InterpretacjeBrowser />} />
        <Route path="/interpretacja/:interpretacjaId" element={<InterpretacjaReader />} />
        <Route path="/dodaj" element={<PrivateRoute><AddInterpretacjaPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
