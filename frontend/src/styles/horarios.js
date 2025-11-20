// src/styles/estilos.js
const styles = {
  // ===== Layout general =====
  container: {
    padding: 24,
    maxWidth: 1400,
    margin: '0 auto',
    background: 'var(--bg)',
    minHeight: '100vh',
  },
  errorBanner: {
    padding: '12px 16px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: 8,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text)',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  headerActions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  wsStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    background: 'var(--surface)',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text)',
  },
  exportBtn: {
    padding: '10px 20px',
    background: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
  },

  // ===== Tabs =====
  tabs: {
    display: 'flex',
    gap: 8,
    borderBottom: '2px solid var(--border)',
    marginBottom: 24,
  },
  tab: {
    padding: '12px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  tabActive: {
    color: 'var(--accent)',
    borderBottomColor: 'var(--accent)',
    fontWeight: 600,
  },

  // ===== Contenido y cards =====
  content: { marginTop: 24 },
  card: {
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 2px 8px var(--shadow)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text)',
  },

  // ===== Filtros generales (vista Control) =====
  filters: { display: 'flex', gap: 8 },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: 13,
  },
  searchBox: { position: 'relative' },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-secondary)',
  },
  // (usado en "Control en tiempo real")
  searchInput: {
    padding: '8px 12px 8px 32px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: 13,
    width: 200,
  },

  // ===== Estadísticas (Control) =====
  estadisticasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 24,
  },
  estadisticaCard: {
    padding: 20,
    background: 'var(--bg)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    textAlign: 'center',
  },
  estadisticaValor: {
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--accent)',
    marginBottom: 4,
  },
  estadisticaLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },

  // ===== Cards de asesores (Control) =====
  asesorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: 16,
  },
  asesorCard: {
    padding: 20,
    background: 'var(--bg)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    transition: 'all 0.2s',
  },
  asesorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: 16,
  },
  asesorAvatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6ab80a, #82cc0e)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
  },
  estadoDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: '2px solid var(--bg)',
  },
  asesorInfo: { marginBottom: 12 },
  asesorNombre: { margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: 'var(--text)' },
  asesorCargo: { margin: '0 0 4px 0', fontSize: 13, color: 'var(--text-secondary)' },
  asesorArea: { margin: 0, fontSize: 12, color: 'var(--accent)', fontWeight: 500 },
  asesorEstado: { marginBottom: 12 },
  estadoBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  jornadaInfo: {
    display: 'flex',
    gap: 12,
    marginBottom: 12,
    paddingTop: 12,
    borderTop: '1px solid var(--border)',
  },
  jornadaItem: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' },
  asesorFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTop: '1px solid var(--border)',
  },
  lastUpdate: { fontSize: 11, color: 'var(--text-secondary)' },

  // ===== Estados de carga =====
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    color: 'var(--text-secondary)',
  },

  // ===== Formulario de horarios =====
  grid: { display: 'grid', gap: 24 },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  diasGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 },
  diaBtn: {
    padding: '8px 4px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  diaBtnActive: { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' },

  // ===== Tabla de horarios =====
  horariosTable: { overflowX: 'auto' },
  asesorCelda: { display: 'flex', alignItems: 'center', gap: 12 },
  asesorAvatarSmall: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'linear-gradient(135deg, #6ab80a, #82cc0e)',
    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  asesorNombreTabla: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  asesorCargoTabla: { fontSize: 12, color: 'var(--text-secondary)' },
  horarioBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, fontWeight: 500,
  },
  diasBadge: { fontSize: 13, fontWeight: 600, color: 'var(--accent)' },
  minutosExtra: {
    display: 'inline-block', padding: '4px 8px', background: '#d4f4dd',
    color: '#1e5631', borderRadius: 6, fontSize: 12, fontWeight: 600,
  },

  // ===== Solicitudes =====
  solicitudesList: { display: 'flex', flexDirection: 'column', gap: 16 },
  solicitudCard: { padding: 20, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' },
  solicitudHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16,
  },
  solicitudTitulo: { margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: 'var(--text)' },
  solicitudAsesor: { margin: 0, fontSize: 14, color: 'var(--text-secondary)' },
  solicitudBody: { marginBottom: 16 },
  motivoTexto: {
    margin: 0, fontSize: 14, color: 'var(--text)', background: 'var(--surface)',
    padding: 12, borderRadius: 6, border: '1px solid var(--border)',
  },
  solicitudActions: { display: 'flex', gap: 12 },
  approveBtn: {
    flex: 1, padding: '10px', background: '#6ab80a', color: 'white',
    border: 'none', borderRadius: 6, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontSize: 14, fontWeight: 600,
  },
  rejectBtn: {
    flex: 1, padding: '10px', background: '#dc2626', color: 'white',
    border: 'none', borderRadius: 6, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontSize: 14, fontWeight: 600,
  },

  // ===== Form (general) =====
  formGroup: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 },
  label: { fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 },
  input: {
    width: '100%', padding: '12px 14px', border: '2px solid var(--border)', borderRadius: 8,
    background: 'var(--surface)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
    transition: 'all 0.2s ease', outline: 'none',
  },
  select: {
    width: '100%', padding: '12px 14px', border: '2px solid var(--border)', borderRadius: 8,
    background: 'var(--surface)', color: 'var(--text)', fontSize: 14, cursor: 'pointer',
    transition: 'all 0.2s ease', outline: 'none',
  },

  // ===== Botones genéricos =====
  buttonGroup: { display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  submitBtn: {
    flex: '1 1 auto', minWidth: '150px', padding: '14px 24px',
    background: 'linear-gradient(135deg, #6ab80a, #82cc0e)', color: 'white',
    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(130, 204, 14, 0.3)',
  },
  cancelBtn: {
    flex: '1 1 auto', minWidth: '120px', padding: '14px 24px', background: 'transparent',
    color: '#dc2626', border: '2px solid #dc2626', borderRadius: 10,
    fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
  },

  // ===== Tabla genérica =====
  tableContainer: {
    overflowX: 'auto', marginTop: 24, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left', padding: '16px 20px', background: 'var(--bg)',
    borderBottom: '2px solid var(--border)', fontSize: 12, fontWeight: 700,
    color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease' },
  td: { padding: '18px 20px', fontSize: 14, color: 'var(--text)', verticalAlign: 'middle' },

  // ===== Acciones en tabla =====
  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-start' },
  btnEdit: {
    padding: '10px 12px', background: '#82cc0e', color: 'white', border: 'none',
    borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(130, 204, 14, 0.3)',
  },
  btnDelete: {
    padding: '10px 12px', background: '#dc2626', color: 'white', border: 'none',
    borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
  },

  // ===== Badges =====
  badge: {
    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-block',
  },
  badgeSuccess: { background: '#d4f4dd', color: '#1e5631' },
  badgeWarning: { background: '#fef3c7', color: '#92400e' },
  badgeDanger:  { background: '#fee2e2', color: '#991b1b' },

  // ===== Empty states =====
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '60px 20px', gap: 12, color: 'var(--text-secondary)', background: 'var(--bg)',
    borderRadius: 12, border: '2px dashed var(--border)',
  },
  emptyStateIcon: { fontSize: 48, opacity: 0.5 },
  emptyStateText: { fontSize: 16, fontWeight: 500 },

  // ===== Módulo: ESTADOS (filtros/tabla) =====
  estadosFormContainer: {
    display: 'grid', gap: 20, marginBottom: 24, padding: 24,
    background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)',
  },
  sectionTitle: {
    margin: '0 0 16px 0', fontSize: 20, fontWeight: 700, color: 'var(--text)',
    paddingBottom: 12, borderBottom: '2px solid var(--border)',
  },
  sectionDivider: {
    height: 2, background: 'linear-gradient(90deg, var(--border), transparent)',
    margin: '32px 0', borderRadius: 2,
  },
  configCard: {
    padding: 24, background: 'var(--bg)', borderRadius: 12,
    border: '1px solid var(--border)', marginTop: 16,
  },
  colorInput: {
    height: 48, padding: 6, border: '2px solid var(--border)',
    borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s ease',
  },
  colorPreview: { display: 'inline-flex', alignItems: 'center', gap: 10 },
  colorSwatch: {
    width: 24, height: 24, borderRadius: 6, border: '2px solid var(--border)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  colorHex: { fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)' },

  // Filtros Estados (sin depender de mostrarFiltros en el archivo)
  filtrosContainer: {
    background: 'var(--surface);',
    border: '1px solid var(--surface);',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  filtrosHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  btnToggleFiltros: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px',
    background: 'var(--bg, white)',
    border: '1px solid var(--border, #363636ff)',
    borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
    color: 'var(--text)', transition: 'all 0.2s',
  },
  btnToggleFiltrosOn:  { background: '#d4f4dd', borderColor: '#82cc0e' },
  btnToggleFiltrosOff: { background: 'var(--bg, white)', borderColor: 'var(--border, #2a2a2a)' },

  // Buscador Estados (separado del searchBox de "Control")
  searchContainer: { position: 'relative', marginBottom: 0 },
  selectInput: {
    padding: '8px 12px',
    border: '1px solid var(--surface);',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
    background: 'var(--bg, white)',
  },
  clearBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary, #6b7280)',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  filtrosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  btnLimpiar: {
    padding: '8px 16px',
    background: 'var(--bg)',
    border: '1px solid var(--border, #2a2a2a)',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text)',
  },

  // Barra de stats Estados
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'var(--bg)',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    color: 'var(--text-secondary)',
  },

  // Tabla Estados (reutiliza table*, colorPreview*, acciones, etc.)
  sortIndicator: { marginLeft: 8, fontSize: 12, opacity: 0.6 },
};

export default styles;