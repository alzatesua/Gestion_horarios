// src/app/layout/Layout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { Moon, Sun, User, LogOut, Settings, ChevronDown } from "lucide-react";
import { NAV } from "../data/nav";
import { canAccessByCargo } from "../auth/permissions";

/* ===== helpers auth (localStorage) ===== */
const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); }
  catch { return {}; }
};

const logout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  window.location.replace("/app/login");
};

/* ===== componente ===== */
export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();

  // Filtra el menú según cargo(s) del usuario
  const visible = useMemo(
    () => NAV.filter((i) => canAccessByCargo(user, i.path)),
    [user]
  );

  /* ===== tema (light/dark) ===== */
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  /* ===== menú de perfil ===== */
  const [openProfile, setOpenProfile] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target)) setOpenProfile(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  // Iniciales para el avatar
  const getInitials = (name) =>
    (name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Inyecta keyframes mínimos (una sola vez)
  useEffect(() => {
    if (document.getElementById("layout-keyframes")) return;
    const el = document.createElement("style");
    el.id = "layout-keyframes";
    el.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      button:hover { opacity: .9; }
    `;
    document.head.appendChild(el);
  }, []);

  // ✅ Función para manejar clics en la navegación
  const handleNavClick = (e, path) => {
    e.preventDefault();
    
    // Elimina cualquier "/" inicial o múltiple del path
    const cleanPath = String(path).replace(/^\/+/, '');
    
    console.log('🔵 Navegando a:', cleanPath); // Debug
    
    // Navega de forma absoluta desde el basename (/app)
    navigate(`/${cleanPath}`, { replace: true });
  };

  return (
    <div style={containerStyle}>
      <style>{cssVariables}</style>

      {/* Topbar */}
      <div style={topbarStyle}>
        <div style={brandSection}>
          <div>
            <h1 style={brandTitle}>Sistema de Gestión</h1>
            <p style={brandSubtitle}>Panel de Control</p>
          </div>
        </div>

        <div style={topbarActions}>
          {/* Tema */}
          <button
            onClick={toggleTheme}
            title={`Cambiar a modo ${theme === "dark" ? "claro" : "oscuro"}`}
            style={themeToggle}
          >
            {theme === "dark" ? <Sun size={20} style={iconStyle} /> : <Moon size={20} style={iconStyle} />}
          </button>

          {/* Perfil */}
          <div ref={profileRef} style={{ position: "relative" }}>
            <button onClick={() => setOpenProfile((v) => !v)} style={profileBtn}>
              <div style={avatarStyle}>{getInitials(user?.nombre || user?.usuario)}</div>
              <div style={profileInfo}>
                <span style={profileName}>{user?.nombre || user?.usuario || "Usuario"}</span>
                <span style={profileRole}>{user?.cargo || "invitado"}</span>
              </div>
              <ChevronDown
                size={16}
                style={{
                  ...chevronStyle,
                  transform: openProfile ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {openProfile && (
              <div style={profileMenu}>
                <div style={profileHeader}>
                  {/*<div style={avatarLargeStyle}>{getInitials(user?.nombre || user?.usuario)}</div>*/}
                  <div>
                    <div style={profileHeaderName}>{user?.nombre || user?.usuario}</div>
                    <div style={profileHeaderEmail}>{user?.correo || "sin correo"}</div>
                    <div style={roleTag}>{user?.cargo || "invitado"}</div>
                  </div>
                </div>

                <div style={menuDivider}></div>

                {/*<button
                  onClick={() => {
                    setOpenProfile(false);
                    navigate("/perfil", { replace: true });
                  }}
                  style={menuItem}
                >
                  <User size={18} />
                  <span>Mi Perfil</span>
                </button>

                <button
                  onClick={() => {
                    setOpenProfile(false);
                    // abrir modal/config si deseas
                  }}
                  style={menuItem}
                >
                  <Settings size={18} />
                  <span>Configuración</span>
                </button>*/}

                <div style={menuDivider}></div>

                <button onClick={logout} style={{ ...menuItem, color: "var(--danger)" }}>
                  <LogOut size={18} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navbar (filtrada por cargo) - CON MANEJO DE CLICKS */}
      <nav style={navRow}>
        {visible.map((i) => (
          <NavLink
            key={i.path}
            to={i.path}
            onClick={(e) => handleNavClick(e, i.path)}
            style={({ isActive }) => ({
              ...navLinkStyle,
              ...(isActive ? activeNavLinkStyle : {}),
            })}
          >
            {i.label}
          </NavLink>
        ))}
      </nav>

      {/* Contenido */}
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}

/* ===== Variables CSS para temas ===== */
const cssVariables = `
  :root[data-theme="light"] {
    --bg: #f8fafc;
    --surface: #ffffff;
    --border: #cbd5e1;
    --text: #0f172a;
    --text-secondary: #64748b;
    --nav-active-bg: #82cc0e;
    --nav-active-text: #ffffff;
    --nav-hover-bg: #f1f5f9;
    --danger: #dc2626;
    --accent: #82cc0e;
    --shadow: rgba(0, 0, 0, 0.08);
  }
  :root[data-theme="dark"] {
    --bg: #0a0a0a;
    --surface: #1a1a1a;
    --border: #2a2a2a;
    --text: #e5e5e5;
    --text-secondary: #a3a3a3;
    --nav-active-bg: #82cc0e;
    --nav-active-text: #ffffff;
    --nav-hover-bg: #262626;
    --danger: #dc2626;
    --accent: #82cc0e;
    --shadow: rgba(0, 0, 0, 0.5);
  }
  * {
    transition: background-color .2s ease, color .2s ease, border-color .2s ease;
  }
`;
/* ===== estilos ===== */
const containerStyle = { minHeight: "100vh", background: "var(--bg)" };

const topbarStyle = {
  padding: "12px 24px",
  borderBottom: "1px solid var(--border)",
  background: "var(--surface)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 24,
  boxShadow: "0 1px 3px var(--shadow)",
};

const brandSection = { display: "flex", alignItems: "center", gap: 12 };
const brandTitle = { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)" };
const brandSubtitle = { margin: 0, fontSize: 12, color: "var(--text-secondary)" };

const topbarActions = { display: "flex", alignItems: "center", gap: 16 };

const themeToggle = {
  padding: "8px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--surface)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all .2s ease",
  color: "var(--text)",
};

const iconStyle = { display: "block" };

const profileBtn = {
  padding: "6px 12px",
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--surface)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 10,
  transition: "all .2s ease",
  color: "var(--text)",
};

const avatarStyle = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #6ab80a, #82cc0e)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 700,
};

const avatarLargeStyle = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #6ab80a, #82cc0e)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  fontWeight: 700,
};

const profileInfo = { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 };
const profileName = { fontWeight: 600, fontSize: 14, color: "var(--text)" };
const profileRole = { fontSize: 12, color: "var(--text-secondary)" };
const chevronStyle = { transition: "transform .2s ease", color: "var(--text-secondary)" };

const profileMenu = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 8px)",
  minWidth: 280,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  boxShadow: "0 10px 40px var(--shadow)",
  overflow: "hidden",
  zIndex: 1000,
  animation: "fadeIn .2s ease",
};

const profileHeader = { padding: 16, display: "flex", gap: 12, background: "var(--bg)" };
const profileHeaderName = { fontWeight: 700, fontSize: 16, color: "var(--text)", marginTop: 4 };
const profileHeaderEmail = { fontSize: 13, color: "var(--text-secondary)", marginTop: 2 };

const roleTag = {
  display: "inline-block",
  padding: "4px 10px",
  marginTop: 8,
  fontSize: 11,
  fontWeight: 600,
  background: "var(--accent)",
  color: "white",
  borderRadius: 12,
  textTransform: "uppercase",
};

const menuDivider = { height: 1, background: "var(--border)", margin: "8px 0" };

const menuItem = {
  width: "100%",
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 12,
  fontSize: 14,
  color: "var(--text)",
  transition: "all .2s ease",
  textAlign: "left",
};

const navRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  padding: "12px 24px",
  borderBottom: "1px solid var(--border)",
  background: "var(--surface)",
};

const navLinkStyle = {
  padding: "10px 18px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  textDecoration: "none",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 500,
  transition: "all .2s ease",
  background: "transparent",
};

const activeNavLinkStyle = {
  background: "var(--nav-active-bg)",
  color: "var(--nav-active-text)",
  borderColor: "var(--nav-active-bg)",
  fontWeight: 600,
};

const mainStyle = {
  padding: 24,
  background: "var(--bg)",
  minHeight: "calc(100vh - 140px)",
  color: "var(--text)",
};