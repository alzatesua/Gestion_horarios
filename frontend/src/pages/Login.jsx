import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Lock, User, Eye, EyeOff, Moon, Sun } from "lucide-react";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  /* ===== Tema ===== */
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.login({ usuario, clave });
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user || {}));
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{cssVariables}</style>
      <div style={containerStyle}>
        {/* Botón de tema flotante */}
        <button onClick={toggleTheme} style={themeToggleBtn} title="Cambiar tema">
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Card de login */}
        <div style={loginCard}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={logoCircle}>
              <Lock size={32} strokeWidth={2.5} />
            </div>
            <h1 style={titleStyle}>Bienvenido</h1>
            <p style={subtitleStyle}>Ingresa tus credenciales para continuar</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} style={formStyle}>
            {/* Input Usuario */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Usuario</label>
              <div style={inputWrapperStyle}>
                <User size={18} style={iconStyle} />
                <input
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Contraseña</label>
              <div style={inputWrapperStyle}>
                <Lock size={18} style={iconStyle} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Ingresa tu contraseña"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  required
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={eyeButtonStyle}
                  title={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={errorBoxStyle}>
                <span style={errorTextStyle}>{error}</span>
              </div>
            )}

            {/* Botón Submit */}
            <button type="submit" disabled={loading} style={submitButtonStyle}>
              {loading ? (
                <>
                  <div style={spinnerStyle}></div>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Iniciar sesión</span>
              )}
            </button>
          </form>

          {/* Footer 
          <div style={footerStyle}>
            <p style={footerTextStyle}>¿Olvidaste tu contraseña?</p>
            <button style={linkButtonStyle}>Recuperar acceso</button>
          </div>*/}
        </div>

        {/* Info adicional */}
        <p style={bottomTextStyle}>Sistema de Gestión horarios distritec © 2025</p>
      </div>
    </>
  );
}

/* ===== Variables CSS ===== */
const cssVariables = `
  :root[data-theme="light"] {
    --bg: #f8fafc;
    --surface: #ffffff;
    --border: #cbd5e1;
    --text: #0f172a;
    --text-secondary: #64748b;
    --input-bg: #f8fafc;
    --danger: #dc2626;
    --accent: #82cc0e;
    --accent-hover: #6ab80a;
    --shadow: rgba(0, 0, 0, 0.08);
    --shadow-lg: rgba(0, 0, 0, 0.12);
  }
  :root[data-theme="dark"] {
    --bg: #0a0a0a;
    --surface: #1a1a1a;
    --border: #2a2a2a;
    --text: #e5e5e5;
    --text-secondary: #a3a3a3;
    --input-bg: #0f0f0f;
    --danger: #dc2626;
    --accent: #82cc0e;
    --accent-hover: #6ab80a;
    --shadow: rgba(0, 0, 0, 0.3);
    --shadow-lg: rgba(0, 0, 0, 0.5);
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
`;

/* ===== Estilos ===== */
const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "var(--bg)",
  position: "relative",
  transition: "background 0.3s ease",
};

const themeToggleBtn = {
  position: "absolute",
  top: 24,
  right: 24,
  padding: 12,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text)",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 8px var(--shadow)",
};

const loginCard = {
  width: "100%",
  maxWidth: 440,
  background: "var(--surface)",
  borderRadius: 24,
  padding: 48,
  boxShadow: "0 8px 32px var(--shadow-lg)",
  border: "1px solid var(--border)",
  transition: "all 0.3s ease",
};

const headerStyle = {
  textAlign: "center",
  marginBottom: 40,
};

const logoCircle = {
  width: 80,
  height: 80,
  margin: "0 auto 24px",
  background: "linear-gradient(135deg, #6ab80a, #82cc0e)",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  boxShadow: "0 8px 24px rgba(130, 204, 14, 0.3)",
};

const titleStyle = {
  fontSize: 32,
  fontWeight: 700,
  color: "var(--text)",
  marginBottom: 8,
};

const subtitleStyle = {
  fontSize: 15,
  color: "var(--text-secondary)",
  fontWeight: 400,
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const inputGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text)",
  marginBottom: 4,
};

const inputWrapperStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const iconStyle = {
  position: "absolute",
  left: 16,
  color: "var(--text-secondary)",
  pointerEvents: "none",
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px 14px 48px",
  fontSize: 15,
  border: "2px solid var(--border)",
  borderRadius: 12,
  background: "var(--input-bg)",
  color: "var(--text)",
  outline: "none",
  transition: "all 0.2s ease",
  fontFamily: "inherit",
};

const eyeButtonStyle = {
  position: "absolute",
  right: 16,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 4,
  display: "flex",
  alignItems: "center",
  color: "var(--text-secondary)",
  transition: "color 0.2s ease",
};

const errorBoxStyle = {
  padding: "12px 16px",
  background: "#fee2e2",
  border: "1px solid #fca5a5",
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const errorTextStyle = {
  fontSize: 14,
  color: "#991b1b",
  fontWeight: 500,
};

const submitButtonStyle = {
  width: "100%",
  padding: "16px 24px",
  fontSize: 16,
  fontWeight: 600,
  color: "white",
  background: "linear-gradient(135deg, #6ab80a, #82cc0e)",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "all 0.3s ease",
  boxShadow: "0 4px 16px rgba(130, 204, 14, 0.3)",
  marginTop: 8,
};

const spinnerStyle = {
  width: 18,
  height: 18,
  border: "3px solid rgba(255, 255, 255, 0.3)",
  borderTop: "3px solid white",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const footerStyle = {
  marginTop: 32,
  textAlign: "center",
  paddingTop: 24,
  borderTop: "1px solid var(--border)",
};

const footerTextStyle = {
  fontSize: 14,
  color: "var(--text-secondary)",
  marginBottom: 8,
};

const linkButtonStyle = {
  background: "transparent",
  border: "none",
  color: "var(--accent)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  transition: "opacity 0.2s ease",
};

const bottomTextStyle = {
  marginTop: 24,
  fontSize: 13,
  color: "var(--text-secondary)",
  textAlign: "center",
};