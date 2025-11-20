// src/app/auth/permissions.js
import { NAV } from "../data/nav";

// normaliza (quita acentos, espacios extra, mayúsculas)
const norm = (s) =>
  String(s || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .trim().toLowerCase();

// Mapa: path -> Set de CARGOS permitidos
const allowedByPath = NAV.reduce((acc, item) => {
  const key = String(item.path).replace(/^\/+/, "");   // "metricas", "roles", etc.
  acc[key] = new Set(item.roles.map(norm));            // aquí tus "roles" del NAV son cargos humanos
  return acc;
}, {});

// Devuelve true si el usuario (por cargo) puede acceder a "path"
export function canAccessByCargo(user, path) {
  const key = String(path || "").replace(/^\/+/, "");
  const allowed = allowedByPath[key];
  if (!allowed) return false;
  if (allowed.has(norm("*"))) return true;

  // soporta user.cargo (string) o user.cargos (array)
  const cargos = Array.isArray(user?.cargos) && user.cargos.length
    ? user.cargos
    : [user?.cargo].filter(Boolean);

  const userSet = new Set(cargos.map(norm));
  for (const a of allowed) if (userSet.has(a)) return true;
  return false;
}
