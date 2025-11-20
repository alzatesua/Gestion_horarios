// src/app/components/RoleRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { canAccessByCargo } from "../auth/permissions";
import { useAuth } from "../auth/useAuth"; // debe exponer user con .cargo o .cargos

export default function RoleRoute({ path, children }) {
  const { user } = useAuth();
  const location = useLocation();

  // Si no pasas path, lo inferimos desde la URL (quitando el basename /app)
  const inferred = (path ?? location.pathname.replace(/^\/app\//, "")).replace(/^\/+/, "");

  return canAccessByCargo(user, inferred)
    ? children
    : <Navigate to="/app/dashboard" replace />;
}
