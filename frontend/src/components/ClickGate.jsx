// src/components/ClickGate.jsx
import { useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";

export default function ClickGate({ children }) {
  const location = useLocation();
  const fullPath = location.pathname;
  const hasPass = sessionStorage.getItem(`gate:${fullPath}`) === "1";

  useEffect(() => {
    if (hasPass) {
      sessionStorage.removeItem(`gate:${fullPath}`);
    }
  }, [hasPass, fullPath]);

  // 🔥 SI NO HAY PASE: redirige a /dashboard (NO a /dashboard/resumen)
  if (!hasPass && !location.state?.fromBtn) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}