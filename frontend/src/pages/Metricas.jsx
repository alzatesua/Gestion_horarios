import { useState, useEffect } from "react";
import { BarChart3, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

// 🔧 CONFIGURA AQUÍ LA URL DE POWER BI
const POWERBI_URL = ""; // Ejemplo: "https://app.powerbi.com/view?r=xxxxx"

export default function Metricas() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (POWERBI_URL) {
      setIsLoading(true);
      setHasError(false);
      
      // Simula carga del iframe
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  }, []);

  const handleRefresh = () => {
    if (!POWERBI_URL) return;
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => setIsLoading(false), 1500);
  };

  const handleIframeError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  return (
    <>
      <style>{styles}</style>
      
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={headerLeftStyle}>
            <div style={iconCircleStyle}>
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 style={titleStyle}>Métricas y Reportes</h1>
              <p style={subtitleStyle}>
                Visualiza reportes de tiempos, productividad y asistencia en tiempo real
              </p>
            </div>
          </div>
          
          {POWERBI_URL && (
            <div style={headerActionsStyle}>
              <button 
                onClick={handleRefresh} 
                style={actionButtonStyle}
                title="Refrescar"
              >
                <RefreshCw size={18} />
                <span>Refrescar</span>
              </button>
              <a 
                href={POWERBI_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                style={actionButtonLinkStyle}
                title="Abrir en nueva pestaña"
              >
                <ExternalLink size={18} />
                <span>Abrir</span>
              </a>
            </div>
          )}
        </div>

        {/* Contenido principal */}
        <div style={contentStyle}>
          {isLoading ? (
            // Estado de carga
            <div style={loadingStateStyle}>
              <div style={spinnerStyle}></div>
              <h3 style={loadingTitleStyle}>Cargando métricas...</h3>
              <p style={loadingTextStyle}>Esto puede tomar unos segundos</p>
            </div>
          ) : hasError || !POWERBI_URL ? (
            // Estado de error o sin URL
            <div style={emptyStateStyle}>
              <div style={emptyIconStyle}>
                <AlertCircle size={80} strokeWidth={1.5} />
              </div>
              <h3 style={emptyTitleStyle}>Metricas no disponible por ahora</h3>
              <p style={emptyTextStyle}>
                Las métricas están siendo configuradas. Por favor, vuelve más tarde.
              </p>
              
              <div style={infoBoxStyle}>
                <h4 style={infoTitleStyle}>Próximamente disponible</h4>
                <p style={infoDescStyle}>
                  Estamos trabajando para traerte los mejores reportes de:
                </p>
                <ul style={infoListStyle}>
                  <li>Tiempos de trabajo y productividad</li>
                  <li>Asistencia y puntualidad</li>
                  <li>Rendimiento por área</li>
                  <li>Métricas de eficiencia</li>
                </ul>
              </div>
            </div>
          ) : (
            // iframe de Power BI
            <div style={iframeContainerStyle}>
              <iframe
                src={POWERBI_URL}
                style={iframeStyle}
                frameBorder="0"
                allowFullScreen
                title="Power BI Report"
                onError={handleIframeError}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ===== Estilos CSS ===== */
const styles = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const containerStyle = {
  padding: 24,
  minHeight: "calc(100vh - 140px)",
  background: "var(--bg)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 24,
  flexWrap: "wrap",
  gap: 16,
};

const headerLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const iconCircleStyle = {
  width: 56,
  height: 56,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #6ab80a, #82cc0e)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 12px rgba(130, 204, 14, 0.3)",
  flexShrink: 0,
};

const titleStyle = {
  margin: 0,
  fontSize: 28,
  fontWeight: 700,
  color: "var(--text)",
};

const subtitleStyle = {
  margin: "4px 0 0 0",
  fontSize: 14,
  color: "var(--text-secondary)",
};

const headerActionsStyle = {
  display: "flex",
  gap: 12,
};

const actionButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 20px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 4px var(--shadow)",
};

const actionButtonLinkStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 20px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 4px var(--shadow)",
  textDecoration: "none",
};

const contentStyle = {
  background: "var(--surface)",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 4px 12px var(--shadow)",
  border: "1px solid var(--border)",
  minHeight: 600,
};

const loadingStateStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 80,
  gap: 20,
  animation: "fadeIn 0.5s ease",
};

const spinnerStyle = {
  width: 56,
  height: 56,
  border: "5px solid var(--border)",
  borderTop: "5px solid var(--accent)",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const loadingTitleStyle = {
  fontSize: 22,
  fontWeight: 600,
  color: "var(--text)",
  margin: 0,
};

const loadingTextStyle = {
  fontSize: 15,
  color: "var(--text-secondary)",
  margin: 0,
};

const emptyStateStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "80px 40px",
  gap: 24,
  animation: "fadeIn 0.5s ease",
};

const emptyIconStyle = {
  color: "var(--text-secondary)",
  opacity: 0.4,
  animation: "pulse 2s ease-in-out infinite",
};

const emptyTitleStyle = {
  fontSize: 28,
  fontWeight: 700,
  color: "var(--text)",
  margin: 0,
  textAlign: "center",
};

const emptyTextStyle = {
  fontSize: 16,
  color: "var(--text-secondary)",
  textAlign: "center",
  maxWidth: 500,
  lineHeight: 1.6,
  margin: 0,
};

const infoBoxStyle = {
  marginTop: 16,
  padding: 32,
  background: "var(--bg)",
  border: "2px solid var(--border)",
  borderRadius: 16,
  maxWidth: 600,
  textAlign: "left",
  width: "100%",
};

const infoTitleStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: "var(--text)",
  marginBottom: 12,
  margin: 0,
};

const infoDescStyle = {
  fontSize: 15,
  color: "var(--text-secondary)",
  lineHeight: 1.6,
  marginTop: 8,
  marginBottom: 16,
};

const infoListStyle = {
  fontSize: 15,
  color: "var(--text-secondary)",
  lineHeight: 2,
  paddingLeft: 24,
  margin: 0,
};

const iframeContainerStyle = {
  position: "relative",
  width: "100%",
  height: "calc(100vh - 300px)",
  minHeight: 600,
};

const iframeStyle = {
  width: "100%",
  height: "100%",
  border: "none",
  display: "block",
};