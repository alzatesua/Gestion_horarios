// src/pages/Asesores.jsx
export default function Asesores() {
  const styles = {
    container: {
      padding: 24,
      maxWidth: 800,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh'
    },
    card: {
      background: '#fff',
      borderRadius: 16,
      padding: 48,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      textAlign: 'center',
      width: '100%'
    },
    icon: {
      fontSize: 64,
      marginBottom: 24
    },
    title: {
      fontSize: 28,
      fontWeight: 600,
      color: '#1e293b',
      marginBottom: 12
    },
    message: {
      fontSize: 16,
      color: '#64748b',
      lineHeight: 1.6,
      marginBottom: 24
    },
    badge: {
      display: 'inline-block',
      padding: '8px 16px',
      borderRadius: 20,
      background: '#dbeafe',
      color: '#2563eb',
      fontSize: 14,
      fontWeight: 500
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🚧</div>
        <h1 style={styles.title}>Próximamente</h1>
        <p style={styles.message}>
          Esta sección está en desarrollo y estará disponible pronto.
          <br />
          Estamos trabajando para ofrecerte la mejor experiencia.
        </p>
        <span style={styles.badge}>En construcción</span>
      </div>
    </div>
  );
}