import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sparkles, Snowflake, Heart, Sun, Leaf } from "lucide-react";

/* ===== helpers ===== */
function getUser() {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); }
  catch { return {}; }
}

// 🎉 Obtener tema y elementos según la temporada
function getSeasonalTheme() {
  const month = new Date().getMonth() + 1; // 1-12
  const day = new Date().getDate();

  // Navidad (Diciembre)
  if (month === 12) {
    return {
      emoji: "🎄",
      color: "#dc2626",
      gradient: "linear-gradient(135deg, #dc2626, #16a34a)",
      particles: ["❄️", "🎁", "⭐", "🔔", "🎅"],
      message: "¡Feliz Navidad!",
      effect: "snow",
      background: "radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.1), transparent 50%), radial-gradient(circle at 80% 50%, rgba(22, 163, 74, 0.1), transparent 50%)",
      icon: Snowflake
    };
  }
  
  // Año Nuevo (Enero 1-7)
  if (month === 1 && day <= 7) {
    return {
      emoji: "🎊",
      color: "#eab308",
      gradient: "linear-gradient(135deg, #eab308, #f59e0b)",
      particles: ["🎉", "🎊", "✨", "🌟", "🎆"],
      message: "¡Feliz Año Nuevo!",
      effect: "fireworks",
      background: "radial-gradient(circle at 50% 50%, rgba(234, 179, 8, 0.1), transparent 70%)",
      icon: Sparkles
    };
  }

  // San Valentín (Febrero)
  if (month === 2) {
    return {
      emoji: "💝",
      color: "#ec4899",
      gradient: "linear-gradient(135deg, #ec4899, #ef4444)",
      particles: ["❤️", "💕", "💖", "💗", "💘"],
      message: "¡Mes del Amor!",
      effect: "hearts",
      background: "radial-gradient(circle at 30% 40%, rgba(236, 72, 153, 0.15), transparent 50%), radial-gradient(circle at 70% 60%, rgba(239, 68, 68, 0.15), transparent 50%)",
      icon: Heart
    };
  }

  // Primavera (Marzo-Mayo)
  if (month >= 3 && month <= 5) {
    return {
      emoji: "🌸",
      color: "#ec4899",
      gradient: "linear-gradient(135deg, #ec4899, #a855f7)",
      particles: ["🌸", "🌺", "🌼", "🦋", "🌷"],
      message: "¡Bienvenida Primavera!",
      effect: "petals",
      background: "radial-gradient(circle at 40% 30%, rgba(236, 72, 153, 0.1), transparent 60%), radial-gradient(circle at 60% 70%, rgba(168, 85, 247, 0.1), transparent 60%)",
      icon: Sparkles
    };
  }

  // Verano (Junio-Agosto)
  if (month >= 6 && month <= 8) {
    return {
      emoji: "☀️",
      color: "#f59e0b",
      gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
      particles: ["☀️", "🌴", "🏖️", "🍉", "🌊"],
      message: "¡Feliz Verano!",
      effect: "sun",
      background: "radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.15), transparent 70%)",
      icon: Sun
    };
  }

  // Otoño (Septiembre-Noviembre)
  if (month >= 9 && month <= 11) {
    return {
      emoji: "🍂",
      color: "#ea580c",
      gradient: "linear-gradient(135deg, #ea580c, #dc2626)",
      particles: ["🍂", "🍁", "🎃", "🌰", "🦔"],
      message: "¡Hermoso Otoño!",
      effect: "leaves",
      background: "radial-gradient(circle at 30% 40%, rgba(234, 88, 12, 0.1), transparent 60%), radial-gradient(circle at 70% 60%, rgba(220, 38, 38, 0.1), transparent 60%)",
      icon: Leaf
    };
  }

  // Default (confeti general)
  return {
    emoji: "🎉",
    color: "#6ab80a",
    gradient: "linear-gradient(135deg, #6ab80a, #82cc0e)",
    particles: ["🎉", "✨", "⭐", "🌟", "💫"],
    message: "¡Bienvenido!",
    effect: "confetti",
    background: "radial-gradient(circle at 50% 50%, rgba(106, 184, 10, 0.1), transparent 70%)",
    icon: Sparkles
  };
}

