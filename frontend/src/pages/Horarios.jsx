import { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Award, Filter } from 'lucide-react';
import { 
  getHorarioActualAsesor, 
  getJornadaActual,
  crearSolicitud
} from '../lib/workforce';
import { notifySuccess, notifyError } from '../lib/notify.jsx';

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); }
  catch { return {}; }
};

export default function Horarios() {
  const user = getUser();
  const [registros, setRegistros] = useState([]);
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth());
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [estadisticas, setEstadisticas] = useState({
    horasTotales: 0,
    diasTrabajados: 0,
    promedioDiario: 0,
    totalBreaks: 0
  });
  const [jornada, setJornada] = useState(null);
  const [balance, setBalance] = useState({ trabajado: 0, esperado: 0, diferencia: 0 });

  // 🔹 Estado para crear solicitud
  const [mostrandoSolicitud, setMostrandoSolicitud] = useState(false);
  const [tipoSolicitud, setTipoSolicitud] = useState('Cambio de horario');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  
  const [fechaSolicitud, setFechaSolicitud] = useState(
    new Date().toISOString().split('T')[0]   // hoy por defecto
  );
  const [minutos, setMinutos] = useState(30);




  useEffect(() => {
    cargarRegistros();
  }, [filtroMes, filtroAnio]);

  useEffect(() => {
    const cargarJornada = async () => {
      try {
        const data = await getJornadaActual(user.id_asesor || user.id);

        const trabajado = data?.total_seg || 0;
        const esperado = 8 * 3600; // 8 horas por defecto
        const diferencia = trabajado - esperado;

        setJornada(data);
        setBalance({ trabajado, esperado, diferencia });
      } catch (err) {
        console.error('Error al cargar jornada:', err);
      }
    };

    cargarJornada();
  }, []);

  const cargarRegistros = async () => {
    try {
      if (!user?.id && !user?.id_asesor) {
        console.warn('No se encontró el ID del usuario');
        return;
      }

      const asesorId = user.id_asesor ?? user.id ?? user.external_id;

      const data = await getHorarioActualAsesor(asesorId);

      const registro = {
        id: data?.horario_id || 0,
        fecha: data?.fecha,
        horaEntrada: data?.hora_entrada?.slice(0, 5),
        horaSalida: data?.hora_salida?.slice(0, 5),
        diasSemana: data?.dias_semana || [],
        estado: 'completado',
        horasTrabajadas: calcularHorasTrabajadas(data?.hora_entrada, data?.hora_salida),
        breaks: [],
        almuerzo: null,
      };

      setRegistros([registro]);
      calcularEstadisticas([registro]);
    } catch (err) {
      console.error('Error al cargar horarios:', err);
    }
  };

  const calcularHorasTrabajadas = (inicio, fin) => {
    if (!inicio || !fin) return 0;
    const [hi, mi] = inicio.split(':').map(Number);
    const [hf, mf] = fin.split(':').map(Number);
    const inicioMin = hi * 60 + mi;
    const finMin = hf * 60 + mf;
    const diffHoras = (finMin - inicioMin) / 60;
    return diffHoras > 0 ? diffHoras : 0;
  };

  const calcularEstadisticas = (regs) => {
    const horasTotales = regs.reduce((sum, r) => sum + r.horasTrabajadas, 0);
    const diasTrabajados = regs.length;
    const promedioDiario = diasTrabajados > 0 ? horasTotales / diasTrabajados : 0;
    const totalBreaks = regs.reduce((sum, r) => sum + r.breaks.length, 0);
    
    setEstadisticas({
      horasTotales: horasTotales.toFixed(2),
      diasTrabajados,
      promedioDiario: promedioDiario.toFixed(2),
      totalBreaks
    });
  };

  const formatearTiempo = (segundos) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleEnviarSolicitud = async (e) => {
    e.preventDefault();

    try {
      setEnviandoSolicitud(true);

      const asesorId = user.id_asesor ?? user.id ?? user.external_id;

      const payload = {
        asesor: user.nombre,          // nombre visible
        tipo: tipoSolicitud,          // debe coincidir EXACTO con choices del backend
        fechaSolicitud,               // <- nombre correcto del campo
        minutos: Number(minutos) || 0,
        motivo: comentario,
        id_asesor: asesorId,
        id_sede: user.id_sede,
      };

      console.log('Payload solicitud:', payload);

      await crearSolicitud(payload);

      notifySuccess('Solicitud enviada correctamente');

      // limpiar formulario
      setTipoSolicitud('Minutos adicionales');
      setFechaSolicitud(new Date().toISOString().split('T')[0]);
      setMinutos(30);
      setComentario('');
      setMostrandoSolicitud(false);
    } catch (err) {
      console.error('Error al crear solicitud:', err);
      // el backend te está devolviendo el JSON del error en err.message o err.response.data
      notifyError(
        err.response?.data?.detail ||
        err.message ||
        'No se pudo crear la solicitud. Revisa los campos.'
      );
    } finally {
      setEnviandoSolicitud(false);
    }
  };


  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Mis Horarios</h2>
          <p style={styles.subtitle}>
            {user?.nombre || 'Usuario'} - {user?.cargo || 'Cargo'}
          </p>
        </div>
        
        <div style={styles.filtros}>
          <select 
            style={styles.select}
            value={filtroMes}
            onChange={(e) => setFiltroMes(parseInt(e.target.value))}
          >
            {meses.map((mes, idx) => (
              <option key={idx} value={idx}>{mes}</option>
            ))}
          </select>
          <select 
            style={styles.select}
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(parseInt(e.target.value))}
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div style={styles.estadisticasGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Clock size={24} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <div style={styles.statValor}>{estadisticas.horasTotales}h</div>
            <div style={styles.statLabel}>Horas Totales</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Calendar size={24} style={{ color: '#10b981' }} />
          </div>
          <div>
            <div style={styles.statValor}>{estadisticas.diasTrabajados}</div>
            <div style={styles.statLabel}>Días Trabajados</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <TrendingUp size={24} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <div style={styles.statValor}>{estadisticas.promedioDiario}h</div>
            <div style={styles.statLabel}>Promedio Diario</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Award size={24} style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <div style={styles.statValor}>{estadisticas.totalBreaks}</div>
            <div style={styles.statLabel}>Total Breaks</div>
          </div>
        </div>

        <div style={styles.graficaCard}>
          <h4 style={styles.graficaTitle}>Balance de Jornada</h4>

          <div style={styles.barraContenedor}>
            <div
              style={{
                ...styles.barraProgreso,
                width: `${Math.min((balance.trabajado / balance.esperado) * 100, 100)}%`,
                background:
                  balance.diferencia >= 0
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #f59e0b, #ef4444)',
              }}
            />
          </div>

          <div style={styles.textoBalance}>
            <span>Trabajado: {formatearTiempo(balance.trabajado)}</span>
            <span>Esperado: {formatearTiempo(balance.esperado)}</span>
            {balance.diferencia >= 0 ? (
              <span style={{ color: '#10b981' }}>
                ✓ A favor: +{formatearTiempo(balance.diferencia)}
              </span>
            ) : (
              <span style={{ color: '#ef4444' }}>
                ⏳ Debe reponer: {formatearTiempo(Math.abs(balance.diferencia))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 🔹 Nueva Solicitud */}
      {/*<div style={styles.solicitudCard}>
        <div style={styles.solicitudHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={18} />
            <h3 style={styles.cardTitle}>Nueva solicitud</h3>
          </div>
          <button
            type="button"
            style={styles.toggleBtn}
            onClick={() => setMostrandoSolicitud((v) => !v)}
          >
            {mostrandoSolicitud ? 'Ocultar' : 'Crear solicitud'}
          </button>
        </div>

        {mostrandoSolicitud && (
          <form onSubmit={handleEnviarSolicitud} style={styles.solicitudForm}>
            <div style={styles.formRow}>
          
              <div style={styles.formField}>
                <label style={styles.formLabel}>Tipo de solicitud</label>
                <select
                  style={styles.formInput}
                  value={tipoSolicitud}
                  onChange={(e) => setTipoSolicitud(e.target.value)}
                  required
                >
                  
                  <option>Minutos adicionales</option>
                 
                </select>
              </div>

           
              <div style={styles.formField}>
                <label style={styles.formLabel}>Fecha de la solicitud</label>
                <input
                  type="date"
                  style={styles.formInput}
                  value={fechaSolicitud}
                  onChange={(e) => setFechaSolicitud(e.target.value)}
                  required
                />
              </div>

           
              <div style={styles.formField}>
                <label style={styles.formLabel}>Minutos</label>
                <input
                  type="number"
                  min={1}
                  style={styles.formInput}
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  required
                />
              </div>
            </div>

           
            <div style={styles.formField}>
              <label style={styles.formLabel}>Motivo</label>
              <textarea
                style={{ ...styles.formInput, minHeight: 80, resize: 'vertical' }}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Describe brevemente el motivo de la solicitud..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => setMostrandoSolicitud(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={styles.submitBtn}
                disabled={enviandoSolicitud}
              >
                {enviandoSolicitud ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>*/}


      {/* Lista de Registros */}
      <div style={styles.registrosCard}>
        <h3 style={styles.cardTitle}>
          Registro de Asistencia - {meses[filtroMes]} {filtroAnio}
        </h3>

        <div style={styles.registrosList}>
          {registros.map(registro => {
            const fecha = new Date(registro.fecha + 'T00:00:00');
            const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
            const diaNumero = fecha.getDate();
            
            return (
              <div key={registro.id} style={styles.registroItem}>
                <div style={styles.registroFecha}>
                  <div style={styles.diaNumero}>{diaNumero}</div>
                  <div style={styles.diaNombre}>{diaSemana}</div>
                </div>

                <div style={styles.registroDetalle}>
                  <div style={styles.horariosRow}>
                    <div style={styles.horarioCol}>
                      <span style={styles.horarioLabel}>Entrada</span>
                      <span style={styles.horarioValor}>{registro.horaEntrada}</span>
                    </div>
                    <div style={styles.horarioSeparador}>→</div>
                    <div style={styles.horarioCol}>
                      <span style={styles.horarioLabel}>Salida</span>
                      <span style={styles.horarioValor}>{registro.horaSalida}</span>
                    </div>
                  </div>

                  <div style={styles.detallesRow}>
                    <div style={styles.detalleItem}>
                      <Clock size={14} />
                      <span>{registro.horasTrabajadas}h trabajadas</span>
                    </div>
                    <div style={styles.detalleItem}>
                      <span style={styles.breaksCount}>{registro.breaks.length} breaks</span>
                    </div>
                    {registro.almuerzo && (
                      <div style={styles.detalleItem}>
                        <span style={styles.almuerzoTag}>
                          Almuerzo: {registro.almuerzo.inicio}-{registro.almuerzo.fin}
                        </span>
                      </div>
                    )}
                  </div>

                  {registro.breaks.length > 0 && (
                    <div style={styles.breaksDetalle}>
                      {registro.breaks.map((b, idx) => (
                        <span key={idx} style={styles.breakChip}>
                          {b.inicio}-{b.fin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.registroEstado}>
                  <span style={{
                    ...styles.estadoBadge,
                    ...(registro.estado === 'completado' ? styles.estadoCompletado :
                        registro.estado === 'hora_extra' ? styles.estadoExtra :
                        styles.estadoIncompleto)
                  }}>
                    {registro.estado === 'completado' ? '✓ Completado' :
                     registro.estado === 'hora_extra' ? '⬆ Hora Extra' :
                     '⚠ Incompleto'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: 24,
    maxWidth: 1200,
    margin: '0 auto',
    background: 'var(--bg)',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
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
  filtros: {
    display: 'flex',
    gap: 12,
  },
  select: {
    padding: '10px 16px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  estadisticasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20,
    marginBottom: 32,
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 24,
    background: 'var(--surface)',
    borderRadius: 12,
    boxShadow: '0 2px 8px var(--shadow)',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValor: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },

  // 🔹 tarjeta de nueva solicitud
  solicitudCard: {
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px var(--shadow)',
    marginBottom: 24,
  },
  solicitudHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  solicitudForm: {
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  formRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  formField: {
    flex: 1,
    minWidth: 180,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  formInput: {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: 14,
  },
  toggleBtn: {
    padding: '8px 14px',
    borderRadius: 999,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: 13,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 999,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 20px',
    borderRadius: 999,
    border: 'none',
    background: '#10b981',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },

  registrosCard: {
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 2px 8px var(--shadow)',
  },
  cardTitle: {
    margin: '0 0 24px 0',
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text)',
  },
  registrosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  registroItem: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr auto',
    gap: 20,
    padding: 20,
    background: 'var(--bg)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    alignItems: 'start',
  },
  registroFecha: {
    textAlign: 'center',
    padding: 12,
    background: 'var(--surface)',
    borderRadius: 8,
  },
  diaNumero: {
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--accent)',
    lineHeight: 1,
    marginBottom: 4,
  },
  diaNombre: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    textTransform: 'capitalize',
  },
  registroDetalle: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  horariosRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  horarioCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  horarioLabel: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  horarioValor: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text)',
  },
  horarioSeparador: {
    fontSize: 20,
    color: 'var(--text-secondary)',
  },
  detallesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  detalleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  breaksCount: {
    padding: '4px 8px',
    background: '#fef3c7',
    color: '#92400e',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  almuerzoTag: {
    padding: '4px 8px',
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  breaksDetalle: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  breakChip: {
    padding: '4px 10px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 12,
    color: 'var(--text)',
  },
  registroEstado: {
    display: 'flex',
    alignItems: 'center',
  },
  estadoBadge: {
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
  },
  estadoCompletado: {
    background: '#d1fae5',
    color: '#065f46',
  },
  estadoExtra: {
    background: '#ddd6fe',
    color: '#5b21b6',
  },
  estadoIncompleto: {
    background: '#fee2e2',
    color: '#991b1b',
  },

  // balance
  graficaCard: {
    gridColumn: '1 / -1',
    padding: 20,
    background: 'var(--surface)',
    borderRadius: 12,
    boxShadow: '0 2px 8px var(--shadow)',
  },
  graficaTitle: {
    margin: '0 0 12px 0',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
    textTransform: 'uppercase',
  },
  barraContenedor: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    background: 'var(--bg)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barraProgreso: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 0.4s ease',
  },
  textoBalance: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    fontSize: 12,
    color: 'var(--text-secondary)',
    flexWrap: 'wrap',
  },
};
