import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar, Clock, UserCheck, AlertCircle, CheckCircle, XCircle,
  Search, Download, Wifi, WifiOff, Edit2, Trash2, List, Activity,
  X, SlidersHorizontal,
} from 'lucide-react';

import { workforceApi } from '../lib/workforce';
import { useAuth } from '../lib/auth';
import { Toaster } from 'react-hot-toast';
import {
  notify, toastLite, notifySuccess, notifyError, notifyWarn, notifyInfo,
  notifyPromise, notifyAction, dismiss
} from '../lib/notify.jsx';

import { getErrorMessage } from '../lib/errorMessage.js';
import { toSlug } from '../utils/slug.js';
import styles from '../styles/horarios.js';
import { twoInitials } from '../utils/text';

function playAlertSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.warn('No se pudo reproducir alerta sonora:', e);
  }
}

export default function AsignarHorarios() {
  const { user } = useAuth({ requireAuth: true });

  const [activeTab, setActiveTab] = useState('control');
  const [asesoresConectados, setAsesoresConectados] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [horariosCreados, setHorariosCreados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroArea, setFiltroArea] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const wsRef = useRef(null);
  const [wsConectado, setWsConectado] = useState(false);
  const [error, setError] = useState(null);



  const [asesores, setAsesores] = useState([]);
  const [cargandoAsesores, setCargandoAsesores] = useState(false);
  const [errorAsesores, setErrorAsesores] = useState(null);

  // 🆕 Jornadas por asesor
  const [jornadasAsesores, setJornadasAsesores] = useState({});

  // 🆕 Estados disponibles por asesor (getAsesorEstados)
  const [estadosDisponibles, setEstadosDisponibles] = useState({});

  // 🆕 Horario actual por asesor (para puntualidad)
  const [horariosActuales, setHorariosActuales] = useState({});

  // Formulario de asignación
  const [asesorSeleccionado, setAsesorSeleccionado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('09:00');
  const [horaSalida, setHoraSalida] = useState('18:00');
  const [diasSemana, setDiasSemana] = useState({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: false,
    domingo: false
  });
  const [minutosAdicionales, setMinutosAdicionales] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [horarioEditando, setHorarioEditando] = useState(null);

  // Catálogo de estados global
  const [estadoTipos, setEstadoTipos] = useState([]);
  const [estadoConfigs, setEstadoConfigs] = useState([]);

  const [nuevoEstadoId, setNuevoEstadoId] = useState('');
  const [nuevoMinLim, setNuevoMinLim] = useState('');
  const [nuevoColor, setNuevoColor] = useState('');
  const [usarColorOverride, setUsarColorOverride] = useState(false);

  const [fallosEstados, setFallosEstados] = useState(new Set());

  function extractEstadoSlug(raw) {
    if (!raw) return 'desconectado';

    // string
    if (typeof raw === 'string') {
      return raw.toLowerCase();
    }

    // objeto { slug, codigo, nombre, ... }
    if (typeof raw === 'object') {
      const candidate =
        raw.slug ||
        raw.codigo ||
        raw.code ||
        raw.estado ||
        raw.nombre ||
        raw.name;

      if (candidate) return String(candidate).toLowerCase();
    }

    // número (id)
    if (typeof raw === 'number') {
      return String(raw);
    }

    return 'desconectado';
  }


  // ==================
  //  Helpers simples
  // ==================

  const normalizarAsesor = (raw) => ({
    id_asesor: raw.id_asesor ?? raw.ID_Asesor ?? raw.id ?? raw.userId,
    nombre: raw.nombre ?? raw.Nombre ?? raw.usuario ?? raw.name ?? '',
    cargo: raw.cargo ?? raw.Cargo ?? raw.cargo_id ?? '',
    area: raw.area ?? raw.Area ?? '',
  });

  // Estilos locales para chips/listado de estados y puntualidad
  const estiloEstadosList = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  };

  const estiloChip = {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 999,
    border: '1px solid var(--accent);',
    background: 'var(--accent);',
    color: '#4b5563',
    marginTop: 2,
  };

  const estiloChipActivo = {
    background: 'var(--accent)',
    color: 'var(--surface)',
    fontWeight: 600,
  };

  const estiloPuntualidad = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    marginTop: 4,
  };

  // ======================
  //  Carga de datos base
  // ======================

  useEffect(() => {
    if (!user?.id) return;
    cargarSolicitudes();
    cargarHorarios();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id_sede) {
      cargarAsesoresPorSede(user.id_sede);
    } else {
      setErrorAsesores('No hay id_sede en el usuario para cargar asesores.');
      setAsesores([]);
    }
  }, [user?.id_sede]);

  // Catálogo de estados global
  useEffect(() => {
    (async () => {
      try {
        const tipos = await workforceApi.getEstadoTipos();
        const lista = Array.isArray(tipos) ? tipos : (tipos?.results || []);
        setEstadoTipos(lista);
      } catch (e) {
        console.error('[Estados] No se pudo cargar catálogo:', e);
      }
    })();
  }, []);

  // índice del catálogo para lookup rápido
  const estadosCatalogoIndex = useMemo(() => {
    const idx = {};
    (estadoTipos || []).forEach(e => {
      const key = (e.slug || e.codigo || e.nombre || '').toString().toLowerCase();
      if (key) idx[key] = e;
    });
    return idx;
  }, [estadoTipos]);

  // ==========================
  //  WebSocket en tiempo real
  // ==========================

  useEffect(() => {
    if (!user?.id) return;

    const explicit = import.meta.env.VITE_WS_URL;
    const fallback = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/workforce/`;
    const WS_URL = explicit || fallback;

    let ws;
    let heartbeatInterval;
    let inactivityWarningTimeout;
    let reconnectTimeout;
    let reconnectAttempt = 0;
    let destroyed = false;

    const clearTimers = () => {
      clearInterval(heartbeatInterval);
      clearTimeout(inactivityWarningTimeout);
      clearTimeout(reconnectTimeout);
    };

    const scheduleReconnect = () => {
      if (destroyed) return;

      // backoff: 1s, 2s, 4s, 8s... máx 30s
      const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt));
      reconnectAttempt += 1;

      reconnectTimeout = setTimeout(() => {
        connectWS();
      }, delay);
    };

    const connectWS = () => {
      try {
        ws = new WebSocket(WS_URL);
      } catch (e) {
        console.error('[WS] Error al crear WebSocket:', e);
        scheduleReconnect();
        return;
      }

      wsRef.current = ws;

      ws.onopen = () => {
        if (destroyed) {
          try { ws.close(); } catch {}
          return;
        }

        setWsConectado(true);
        setError(null);
        reconnectAttempt = 0;
        // opcional: si te molesta la notificación en cada reconexión, coméntala
        // notifySuccess('Conectado correctamente');

        ws.send(JSON.stringify({
          type: 'identify_leader',
          userId: user?.id,
          nombre: user?.nombre,
          cargo: user?.cargo
        }));

        ws.send(JSON.stringify({ type: 'request_all_status' }));

        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        clearTimeout(inactivityWarningTimeout);
        inactivityWarningTimeout = setTimeout(() => {
          notifyWarn('Llevas un tiempo inactivo, la conexión puede cerrarse.', { duration: 8000 });
          playAlertSound();
        }, 4 * 60 * 1000);
      };

      ws.onmessage = (event) => {
        if (destroyed) return;

        const data = JSON.parse(event.data);
        // 👇 ayuda a ver qué llega realmente
        // console.log('[WS mensaje]', data);

        switch (data.type) {
          case 'pong':
            break;

          case 'estado_cambio': {
            // OJO: pon aquí TODOS los posibles campos que tu backend envía
            const estadoWS = extractEstadoSlug(
              data.estado || data.nuevo_estado || data.estado_slug || data.estado_actual || data.estado_actual_slug
            );


            actualizarEstadoAsesor({
              ...data,
              estado: estadoWS,
            });

            if (data.userId) {
              cargarJornadaAsesor(data.userId);
              cargarHorarioActualAsesor(data.userId);
              cargarEstadosAsesor(data.userId);
            }
            break;
          }

          case 'all_status':
            setAsesoresConectados((data.users || []).map(u => ({
              ...u,
              estado: extractEstadoSlug(
                u.estado || u.estado_actual || u.estado_slug || u.estado_obj
              ),
            })));
            break;

          case 'user_connected':
            agregarAsesorConectado(data);
            break;

          case 'user_disconnected':
            removerAsesorConectado(data.userId);
            break;

          default:
            break;
        }
      };

      ws.onclose = (evt) => {
        if (destroyed) return;

        setWsConectado(false);
        clearTimers();

        // si no fue cierre normal, lo marcamos como error
        if (evt.code !== 1000) {
          console.warn('[WS] Conexión cerrada, reintentando...', evt.code);
          // si quieres notificación, descomenta:
          // notifyError('❌ Conexión cerrada. Reintentando automáticamente.');
          // playAlertSound();
        }

        // siempre reintentamos mientras el componente exista
        scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        // onclose se encargará de reconectar
      };
    };

    // primera conexión
    connectWS();

    return () => {
      destroyed = true;
      setWsConectado(false);
      clearTimers();
      try { ws?.close(); } catch {}
      wsRef.current = null;
    };
  }, [user?.id]);


  // ==========================
  //  Carga por asesor
  // ==========================

  async function cargarAsesoresPorSede(id_sede) {
    try {
      setCargandoAsesores(true);
      setErrorAsesores(null);
      const resp = await workforceApi.getAsesoresPorSede({ id_sede: String(id_sede) });
      const lista = Array.isArray(resp) ? resp : (resp?.asesores || []);
      setAsesores(lista.map(normalizarAsesor));
    } catch (err) {
      console.error('[Asesores] Error (sede):', err);
      setErrorAsesores('No se pudieron cargar los asesores por sede');
      setAsesores([]);
    } finally {
      setCargandoAsesores(false);
    }
  }

  const actualizarEstadoAsesor = (data) => {
    setAsesoresConectados(prev => {
      const index = prev.findIndex(a => a.userId === data.userId);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          estado: data.estado,     // aquí ya será 'prueba', 'break', 'disponible', etc.
          lastUpdate: data.timestamp
        };
        return updated;
      } else {
        return [...prev, {
          userId: data.userId,
          nombre: data.nombre,
          cargo: data.cargo,
          area: data.area,
          estado: data.estado || 'desconectado',
          lastUpdate: data.timestamp
        }];
      }
    });
  };


  const agregarAsesorConectado = (data) => {
    setAsesoresConectados(prev => {
      if (!prev.find(a => a.userId === data.userId)) {
        return [...prev, {
          userId: data.userId,
          nombre: data.nombre,
          cargo: data.cargo,
          area: data.area,
          estado: data.estado || 'desconectado',
          lastUpdate: new Date().toISOString()
        }];
      }
      return prev;
    });
  };

  const removerAsesorConectado = (userId) => {
    setAsesoresConectados(prev => prev.filter(a => a.userId !== userId));
  };

  // Jornada del día
  const cargarJornadaAsesor = async (idAsesor, fecha = null) => {
    try {
      const params = fecha ? { date: fecha } : {};
      const jornada = await workforceApi.getAsesorJornada(idAsesor, params);
      setJornadasAsesores(prev => ({
        ...prev,
        [idAsesor]: jornada
      }));
    } catch (err) {
      console.error(`[Jornada] Error al cargar jornada del asesor ${idAsesor}:`, err);
    }
  };

  // Estados configurados para el asesor
  async function cargarEstadosAsesor(idAsesor) {
    try {
      const estados = await workforceApi.getAsesorEstados(idAsesor);
      setEstadosDisponibles(prev => ({ ...prev, [idAsesor]: estados || [] }));
    } catch (err) {
      setFallosEstados(prev => {
        if (!prev.has(idAsesor)) {
          console.error(`[Estados] ${idAsesor}:`, err.userMessage || err.message);
          const copy = new Set(prev);
          copy.add(idAsesor);
          return copy;
        }
        return prev;
      });
      setEstadosDisponibles(prev => ({ ...prev, [idAsesor]: [] }));
    }
  }

  // Horario actual del asesor
  const cargarHorarioActualAsesor = async (idAsesor) => {
    try {
      const horario = await workforceApi.getHorarioActualAsesor(idAsesor);
      setHorariosActuales(prev => ({
        ...prev,
        [idAsesor]: horario,
      }));
    } catch (err) {
      console.error(`[HorarioActual] Error al cargar horario del asesor ${idAsesor}:`, err);
    }
  };

  // Cargar estados + jornada + horario cuando cambia la lista de conectados
  useEffect(() => {
    if (asesoresConectados.length > 0 && activeTab === 'control') {
      asesoresConectados.forEach(asesor => {
        const idAsesor = asesor.userId || asesor.id_asesor;
        if (idAsesor) {
          cargarJornadaAsesor(idAsesor);
          cargarEstadosAsesor(idAsesor);
          cargarHorarioActualAsesor(idAsesor);
        }
      });
    }
  }, [asesoresConectados.length, activeTab]);

  // ==========================
  //  Catálogo de estados (UI)
  // ==========================

  const getEstadoInfo = (estado, idAsesor) => {
    const normalized = String(estado || '').toLowerCase().trim();

    // 1️⃣ Config del asesor (lo que viene de getAsesorEstados)
    const listaAsesor = estadosDisponibles[idAsesor] || [];
    const fromAsesor = listaAsesor.find(e => {
      const codigo = (e.codigo || e.slug || '').toString().toLowerCase().trim();
      return codigo === normalized ||
        (e.nombre && toSlug(e.nombre) === normalized);
    });

    if (fromAsesor) {
      return {
        color: fromAsesor.color_hex || '#6b7280',
        label: fromAsesor.nombre || estado || 'Sin estado',
      };
    }

    // 2️⃣ Catálogo global (workforceApi.getEstadoTipos)
    const fromCat =
      estadosCatalogoIndex[normalized] ||
      Object.values(estadosCatalogoIndex).find(e =>
        e.nombre && toSlug(e.nombre) === normalized
      );

    if (fromCat) {
      return {
        color: fromCat.color_hex || '#6b7280',
        label: fromCat.nombre || estado || 'Sin estado',
      };
    }

    // 3️⃣ Fallback genérico:
    //    - si no hay estado → lo tomamos como "desconectado"
    //    - si hay un valor (ej: "prueba") → lo mostramos tal cual, capitalizado
    if (!normalized) {
      return { color: '#6b7280', label: 'Desconectado' };
    }

    const niceLabel = estado
      ? String(estado).charAt(0).toUpperCase() + String(estado).slice(1)
      : 'Sin estado';

    return { color: '#6b7280', label: niceLabel };
  };


  const getEstadoColor = (estado, idAsesor) => getEstadoInfo(estado, idAsesor).color;
  const getEstadoTexto = (estado, idAsesor) => getEstadoInfo(estado, idAsesor).label;



    // Opciones para el select de filtro de estado (catálogo + fallback)
  const estadosFiltroOptions = useMemo(() => {
    const opciones = [];
    const seen = new Set();

    // 1️⃣ Usamos el catálogo de estados si existe
    if (estadoTipos && estadoTipos.length > 0) {
      estadoTipos.forEach((e) => {
        const codigo = (e.slug || e.codigo || e.nombre || '')
          .toString()
          .toLowerCase();

        if (!codigo || seen.has(codigo)) return;
        seen.add(codigo);

        opciones.push({
          value: codigo,
          label: e.nombre || codigo,
        });
      });
      return opciones;
    }

    // 2️⃣ Si el catálogo está vacío, usamos los estados vistos en los asesores conectados
    asesoresConectados.forEach((a) => {
      const codigo = (a.estado || '').toString().toLowerCase();
      if (!codigo || seen.has(codigo)) return;
      seen.add(codigo);

      const info = getEstadoInfo(codigo); // para obtener label bonito
      opciones.push({
        value: codigo,
        label: info.label,
      });
    });

    return opciones;
  }, [estadoTipos, asesoresConectados]);


  // ==========================
  //  Puntualidad (tarde/temprano)
  // ==========================

  const renderJornada = (idAsesor) => {
    const jornada = jornadasAsesores[idAsesor];
    if (!jornada) return null;

    return (
      <div style={styles.jornadaInfo}>
       
        {jornada.breaks != null && (
          <div style={styles.jornadaItem}>
            <Activity size={12} />
            <span>{jornada.breaks} breaks</span>
          </div>
        )}
      </div>
    );
  };

  const renderPuntualidad = (idAsesor) => {
    const jornada = jornadasAsesores[idAsesor];
    const horario = horariosActuales[idAsesor];

    if (!jornada || !horario) return null;

    // ⚠️ Ajusta estos nombres según lo que devuelva tu backend
    const entradaRealStr =
      jornada.hora_entrada_real ||
      jornada.hora_entrada ||
      jornada.entrada;

    const entradaProgStr = horario.hora_entrada;
    const fechaBase =
      jornada.fecha ||
      horario.fecha ||
      horario.fecha_inicio ||
      new Date().toISOString().split('T')[0];

    if (!entradaRealStr || !entradaProgStr) return null;

    const entradaReal = new Date(entradaRealStr);
    const entradaProg = new Date(`${fechaBase}T${entradaProgStr}`);

    const diffMs = entradaReal.getTime() - entradaProg.getTime();
    const diffMin = Math.round(diffMs / 60000);

    let label = 'A tiempo';
    let color = '#10b981';

    // Tolerancia de 2 minutos
    if (diffMin > 2) {
      label = `Tarde (${diffMin} min)`;
      color = '#ef4444';
    } else if (diffMin < -2) {
      label = `Temprano (${Math.abs(diffMin)} min)`;
      color = '#3b82f6';
    }

    return (
      <div
        style={{
          ...estiloPuntualidad,
          background: `${color}15`,
          color,
        }}
        title={`Entrada prog: ${entradaProgStr} • Real: ${entradaReal.toLocaleTimeString('es-CO')}`}
      >
        <Clock size={12} />
        <span style={{ marginLeft: 4 }}>{label}</span>
      </div>
    );
  };

  // ================
  //  Horarios / CRUD
  // ================

  const cargarHorarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workforceApi.getHorarios({ lider_id: user.id });
      const lista = Array.isArray(data) ? data : (data?.results || []);
      setHorariosCreados(lista);
    } catch (err) {
      console.error('[Horarios] Error:', err);
      setError('No se pudieron cargar los horarios');
      setHorariosCreados([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarSolicitudes = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await workforceApi.getSolicitudes({ estado: 'pendiente' });
      const lista = Array.isArray(resp) ? resp : (resp?.results || resp?.solicitudes || []);
      setSolicitudes(lista);
    } catch (err) {
      console.error('[Solicitudes] Error:', err);
      setError(err.message || 'No se pudieron cargar las solicitudes');
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarHorario = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const asesorObj = asesores.find(a => String(a.id_asesor) === String(asesorSeleccionado));
      if (!asesorObj) throw new Error('Debes seleccionar un asesor válido');

      const horarioData = {
        lider_id: user.id,
        asesor_id: asesorObj.id_asesor,
        asesor_nombre: asesorObj.nombre,
        asesor_cargo: asesorObj.cargo || '',
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
        hora_entrada: horaEntrada,
        hora_salida: horaSalida,
        dias_semana: Object.entries(diasSemana)
          .filter(([_, activo]) => activo)
          .map(([dia]) => dia),
        minutos_adicionales: minutosAdicionales || 0,
        motivo: motivo || null,
      };

      if (horarioEditando) {
        await workforceApi.actualizarHorario(horarioEditando.id, horarioData);
        notify('Horario actualizado correctamente', 'success');
      } else {
        await workforceApi.crearHorario(horarioData);
        notify('Horario asignado correctamente', 'success');
      }

      limpiarFormulario();
      await cargarHorarios();
    } catch (err) {
      console.error('[Horario] Error:', err);
      setError(err.message || 'Error al asignar horario');
      notify('Error al asignar horario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditarHorario = (horario) => {
    setHorarioEditando(horario);
    setAsesorSeleccionado(horario.asesor_id);
    setFechaInicio(horario.fecha_inicio);
    setFechaFin(horario.fecha_fin || '');
    setHoraEntrada(horario.hora_entrada);
    setHoraSalida(horario.hora_salida);
    setMinutosAdicionales(horario.minutos_adicionales || 0);
    setMotivo(horario.motivo || '');

    const nuevoDiasSemana = {
      lunes: false, martes: false, miercoles: false, jueves: false,
      viernes: false, sabado: false, domingo: false
    };

    if (horario.dias_semana && Array.isArray(horario.dias_semana)) {
      horario.dias_semana.forEach(dia => {
        if (nuevoDiasSemana.hasOwnProperty(dia)) {
          nuevoDiasSemana[dia] = true;
        }
      });
    }

    setDiasSemana(nuevoDiasSemana);
    setActiveTab('asignar');
  };

  const handleEliminarHorario = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este horario?')) return;

    try {
      setLoading(true);
      setError(null);
      await workforceApi.eliminarHorario(id);
      notify('Horario eliminado', 'success');
      await cargarHorarios();
    } catch (err) {
      console.error('[Eliminar] Error:', err);
      setError(err.message || 'Error al eliminar horario');
      notify('Error al eliminar horario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setHorarioEditando(null);
    setAsesorSeleccionado('');
    setFechaInicio('');
    setFechaFin('');
    setHoraEntrada('09:00');
    setHoraSalida('18:00');
    setMinutosAdicionales(0);
    setMotivo('');
    setDiasSemana({
      lunes: true, martes: true, miercoles: true, jueves: true,
      viernes: true, sabado: false, domingo: false
    });
  };

  // ======================
  //  Solicitudes
  // ======================

  const handleAprobarSolicitud = async (id) => {
    if (!confirm('¿Aprobar esta solicitud?')) return;

    try {
      setLoading(true);
      setError(null);
      await workforceApi.aprobarSolicitud(id, {
        aprobado_por: user.id,
        fecha_aprobacion: new Date().toISOString()
      });
      notify('Solicitud aprobada', 'success');
      await cargarSolicitudes();
    } catch (err) {
      console.error('[Aprobar] Error:', err);
      setError(err.message || 'Error al aprobar solicitud');
      notify('Error al aprobar solicitud', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRechazarSolicitud = async (id) => {
    const razon = prompt('Motivo del rechazo:');
    if (!razon) return;

    try {
      setLoading(true);
      setError(null);
      await workforceApi.rechazarSolicitud(id, {
        rechazado_por: user.id,
        motivo_rechazo: razon,
        fecha_rechazo: new Date().toISOString()
      });
      notify('Solicitud rechazada', 'success');
      await cargarSolicitudes();
    } catch (err) {
      console.error('[Rechazar] Error:', err);
      setError(err.message || 'Error al rechazar solicitud');
      notify('Error al rechazar solicitud', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ======================
  //  Exportación
  // ======================

  const handleExportar = async () => {
    try {
      setLoading(true);
      setError(null);
      const blob = await workforceApi.exportarAsesores({
        area: filtroArea !== 'todas' ? filtroArea : undefined,
        estado: filtroEstado !== 'todos' ? filtroEstado : undefined
      });
      workforceApi.downloadFile(blob, `asesores_${new Date().toISOString().split('T')[0]}.xlsx`);
      notify('Archivo exportado correctamente', 'success');
    } catch (err) {
      console.error('[Exportar] Error:', err);
      setError(err.message || 'Error al exportar');
      notify('Error al exportar asesores', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ======================
  //  Filtros y helpers UI
  // ======================

  // ======================
  //  Filtros y helpers UI
  // ======================

  const handleToggleDia = (dia) => {
    setDiasSemana(prev => ({ ...prev, [dia]: !prev[dia] }));
  };

  const asesoresFiltrados = asesoresConectados.filter(a => {
    const matchArea = filtroArea === 'todas' || a.area === filtroArea;
    const matchBusqueda = a.nombre?.toLowerCase().includes(busqueda.toLowerCase());

    const estadoNormalizado = (a.estado || '').toString().toLowerCase();
    const matchEstado =
      filtroEstado === 'todos' || estadoNormalizado === filtroEstado;

    return matchArea && matchBusqueda && matchEstado;
  });


  // resumen de asesores por estado actual
  const resumenEstados = useMemo(() => {
    const acc = {};
    asesoresConectados.forEach((a) => {
      const key = (a.estado || 'desconectado').toString().toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, [asesoresConectados]);


  const formatearDias = (dias) => {
    if (!dias || !Array.isArray(dias)) return '-';
    const diasAbrev = {
      lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J',
      viernes: 'V', sabado: 'S', domingo: 'D'
    };
    return dias.map(d => diasAbrev[d] || d.charAt(0).toUpperCase()).join(', ');
  };

  const fmtFecha = (iso) => {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('es-CO'); } catch { return iso; }
  };

  const badgeStylesByEstado = (estado) => {
    const s = String(estado || '').toLowerCase();
    if (s === 'aprobado') return { bg: '#10b98120', color: '#10b981', label: 'Aprobado' };
    if (s === 'rechazado') return { bg: '#ef444420', color: '#ef4444', label: 'Rechazado' };
    return { bg: '#f59e0b20', color: '#f59e0b', label: 'Pendiente' };
  };

  const solicitudesPendientes = (solicitudes || []).filter(
    (s) => String(s.estado || '').toLowerCase() === 'pendiente'
  );

  // ======================
  //  Módulo Estados (admin)
  // ======================

  const [estadosCat, setEstadosCat] = useState([]);
  const [estadoEditando, setEstadoEditando] = useState(null);
  const [formEstado, setFormEstado] = useState({
    nombre: '',
    slug: '',
    color_hex: '#10b981',
    limite_minutos_default: 60,
  });

  const [cfgAsesor, setCfgAsesor] = useState({
    asesor: '',
    estado_id: '',
    activo: true,
    limite_minutos: '',
    color_hex_override: '',
  });
  const [configsAsesor, setConfigsAsesor] = useState([]);

  const [rangoLimite, setRangoLimite] = useState({ min: '', max: '' });
  const [ordenamiento, setOrdenamiento] = useState({ campo: 'id', direccion: 'asc' });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    if (activeTab === 'estados') cargarEstados();
  }, [activeTab]);

  useEffect(() => {
    if (!cfgAsesor.asesor) {
      setConfigsAsesor([]);
      return;
    }
    cargarConfigsAsesor(cfgAsesor.asesor);
    cargarHorariosDeAsesor(cfgAsesor.asesor);
  }, [cfgAsesor.asesor]);

  useEffect(() => {
    if (activeTab === 'estados' && cfgAsesor.asesor) {
      cargarConfigsAsesor(cfgAsesor.asesor);
    }
  }, [activeTab, cfgAsesor.asesor]);

  async function cargarEstados() {
    try {
      const list = await workforceApi.getEstados();
      setEstadosCat(Array.isArray(list) ? list : (list?.results || []));
    } catch (e) {
      console.error('[Estados] error al cargar', e);
    }
  }

  async function cargarConfigsAsesor(idAsesor) {
    try {
      const list = await workforceApi.getEstadoConfigs({ asesor: idAsesor });
      setConfigsAsesor(Array.isArray(list) ? list : (list?.results || []));
    } catch (e) {
      console.error('[EstadoConfig] error al cargar', e);
      setConfigsAsesor([]);
    }
  }

  async function cargarHorariosDeAsesor(idAsesor) {
    try {
      const data = await workforceApi.getHorariosPorAsesor(idAsesor);
      const lista = Array.isArray(data) ? data : (data?.results || []);
      setHorariosCreados(lista);
    } catch (e) {
      console.error('[Horarios] por asesor:', e);
    }
  }

  const toValidHex = (val) => {
    const raw = (val || '').trim();
    if (!raw) return null;
    const withHash = raw.startsWith('#') ? raw : `#${raw}`;
    const upper = withHash.toUpperCase();
    return /^#[0-9A-F]{6}$/.test(upper) ? upper : 'INVALID';
  };

  const estadosFiltrados = useMemo(() => {
    let resultado = [...estadosCat];

    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(e =>
        e.nombre.toLowerCase().includes(busquedaLower) ||
        (e.slug || '').toLowerCase().includes(busquedaLower) ||
        e.id.toString().includes(busquedaLower) ||
        (e.color_hex || '').toLowerCase().includes(busquedaLower)
      );
    }

    if (rangoLimite.min !== '') {
      resultado = resultado.filter(e =>
        (e.limite_minutos_default ?? 0) >= parseInt(rangoLimite.min)
      );
    }
    if (rangoLimite.max !== '') {
      resultado = resultado.filter(e =>
        (e.limite_minutos_default ?? 0) <= parseInt(rangoLimite.max)
      );
    }

    resultado.sort((a, b) => {
      let valorA = a[ordenamiento.campo];
      let valorB = b[ordenamiento.campo];

      if (valorA === null || valorA === undefined) valorA = '';
      if (valorB === null || valorB === undefined) valorB = '';

      if (typeof valorA === 'string') {
        valorA = valorA.toLowerCase();
        valorB = valorB.toLowerCase();
      }

      if (valorA < valorB) return ordenamiento.direccion === 'asc' ? -1 : 1;
      if (valorA > valorB) return ordenamiento.direccion === 'asc' ? 1 : -1;
      return 0;
    });

    return resultado;
  }, [estadosCat, busqueda, rangoLimite, ordenamiento]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setRangoLimite({ min: '', max: '' });
    setOrdenamiento({ campo: 'id', direccion: 'asc' });
  };

  const cambiarOrdenamiento = (campo) => {
    setOrdenamiento(prev => ({
      campo,
      direccion: prev.campo === campo && prev.direccion === 'asc' ? 'desc' : 'asc'
    }));
  };

    



  return (
    <div style={styles.container}>
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Panel de Control - Líder</h2>
          <p style={styles.subtitle}>
            {user?.cargo || 'Líder'} - {user?.nombre || 'Usuario'}
          </p>
        </div>
        <div style={styles.wsStatus}>
          {wsConectado ? (
            <>
              <Wifi size={16} style={{ color: '#10b981' }} />
              <span>Conectado en tiempo real</span>
            </>
          ) : (
            <>
              <WifiOff size={16} style={{ color: '#ef4444' }} />
              <span>Reconectando...</span>
            </>
          )}
        </div>


      </div>

      <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'control' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('control')}
          >
            <UserCheck size={18} />
            Control en Tiempo Real ({asesoresConectados.length})
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'asignar' ? styles.tabActive : {}) }}
            onClick={() => { setActiveTab('asignar'); limpiarFormulario(); }}
          >
            <Calendar size={18} />
            {horarioEditando ? 'Editar Horario' : 'Asignar Horarios'}
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'horarios' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('horarios')}
          >
            <List size={18} />
            Mis Horarios ({horariosCreados.length})
          </button>
          {/*<button
            style={{ ...styles.tab, ...(activeTab === 'solicitudes' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('solicitudes')}
          >
            <AlertCircle size={18} />
            Solicitudes ({solicitudesPendientes.length})
          </button>*/}
          <button
            style={{ ...styles.tab, ...(activeTab === 'estados' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('estados')}
          >
            <List size={18} />
            Estados
          </button>
        </div>

      {activeTab === 'control' && (
        <div style={styles.content}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Asesores Conectados - Tiempo Real</h3>
              <div style={styles.filters}>
                {/*<select
                  style={styles.filterSelect}
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  {estadosFiltroOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  style={styles.filterSelect}
                  value={filtroArea}
                  onChange={(e) => setFiltroArea(e.target.value)}
                >
                  <option value="todas">Todas las áreas</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Redes">Redes</option>
                  <option value="Créditos">Créditos</option>
                </select>*/}
                <div style={styles.searchBox}>
                  <Search size={16} style={styles.searchIcon} />
                  <input
                    type="text"
                    style={styles.searchInput}
                    placeholder="Buscar..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={styles.estadisticasGrid}>
              {/* Total conectados (siempre) */}
              <div style={styles.estadisticaCard}>
                <div style={styles.estadisticaValor}>{asesoresConectados.length}</div>
                <div style={styles.estadisticaLabel}>Conectados</div>
              </div>

              {/* Una tarjeta por cada estado del catálogo */}
              {(estadoTipos || []).map((estado) => {
                const codigo = (estado.slug || estado.codigo || estado.nombre || '')
                  .toString()
                  .toLowerCase();

                if (!codigo) return null;

                const cantidad = resumenEstados[codigo] || 0;
                // si no quieres mostrar estados en 0, descomenta:
                // if (cantidad === 0) return null;

                const info = getEstadoInfo(codigo); // tu helper existente

                return (
                  <div key={codigo} style={styles.estadisticaCard}>
                    <div style={styles.estadisticaValor}>{cantidad}</div>
                    <div style={styles.estadisticaLabel}>{info.label}</div>
                  </div>
                );
              })}

              {/* fallback si el catálogo viene vacío */}
              {estadoTipos?.length === 0 &&
                Object.entries(resumenEstados).map(([codigo, cantidad]) => {
                  if (codigo === 'desconectado') return null;
                  const info = getEstadoInfo(codigo);
                  return (
                    <div key={codigo} style={styles.estadisticaCard}>
                      <div style={styles.estadisticaValor}>{cantidad}</div>
                      <div style={styles.estadisticaLabel}>{info.label}</div>
                    </div>
                  );
                })}
            </div>


            {asesoresFiltrados.length === 0 ? (
              <div style={styles.emptyState}>
                <WifiOff size={48} style={{ color: '#6b7280' }} />
                <p>No hay asesores conectados</p>
              </div>
            ) : (
              <div style={styles.asesorGrid}>
                {asesoresFiltrados.map(asesor => {
                  const idAsesor = asesor.userId || asesor.id_asesor;
                  const { color: estadoColor, label: estadoLabel } = getEstadoInfo(asesor.estado, idAsesor);

                  return (
                    <div key={idAsesor} style={styles.asesorCard}>
                      <div style={styles.asesorHeader}>
                        <div style={styles.asesorAvatar}>
                          {twoInitials(asesor.nombre)}
                        </div>
                        <span
                          style={{ ...styles.estadoDot, background: estadoColor }}
                        />
                      </div>

                      <div style={styles.asesorInfo}>
                        <h4 style={styles.asesorNombre}>{asesor.nombre}</h4>
                        <p style={styles.asesorCargo}>{asesor.cargo}</p>
                        <p style={styles.asesorArea}>{asesor.area}</p>
                      </div>

                      <div style={styles.asesorEstado}>
                        <span style={{
                          ...styles.estadoBadge,
                          background: `${estadoColor}20`,
                          color: estadoColor
                        }}>
                          {estadoLabel}
                        </span>
                      </div>

                      {renderJornada(idAsesor)}

                      {/* Puntualidad: temprano / tarde / a tiempo */}
                      {renderPuntualidad(idAsesor)}

                      {/* Todos los estados configurados para este asesor */}
                      {Array.isArray(estadosDisponibles[idAsesor]) && estadosDisponibles[idAsesor].length > 0 && (
                        <div style={estiloEstadosList}>
                          {estadosDisponibles[idAsesor].map(est => {
                            const isActive = String(asesor.estado || '').toLowerCase() === String(est.codigo || '').toLowerCase();
                            return (
                              <span
                                key={est.id || est.codigo}
                                style={{
                                  ...estiloChip,
                                  ...(isActive ? estiloChipActivo : {}),
                                  borderColor: est.color_hex || '#e5e7eb',
                                }}
                                title={isActive ? 'Estado actual' : 'Estado disponible'}
                              >
                                {est.nombre}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div style={styles.asesorFooter}>
                        <Clock size={12} />
                        <span style={styles.lastUpdate}>
                          {new Date(asesor.lastUpdate).toLocaleTimeString('es-ES')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'asignar' && (
        <div style={styles.content}>
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={styles.cardTitle}>
                  {horarioEditando ? 'Editar Horario' : 'Nueva Asignación de Horario'}
                </h3>
                {horarioEditando && (
                  <button 
                    type="button"
                    style={styles.cancelBtn}
                    onClick={limpiarFormulario}
                  >
                    Cancelar Edición
                  </button>
                )}
              </div>
              <form onSubmit={handleAsignarHorario}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Seleccionar Asesor *</label>
                  <select
                    style={styles.select}
                    value={asesorSeleccionado}
                    onChange={(e) => setAsesorSeleccionado(e.target.value)}
                    required
                    disabled={cargandoAsesores}
                  >
                    <option value="">
                      {cargandoAsesores ? 'Cargando asesores...' : '-- Selecciona un asesor --'}
                    </option>
                    {asesores.map((a) => (
                      <option key={a.id_asesor} value={a.id_asesor}>
                        {a.nombre} {a.cargo ? ` - ${a.cargo}` : ''} {a.area ? ` (${a.area})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Fecha Inicio *</label>
                    <input 
                      type="date"
                      style={styles.input}
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Fecha Fin</label>
                    <input 
                      type="date"
                      style={styles.input}
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Hora Entrada *</label>
                    <input 
                      type="time"
                      style={styles.input}
                      value={horaEntrada}
                      onChange={(e) => setHoraEntrada(e.target.value)}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Hora Salida *</label>
                    <input 
                      type="time"
                      style={styles.input}
                      value={horaSalida}
                      onChange={(e) => setHoraSalida(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Días de la Semana</label>
                  <div style={styles.diasGrid}>
                    {Object.entries(diasSemana).map(([dia, activo]) => (
                      <button
                        key={dia}
                        type="button"
                        style={{
                          ...styles.diaBtn,
                          ...(activo ? styles.diaBtnActive : {})
                        }}
                        onClick={() => handleToggleDia(dia)}
                      >
                        {dia.charAt(0).toUpperCase() + dia.slice(1, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Minutos Adicionales</label>
                  <input 
                    type="number"
                    style={styles.input}
                    value={minutosAdicionales}
                    onChange={(e) => setMinutosAdicionales(parseInt(e.target.value) || 0)}
                    min="0"
                    max="480"
                    step="15"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Motivo / Observaciones</label>
                  <textarea 
                    style={styles.textarea}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows="3"
                  />
                </div>

                <button 
                  type="submit" 
                  style={{
                    ...styles.submitBtn,
                    ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                  }}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (horarioEditando ? 'Actualizar Horario' : 'Asignar Horario')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'horarios' && (
        <div style={styles.content}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Horarios Creados por Mí</h3>
            
            {loading && (
              <div style={styles.loadingState}>
                <p>Cargando horarios...</p>
              </div>
            )}
            
            {!loading && horariosCreados.length === 0 && (
              <div style={styles.emptyState}>
                <Calendar size={48} style={{ color: '#6b7280' }} />
                <p>No has creado ningún horario aún</p>
                <button 
                  style={{ ...styles.submitBtn, width: 'auto', marginTop: 16 }}
                  onClick={() => setActiveTab('asignar')}
                >
                  Crear Primer Horario
                </button>
              </div>
            )}
            
            {!loading && horariosCreados.length > 0 && (
              <div style={styles.horariosTable}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Asesor</th>
                      <th style={styles.th}>Período</th>
                      <th style={styles.th}>Horario</th>
                      <th style={styles.th}>Días</th>
                      <th style={styles.th}>Minutos Extra</th>
                      <th style={styles.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {horariosCreados.map(horario => (
                      <tr key={horario.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.asesorCelda}>
                            <div style={styles.asesorAvatarSmall}>
                              {horario.asesor_nombre?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'}
                            </div>
                            <div>
                              <div style={styles.asesorNombreTabla}>{horario.asesor_nombre || 'Sin nombre'}</div>
                              <div style={styles.asesorCargoTabla}>{horario.asesor_cargo || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div>{horario.fecha_inicio}</div>
                          {horario.fecha_fin && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              hasta {horario.fecha_fin}
                            </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.horarioBadge}>
                            <Clock size={14} />
                            {horario.hora_entrada} - {horario.hora_salida}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.diasBadge}>
                            {formatearDias(horario.dias_semana)}
                          </div>
                        </td>
                        <td style={styles.td}>
                          {horario.minutos_adicionales > 0 ? (
                            <span style={styles.minutosExtra}>+{horario.minutos_adicionales} min</span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>-</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.acciones}>
                            <button 
                              style={styles.btnEdit}
                              onClick={() => handleEditarHorario(horario)}
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              style={styles.btnDelete}
                              onClick={() => handleEliminarHorario(horario.id)}
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/*{activeTab === 'solicitudes' && (
        <div style={styles.content}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Solicitudes</h3>

            {loading && (
              <div style={styles.loadingState}>
                <p>Cargando solicitudes...</p>
              </div>
            )}

            {!loading && error && (
              <div style={{ ...styles.errorBanner, marginBottom: 12 }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {!loading && (!solicitudes || solicitudes.length === 0) && (
              <div style={styles.emptyState}>
                <CheckCircle size={48} style={{ color: '#10b981' }} />
                <p>No hay solicitudes</p>
              </div>
            )}

            {!loading && solicitudes && solicitudes.length > 0 && (
              <div style={styles.solicitudesList}>
                {solicitudes.map((sol) => {
                  const badge = badgeStylesByEstado(sol.estado);
                  const esPendiente = String(sol.estado || '').toLowerCase() === 'pendiente';
                  return (
                    <div key={sol.id} style={styles.solicitudCard}>
                      <div style={styles.solicitudHeader}>
                        <div>
                          <h4 style={styles.solicitudTitulo}>{sol.tipo}</h4>
                          <p style={styles.solicitudAsesor}>
                            {sol.asesor}
                            {sol.id_asesor ? ` • ID Asesor: ${sol.id_asesor}` : ''}
                            {sol.id_sede ? ` • Sede: ${sol.id_sede}` : ''}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            Fecha solicitud: {fmtFecha(sol.fechaSolicitud)}
                          </p>
                        </div>
                        <span
                          style={{
                            ...styles.badge,
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <div style={styles.solicitudBody}>
                        {sol.nuevoHorario && (
                          <p style={{ margin: '4px 0' }}>
                            <strong>Nuevo horario:</strong> {sol.nuevoHorario}
                          </p>
                        )}
                        {sol.minutos != null && (
                          <p style={{ margin: '4px 0' }}>
                            <strong>Minutos:</strong> {sol.minutos}
                          </p>
                        )}
                        <p style={styles.motivoTexto}>{sol.motivo || '-'}</p>

                        {sol.estado?.toLowerCase() === 'rechazado' && sol.razonRechazo && (
                          <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>
                            <strong>Motivo de rechazo:</strong> {sol.razonRechazo}
                          </p>
                        )}
                      </div>

                      <div style={styles.solicitudActions}>
                        <button
                          style={styles.approveBtn}
                          onClick={() => handleAprobarSolicitud(sol.id)}
                          disabled={loading || !esPendiente}
                          title={esPendiente ? 'Aprobar' : 'Solo disponible para pendientes'}
                        >
                          <CheckCircle size={16} />
                          Aprobar
                        </button>
                        <button
                          style={styles.rejectBtn}
                          onClick={() => handleRechazarSolicitud(sol.id)}
                          disabled={loading || !esPendiente}
                          title={esPendiente ? 'Rechazar' : 'Solo disponible para pendientes'}
                        >
                          <XCircle size={16} />
                          Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}*/}

      {activeTab === 'estados' && (
        <div style={styles.content}>
          <div style={styles.card}>
            {/*  HEADER DE SECCIÓN */}
            <h3 style={styles.sectionTitle}>
              Gestión de Estados
            </h3>

            {/* FORMULARIO DE CREAR/EDITAR */}
            <div style={styles.estadosFormContainer}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Nombre <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    style={styles.input}
                    value={formEstado.nombre}
                    onChange={e => setFormEstado(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Reunión, Break, Almuerzo..."
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Color identificador</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      type="color"
                      style={styles.colorInput}
                      value={formEstado.color_hex || '#10b981'}
                      onChange={e => setFormEstado(f => ({ ...f, color_hex: e.target.value }))}
                    />
                    <span style={{ 
                      fontFamily: 'monospace', 
                      fontSize: 13, 
                      color: 'var(--text-secondary)',
                      background: 'var(--bg)',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)'
                    }}>
                      {formEstado.color_hex || '#10b981'}
                    </span>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Límite de tiempo (minutos)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={formEstado.limite_minutos_default}
                    onChange={e => setFormEstado(f => ({ 
                      ...f, 
                      limite_minutos_default: parseInt(e.target.value || '0', 10) 
                    }))}
                    min="0"
                    step="5"
                    placeholder="60"
                  />
                  <small style={{ 
                    fontSize: 12, 
                    color: 'var(--text-secondary)',
                    marginTop: 4 
                  }}>
                    Tiempo máximo permitido para este estado
                  </small>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div style={styles.buttonGroup}>
                {estadoEditando ? (
                  <>
                    <button
                      style={styles.submitBtn}
                      onClick={async () => {
                        const payload = {
                          ...formEstado,
                          slug: estadoEditando?.slug || toSlug(formEstado.nombre),
                          limite_minutos_default: Number(formEstado.limite_minutos_default ?? 0),
                        };

                        try {
                          await notifyPromise(
                            workforceApi.actualizarEstado(estadoEditando.id, payload),
                            { 
                              loading: 'Guardando cambios...', 
                              success: 'Cambios guardados correctamente', 
                              error: 'No se pudo actualizar' 
                            }
                          );

                          setEstadoEditando(null);
                          setFormEstado({ nombre: '', color_hex: '#10b981', limite_minutos_default: 60 });
                          await cargarEstados();
                        } catch (e) {
                          notify(getErrorMessage(e, 'Error al actualizar'), 'error', { duration: 6000 });
                          console.error(e);
                        }
                      }}
                    >
                      Guardar cambios
                    </button>
                    <button
                      style={styles.cancelBtn}
                      onClick={() => {
                        setEstadoEditando(null);
                        setFormEstado({ nombre: '', color_hex: '#10b981', limite_minutos_default: 60 });
                      }}
                    >
                      ✖️ Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    style={styles.submitBtn}
                    onClick={async () => {
                      try {
                        const payload = {
                          ...formEstado,
                          slug: toSlug(formEstado.nombre),
                          limite_minutos_default: Number(formEstado.limite_minutos_default ?? 0),
                        };

                        await notifyPromise(
                          workforceApi.crearEstado(payload),
                          { 
                            loading: 'Creando estado...', 
                            success: 'Estado creado exitosamente', 
                            error: 'No se pudo crear el estado' 
                          }
                        );

                        setFormEstado({ nombre: '', color_hex: '#10b981', limite_minutos_default: 60 });
                        await cargarEstados();
                      } catch (e) {
                        notify(getErrorMessage?.(e, 'Error al crear') || 'Error al crear', 'error', { duration: 6000 });
                        console.error(e);
                      }
                    }}
                  >
                    Crear nuevo estado
                  </button>
                )}
              </div>
            </div>

            {/* TABLA DE ESTADOS */}
            <div style={styles.container}>
              <h4 style={styles.header}>Estados registrados</h4>

              {/* FILTROS */}
              <div style={styles.filtrosContainer}>
                 <div
                    style={{
                      ...styles.filtrosHeader,
                      ...(mostrarFiltros ? { marginBottom: 16 } : {}), // 👈 margen condicional
                    }}
                  >
                  <button
                    style={styles.btnToggleFiltros}
                    onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  >
                    <SlidersHorizontal size={16} />
                    {mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
                  </button>
                  
                  {(busqueda || rangoLimite.min || rangoLimite.max) && (
                    <button style={styles.btnLimpiar} onClick={limpiarFiltros}>
                      Limpiar filtros
                    </button>
                  )}
                </div>

                {/* Búsqueda siempre visible */}
                <div
                  style={{
                    ...styles.searchContainer,
                    ...(mostrarFiltros ? { marginBottom: 16 } : {}), // 👈 margen condicional
                  }}
                >
                  <Search size={18} style={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, ID, slug o color..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    style={styles.searchInput}
                  />
                  {busqueda && (
                    <button style={styles.clearBtn} onClick={() => setBusqueda('')}>
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Filtros avanzados */}
                {mostrarFiltros && (
                  <div style={styles.filtrosGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Límite mínimo (min)</label>
                      <input
                        type="number"
                        placeholder="Ej: 30"
                        value={rangoLimite.min}
                        onChange={(e) => setRangoLimite(prev => ({ ...prev, min: e.target.value }))}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Límite máximo (min)</label>
                      <input
                        type="number"
                        placeholder="Ej: 120"
                        value={rangoLimite.max}
                        onChange={(e) => setRangoLimite(prev => ({ ...prev, max: e.target.value }))}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Ordenar por</label>
                      <select
                        value={ordenamiento.campo}
                        onChange={(e) => setOrdenamiento(prev => ({ ...prev, campo: e.target.value }))}
                        style={styles.selectInput}
                      >
                        <option value="id">ID</option>
                        <option value="nombre">Nombre</option>
                        <option value="limite_minutos_default">Límite</option>
                      </select>
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Dirección</label>
                      <select
                        value={ordenamiento.direccion}
                        onChange={(e) => setOrdenamiento(prev => ({ ...prev, direccion: e.target.value }))}
                        style={styles.selectInput}
                      >
                        <option value="asc">Ascendente</option>
                        <option value="desc">Descendente</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* ESTADÍSTICAS */}
              <div style={styles.statsBar}>
                <span>
                  Mostrando <strong>{estadosFiltrados.length}</strong> de <strong>{estadosCat.length}</strong> estados
                </span>
                {estadosFiltrados.length > 0 && (
                  <span>
                    Límite promedio: <strong>
                      {Math.round(estadosFiltrados.reduce((sum, e) => sum + (e.limite_minutos_default ?? 0), 0) / estadosFiltrados.length)}
                    </strong> min
                  </span>
                )}
              </div>

              {/* TABLA */}
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th} onClick={() => cambiarOrdenamiento('id')}>
                        ID
                        {ordenamiento.campo === 'id' && (
                          <span style={styles.sortIndicator}>
                            {ordenamiento.direccion === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th style={styles.th} onClick={() => cambiarOrdenamiento('nombre')}>
                        Nombre del estado
                        {ordenamiento.campo === 'nombre' && (
                          <span style={styles.sortIndicator}>
                            {ordenamiento.direccion === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th style={styles.th}>Color</th>
                      <th style={styles.th} onClick={() => cambiarOrdenamiento('limite_minutos_default')}>
                        Límite (min)
                        {ordenamiento.campo === 'limite_minutos_default' && (
                          <span style={styles.sortIndicator}>
                            {ordenamiento.direccion === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th style={styles.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estadosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: 0 }}>
                          <div style={styles.emptyState}>
                            <div style={styles.emptyStateIcon}>
                              {busqueda || rangoLimite.min || rangoLimite.max ? '🔍' : '📭'}
                            </div>
                            <p style={styles.emptyStateText}>
                              {busqueda || rangoLimite.min || rangoLimite.max
                                ? 'No se encontraron resultados'
                                : 'No hay estados registrados'}
                            </p>
                            <small style={{ color: 'var(--text-secondary)' }}>
                              {busqueda || rangoLimite.min || rangoLimite.max
                                ? 'Intenta ajustar los filtros de búsqueda'
                                : 'Crea tu primer estado usando el formulario de arriba'}
                            </small>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      estadosFiltrados.map(e => (
                        <tr key={e.id} style={styles.tr}>
                          <td style={styles.td}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              background: 'var(--bg)',
                              padding: '4px 8px',
                              borderRadius: 6
                            }}>
                              #{e.id}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={{ fontWeight: 600 }}>{e.nombre}</span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.colorPreview}>
                              <span style={{
                                ...styles.colorSwatch,
                                background: e.color_hex || '#6b7280',
                              }} />
                              <span style={styles.colorHex}>{e.color_hex}</span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '4px 12px',
                              borderRadius: 12,
                              fontSize: 13,
                              fontWeight: 600
                            }}>
                              {e.limite_minutos_default ?? '-'} min
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.acciones}>
                              <button
                                style={styles.btnEdit}
                                onClick={() => {
                                  setEstadoEditando(e);
                                  setFormEstado({
                                    nombre: e.nombre || '',
                                    slug: e.slug || '',
                                    color_hex: e.color_hex || '#10b981',
                                    limite_minutos_default: e.limite_minutos_default ?? 60,
                                  });
                                }}
                                title="Editar estado"
                                onMouseOver={(e) => e.currentTarget.style.background = '#bfdbfe'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#dbeafe'}
                              >
                                <Edit2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DIVISOR */}
            <div style={styles.sectionDivider} />

            {/*CONFIGURACIÓN POR ASESOR */}
            <h3 style={styles.sectionTitle}>
              Configuración Personalizada por Asesor
            </h3>
            
            <div style={styles.configCard}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Seleccionar Asesor <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    style={styles.select}
                    value={cfgAsesor.asesor}
                    onChange={e => {
                      const value = e.target.value;
                      setCfgAsesor(c => ({ ...c, asesor: value }));
                      cargarConfigsAsesor(value);
                    }}
                  >
                    <option value="">-- Selecciona un asesor --</option>
                    {(asesores || []).map(a => (
                      <option key={a.id_asesor} value={a.id_asesor}>
                        {a.nombre} {a.cargo ? ` - ${a.cargo}` : ''} {a.area ? ` (${a.area})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Estado a configurar <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    style={styles.select}
                    value={cfgAsesor.estado_id}
                    onChange={e => setCfgAsesor(c => ({ ...c, estado_id: e.target.value }))}
                  >
                    <option value="">-- Selecciona un estado --</option>
                    {(estadosCat || []).map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/*
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Límite personalizado (minutos)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={cfgAsesor.limite_minutos}
                    onChange={e => setCfgAsesor(c => ({ ...c, limite_minutos: e.target.value }))}
                    placeholder="Deja vacío para usar el valor por defecto"
                    min="0"
                    step="5"
                  />
                  <small style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Override del límite del estado
                  </small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Color personalizado (opcional)</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      type="color"
                      style={styles.colorInput}
                      value={cfgAsesor.color_hex_override || '#FF8800'}
                      onChange={e => setCfgAsesor(c => ({ ...c, color_hex_override: e.target.value.toUpperCase() }))}
                    />
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg)',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)'
                    }}>
                      {cfgAsesor.color_hex_override || '#FF8800'}
                    </span>
                  </div>
                </div>
              </div>*/}

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estado de la configuración</label>
                  <select
                    style={styles.select}
                    value={String(cfgAsesor.activo)}
                    onChange={e => setCfgAsesor(c => ({ ...c, activo: e.target.value === 'true' }))}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    style={{ ...styles.submitBtn, marginTop: 0 }}
                    onClick={async () => {
                      try {
                        if (!cfgAsesor.asesor || !cfgAsesor.estado_id) {
                          notify('Selecciona asesor y estado', 'warning');
                          return;
                        }

                        const color = toValidHex(cfgAsesor.color_hex_override);
                        if (color === 'INVALID') {
                          notify('Color inválido. Usa formato #RRGGBB', 'warning');
                          return;
                        }

                        const payload = {
                          asesor: Number(cfgAsesor.asesor),
                          estado_id: Number(cfgAsesor.estado_id),
                          activo: !!cfgAsesor.activo,
                          ...(cfgAsesor.limite_minutos !== '' && { 
                            limite_minutos: Number(cfgAsesor.limite_minutos) 
                          }),
                          ...(cfgAsesor.color_hex_override && cfgAsesor.color_hex_override.trim() !== '' && {
                            color_hex_override: cfgAsesor.color_hex_override.trim()
                          }),
                        };
                        
                        await workforceApi.crearEstadoConfig(payload);
                        notify('Configuración guardada correctamente', 'success');
                        await cargarConfigsAsesor(Number(cfgAsesor.asesor));
                      } catch (e) {
                        let msg = 'No se pudo crear la configuración';
                        try { 
                          const j = JSON.parse(e.message); 
                          msg += `\n${JSON.stringify(j, null, 2)}`; 
                        } catch {}
                        console.error(e);
                        notify(msg, 'error');
                      }
                    }}
                  >
                    Guardar configuración
                  </button>
                </div>
              </div>

              {/* TABLA DE CONFIGURACIONES DEL ASESOR */}
              {cfgAsesor.asesor && (
                <div style={{ marginTop: 32 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
                    Configuraciones del asesor seleccionado
                  </h4>
                  
                  {configsAsesor.length === 0 ? (
                    <div style={styles.emptyState}>
                      <div style={styles.emptyStateIcon}>📭</div>
                      <p style={styles.emptyStateText}>Sin configuraciones personalizadas</p>
                    </div>
                  ) : (
                    <div style={styles.tableContainer}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Estado</th>
                            <th style={styles.th}>Límite</th>
                            {/*<th style={styles.th}>Color custom</th>*/}
                            <th style={styles.th}>Estado</th>
                            <th style={styles.th}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {configsAsesor.map(cfg => (
                            <tr key={cfg.id} style={styles.tr}>
                              <td style={styles.td}>
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                  background: 'var(--bg)',
                                  padding: '4px 8px',
                                  borderRadius: 6
                                }}>
                                  #{cfg.id}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <span style={{ fontWeight: 600 }}>
                                  {cfg.estado?.nombre || cfg.estado_nombre || cfg.estado_id}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <span style={{
                                  background: '#dbeafe',
                                  color: '#1e40af',
                                  padding: '4px 12px',
                                  borderRadius: 12,
                                  fontSize: 13,
                                  fontWeight: 600
                                }}>
                                  {cfg.limite_minutos ?? '-'} min
                                </span>
                              </td>
                              {/*(<td style={styles.td}>
                                {cfg.color_hex_override ? (
                                  <div style={styles.colorPreview}>
                                    <span style={{
                                      ...styles.colorSwatch,
                                      background: cfg.color_hex_override,
                                    }} />
                                    <span style={styles.colorHex}>{cfg.color_hex_override}</span>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                )}
                              </td>*/}
                              <td style={styles.td}>
                                <span style={cfg.activo ? styles.badgeSuccess : styles.badgeDanger}>
                                  {cfg.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              <td style={styles.td}>
                                  <div style={styles.acciones}>
                                    <button
                                      style={{
                                        ...styles.btnEdit,
                                        background: cfg.activo ? '#dcfce7' : '#fee2e2',
                                        color: cfg.activo ? '#15803d' : '#dc2626',
                                        border: `1px solid ${cfg.activo ? '#86efac' : '#fca5a5'}`,
                                      }}
                                      title={cfg.activo ? 'Desactivar configuración' : 'Activar configuración'}
                                      onClick={async () => {
                                        try {
                                          await workforceApi.actualizarEstadoConfig(cfg.id, { 
                                            activo: !cfg.activo
                                          });
                                          await cargarConfigsAsesor(cfgAsesor.asesor);
                                          notify(
                                            cfg.activo ? 'Configuración desactivada' : 'Configuración activada', 
                                            'success'
                                          );
                                        } catch (e) {
                                          console.error(e);
                                          notify('No se pudo actualizar', 'error');
                                        }
                                      }}
                                    >
                                      {cfg.activo ? '✓ Activo' : '✕ Inactivo'}
                                    </button>
                                  </div>
                                </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