/* ===== Dashboard ===== */
export default function Dashboard() {
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [showConfetti, setShowConfetti] = useState(true);
  const theme = getSeasonalTheme();
  const IconComponent = theme.icon;

  // 🛡️ PROTECCIÓN ANTI-LOOP
  useEffect(() => {
    const path = location.pathname;
    const resumenes = (path.match(/\/resumen/g) || []).length;
    if (resumenes > 1 || path.length > 100) {
      console.warn("⚠️ URL corrupta detectada. Limpiando...");
      window.history.replaceState(null, "", "/app/dashboard");
      return;
    }
  }, [location.pathname]);

  // 🎉 Ocultar confetti después de 6 segundos
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  // 🎊 Crear partículas según el efecto
  const createParticles = () => {
    const count = theme.effect === 'snow' ? 50 : theme.effect === 'fireworks' ? 40 : 30;
    
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: theme.particles[Math.floor(Math.random() * theme.particles.length)],
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: theme.effect === 'snow' ? 8 + Math.random() * 4 : 
                theme.effect === 'fireworks' ? 2 + Math.random() * 2 :
                theme.effect === 'hearts' ? 6 + Math.random() * 3 :
                theme.effect === 'petals' ? 7 + Math.random() * 4 :
                theme.effect === 'sun' ? 5 + Math.random() * 3 :
                theme.effect === 'leaves' ? 6 + Math.random() * 4 :
                3 + Math.random() * 2,
      size: theme.effect === 'snow' ? 15 + Math.random() * 15 :
            theme.effect === 'fireworks' ? 20 + Math.random() * 25 :
            20 + Math.random() * 20,
      rotation: Math.random() * 360,
    }));
  };

  const particles = createParticles();

  // Obtener clase de animación según el efecto
  const getAnimationClass = () => {
    switch(theme.effect) {
      case 'snow': return 'snowFall';
      case 'fireworks': return 'fireworksBurst';
      case 'hearts': return 'heartFloat';
      case 'petals': return 'petalDrift';
      case 'sun': return 'sunRays';
      case 'leaves': return 'leafFall';
      default: return 'confettiFall';
    }
  };

  return (
    <>
      <style>{getStyles(theme)}</style>
      
      <div style={{
        ...containerStyle,
        background: theme.background,
      }}>
        {/* 🎉 Efectos animados */}
        {showConfetti && (
          <div style={confettiContainerStyle}>
            {particles.map((p) => (
              <div
                key={p.id}
                className={getAnimationClass()}
                style={{
                  ...particleStyle,
                  left: `${p.left}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  fontSize: `${p.size}px`,
                  transform: `rotate(${p.rotation}deg)`,
                }}
              >
                {p.emoji}
              </div>
            ))}
          </div>
        )}

        {/* Card principal con efecto de brillo */}
        <div style={{
          ...cardStyle,
          borderTop: `4px solid ${theme.color}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px ${theme.color}20`,
        }}>
          {/* Icono decorativo animado */}
          <div style={{
            ...iconCircleStyle,
            background: theme.gradient,
            boxShadow: `0 8px 24px ${theme.color}40, 0 0 40px ${theme.color}20`,
          }}>
            <span style={{ fontSize: 40 }} className="iconBounce">{theme.emoji}</span>
          </div>

          {/* Saludo con efecto gradient */}
          <h1 style={titleStyle}>
            ¡Hola, {user?.nombre || user?.usuario || "Usuario"}! 
          </h1>
          
          <p style={{
            ...seasonalMessageStyle,
            background: theme.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {theme.message}
          </p>
          
          <p style={greetingStyle}>
            Bienvenido al sistema de gestión
          </p>

          {/* Decoración inferior con iconos animados */}
          <div style={sparkleContainerStyle}>
            <IconComponent size={18} style={{ color: theme.color }} className="sparkleIcon" />
            <span style={{ ...sparkleTextStyle, color: theme.color }}>
              Que tengas un excelente día
            </span>
            <IconComponent size={18} style={{ color: theme.color }} className="sparkleIcon" />
          </div>

          {/* Barra decorativa inferior */}
          <div style={{
            marginTop: 24,
            height: 4,
            background: theme.gradient,
            borderRadius: 2,
            opacity: 0.3,
          }} />
        </div>
      </div>
    </>
  );
}

/* ===== Estilos Dinámicos y Animaciones ===== */
function getStyles(theme) {
  return `
    /* Animación base de confetti */
    @keyframes confettiFall {
      0% {
        transform: translateY(-100vh) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }

    /* Nieve cayendo suavemente */
    @keyframes snowFall {
      0% {
        transform: translateY(-100vh) translateX(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) translateX(100px) rotate(360deg);
        opacity: 0.3;
      }
    }

    /* Fuegos artificiales explosivos */
    @keyframes fireworksBurst {
      0% {
        transform: translateY(100vh) scale(0) rotate(0deg);
        opacity: 1;
      }
      50% {
        transform: translateY(30vh) scale(1.5) rotate(180deg);
        opacity: 1;
      }
      100% {
        transform: translateY(-20vh) scale(0.5) rotate(360deg);
        opacity: 0;
      }
    }

    /* Corazones flotantes */
    @keyframes heartFloat {
      0% {
        transform: translateY(100vh) translateX(0) scale(0.5) rotate(0deg);
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      90% {
        opacity: 1;
      }
      100% {
        transform: translateY(-20vh) translateX(50px) scale(1.2) rotate(20deg);
        opacity: 0;
      }
    }

    /* Pétalos flotando */
    @keyframes petalDrift {
      0% {
        transform: translateY(-100vh) translateX(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) translateX(-80px) rotate(540deg);
        opacity: 0.2;
      }
    }

    /* Rayos de sol */
    @keyframes sunRays {
      0% {
        transform: translateY(-100vh) scale(0.5) rotate(0deg);
        opacity: 0;
      }
      20% {
        opacity: 1;
      }
      80% {
        opacity: 0.8;
      }
      100% {
        transform: translateY(100vh) scale(1.5) rotate(180deg);
        opacity: 0;
      }
    }

    /* Hojas cayendo */
    @keyframes leafFall {
      0% {
        transform: translateY(-100vh) translateX(0) rotate(0deg);
        opacity: 1;
      }
      50% {
        transform: translateY(50vh) translateX(100px) rotate(180deg);
      }
      100% {
        transform: translateY(100vh) translateX(-50px) rotate(360deg);
        opacity: 0;
      }
    }

    /* Animación de entrada */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Pulso suave */
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }

    /* Flotación */
    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    /* Rebote del icono */
    @keyframes iconBounce {
      0%, 100% {
        transform: scale(1) rotate(0deg);
      }
      25% {
        transform: scale(1.1) rotate(-5deg);
      }
      75% {
        transform: scale(1.1) rotate(5deg);
      }
    }

    /* Brillo de sparkles */
    @keyframes sparkle {
      0%, 100% {
        opacity: 1;
        transform: scale(1) rotate(0deg);
      }
      50% {
        opacity: 0.5;
        transform: scale(1.2) rotate(180deg);
      }
    }

    .iconBounce {
      display: inline-block;
      animation: iconBounce 2s ease-in-out infinite;
    }

    .sparkleIcon {
      animation: sparkle 2s ease-in-out infinite;
    }

    /* Clases de animación */
    .snowFall { animation: snowFall linear forwards; }
    .fireworksBurst { animation: fireworksBurst ease-out forwards; }
    .heartFloat { animation: heartFloat ease-in-out forwards; }
    .petalDrift { animation: petalDrift ease-in-out forwards; }
    .sunRays { animation: sunRays ease-out forwards; }
    .leafFall { animation: leafFall ease-in-out forwards; }
    .confettiFall { animation: confettiFall linear forwards; }
  `;
}

/* ===== Estilos en línea ===== */
const containerStyle = {
  padding: 24,
  maxWidth: 800,
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  position: 'relative',
  transition: 'background 0.5s ease',
};

const confettiContainerStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 1000,
  overflow: 'hidden',
};

const particleStyle = {
  position: 'absolute',
  top: '-50px',
  userSelect: 'none',
};

const cardStyle = {
  background: 'var(--surface, white)',
  borderRadius: 24,
  padding: 48,
  textAlign: 'center',
  width: '100%',
  position: 'relative',
  border: '1px solid var(--border, #e5e7eb)',
  animation: 'fadeInUp 0.6s ease-out',
  transition: 'all 0.3s ease',
};

const iconCircleStyle = {
  width: 100,
  height: 100,
  margin: '0 auto 24px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'float 3s ease-in-out infinite',
  transition: 'all 0.3s ease',
};

const titleStyle = {
  fontSize: 36,
  fontWeight: 700,
  color: 'var(--text, #111827)',
  marginBottom: 12,
  animation: 'fadeInUp 0.6s ease-out 0.2s backwards',
};

const seasonalMessageStyle = {
  fontSize: 24,
  fontWeight: 600,
  marginBottom: 8,
  animation: 'fadeInUp 0.6s ease-out 0.3s backwards, pulse 2s ease-in-out infinite',
};

const greetingStyle = {
  fontSize: 16,
  color: 'var(--text-secondary, #6b7280)',
  lineHeight: 1.6,
  animation: 'fadeInUp 0.6s ease-out 0.4s backwards',
};

const sparkleContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  marginTop: 32,
  paddingTop: 24,
  borderTop: '1px solid var(--border, #e5e7eb)',
  animation: 'fadeInUp 0.6s ease-out 0.5s backwards',
};

const sparkleTextStyle = {
  fontSize: 14,
  fontWeight: 600,
};