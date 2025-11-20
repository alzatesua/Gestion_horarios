
import { useState, useEffect, useRef } from 'react';
import {
  Clock, Coffee, UtensilsCrossed, CheckCircle,
  PlayCircle, StopCircle, Calendar, AlertCircle
} from 'lucide-react';

// Importa las funciones reales de tu API
import {
  getAsesorEstados,
  getAsesorStatus,
  transitionEstadoAsesor,
  getHorarioActualAsesor,
  getJornadaActual,
  marcarEntrada,
  marcarSalida,
  getHistorialAsesor,
} from '../lib/workforce';

import { notify, toastLite, notifySuccess, notifyError, notifyWarn, notifyInfo,
  notifyPromise, notifyAction, dismiss } from '../lib/notify.jsx';

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

export default function Marcador() {
  // ⏱️ Configuración de inactividad
  const INACTIVIDAD_WARNING_MIN = 55; // aviso a los 55 min
  const INACTIVIDAD_MAX_MIN = 60;     // desconexión a los 60 min
  const CIERRE_INACTIVIDAD_CODE = 4001;
  const SYNC_INTERVAL_MS = 30000; // 30 segundos
  const WS_PING_INTERVAL_MS = 25000; // 25 segundos

  

  const user = getUser();

  // Obtener el ID del asesor con todas las variantes posibles
  const asesorId =
    user?.id_asesor ??
    user?.asesor_id ??
    user?.idAsesor ??
    user?.external_id ??
    user?.id;

  // 🧠 Estado de datos
  const [estadosDisponibles, setEstadosDisponibles] = useState([]);
  const [cargandoEstados, setCargandoEstados] = useState(true);
  const [errorEstados, setErrorEstados] = useState(null);

  // Reloj / jornada
  const [estadoActual, setEstadoActual] = useState('desconectado');
  const estadoActualRef = useRef('desconectado');

  // Mantener el ref sincronizado con el estado
  useEffect(() => {
    estadoActualRef.current = estadoActual;
  }, [estadoActual]);

  const [tiempoActual, setTiempoActual] = useState(0);
  const [horaInicio, setHoraInicio] = useState(null);
  const [registroHoy, setRegistroHoy] = useState({
    id: null,
    usuarioId: asesorId,
    fecha: new Date().toISOString().split('T')[0],
    horaEntrada: null,
    horaSalida: null,
    estado: 'desconectado',
    breaks: [],
    almuerzo: null,
    tiempoTotal: 0,
    tiempoReponer: 0,
  });

  // WebSocket
  const [ws, setWs] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // ⏱️ Inactividad
  const ultimaActividadRef = useRef(Date.now());
  const [mostrarModalInactividad, setMostrarModalInactividad] = useState(false);
  const [requiereReconexion, setRequiereReconexion] = useState(false);

  

  // Límite y excedente
  const [limiteActualSeg, setLimiteActualSeg] = useState(null);
  const [excedenteActual, setExcedenteActual] = useState(0);
  const [alertado, setAlertado] = useState(false);

  // Beep
  const beepRef = useRef(null);
  const intervalRef = useRef(null);
  const verificandoJornadaRef = useRef(false);
  const syncIntervalRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // Horario y permisos
  const [horarioHoy, setHorarioHoy] = useState(null);
  const [puedeIniciar, setPuedeIniciar] = useState(false);
  const [puedeFinalizar, setPuedeFinalizar] = useState(false);
  const [mensajeHorario, setMensajeHorario] = useState('');
  const [jornadaCerrada, setJornadaCerrada] = useState(false);
  const [fueraDeHorario, setFueraDeHorario] = useState(false);
  const [historialHoy, setHistorialHoy] = useState([]);

  

  // 🔄 Sincronización periódica de estado (cada 30 segundos)
  useEffect(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Limpiar intervalo anterior si existe
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    syncIntervalRef.current = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const estado = (estadoActualRef.current || '').toLowerCase();

      // Enviar heartbeat incluso si está desconectado (para que el admin lo vea)
      try {
        ws.send(JSON.stringify({
          type: 'estado_cambio',
          userId: asesorId,
          nombre: user.nombre,
          cargo: user.cargo,
          area: user.area,
          estado,
          nuevo_estado: estado,
          estado_slug: estado,
          estado_actual: estado,
          estado_actual_slug: estado,
          timestamp: new Date().toISOString(),
          origen: 'sync_interval',
          // Info adicional para el admin
          horaEntrada: registroHoy.horaEntrada,
          horaSalida: registroHoy.horaSalida,
          tiempoActual,
          jornadaActiva: registroHoy.horaEntrada && !registroHoy.horaSalida,
        }));

        console.log('[Sync] Estado enviado:', estado, 'a las', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('[Sync] Error enviando estado:', error);
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [ws, asesorId, user.nombre, user.cargo, user.area, registroHoy, tiempoActual]);

  const playBeep = () => {
    try {
      const audio = beepRef.current;
      if (!audio) return;

      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.log('No se pudo reproducir el beep:', err);
      });
    } catch (e) {
      console.log('Error al reproducir beep:', e);
    }
  };

  useEffect(() => {
    const uri = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYBWFlaAAABAAACAAAAPwAAAP8AAAABAQAA//8AAP//AACAgIAAAP8AAP//AAAAAAA=';
    const a = new Audio(uri);
    a.volume = 0.6;
    beepRef.current = a;
  }, []);

  // 📨 Manejar mensajes del WebSocket
  useEffect(() => {
    if (!ws) return;

    ws.onmessage = async (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }

      console.log('[WS] Mensaje recibido:', msg.type, msg);

      // Mensajes globales, no sólo del propio asesor
      switch (msg.type) {
        case 'pong':
          console.log('[WS] Pong recibido');
          break;
          
        case 'estado_actualizado':
          if (msg.userId === asesorId) {
            await cargarEstadoActualBackend();
            notifyInfo('Tu estado fue actualizado automáticamente');
          }
          break;
          
        case 'jornada_actualizada':
          if (msg.userId === asesorId) {
            await verificarJornadaActual();
            notifyInfo('Tu jornada cambió');
          }
          break;
          
        case 'horario_actualizado':
          if (msg.userId === asesorId) {
            await cargarHorarioHoy();
            notifyInfo('Tu horario cambió');
          }
          break;
          
        case 'historial_actualizado':
          if (msg.userId === asesorId) {
            await cargarHistorialHoy();
            notifyInfo('Se actualizó tu historial de estados');
          }
          break;

        case 'estado_cambio':
          // Eco de lo que tú mismo envías
          if (msg.userId !== asesorId) return;
          break;

        default:
          break;
      }
    };

    return () => {
      ws.onmessage = null;
    };
  }, [ws, asesorId]);

  // 🚀 Inicialización
  useEffect(() => {
    const init = async () => {
      await cargarEstadosDelAsesor();
      await cargarHorarioHoy();
      await verificarJornadaActual();
      setTimeout(async () => {
        await cargarEstadoActualBackend();
      }, 800);
      await cargarHistorialHoy();
    };
    init();

    const websocket = conectarWebSocket();

    return () => {
      // Limpiar intervalos y timeouts
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // 🚫 NO CERRAR EL WEBSOCKET AQUÍ
      // El WS se queda vivo aunque cambies de página
    };
  }, []);


  // 🔄 Actualización periódica de horario y jornada
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!jornadaCerrada && estadoActual === 'desconectado' && !registroHoy.horaEntrada) {
        await cargarHorarioHoy();
        await verificarJornadaActual();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [asesorId, jornadaCerrada, estadoActual, registroHoy.horaEntrada]);

  // ⏱️ Cronómetro principal con control de límite
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const puedeActivarCronometro = 
      estadoActual !== 'desconectado' && 
      estadoActual !== 'jornada_activa' && 
      horaInicio &&
      registroHoy.horaEntrada;

    if (puedeActivarCronometro) {
      intervalRef.current = setInterval(() => {
        const ahora = new Date();
        const inicio = new Date(horaInicio);
        const diff = Math.floor((ahora - inicio) / 1000);
        setTiempoActual(diff);

        if (limiteActualSeg != null) {
          const over = Math.max(0, diff - limiteActualSeg);
          setExcedenteActual(over);

          if (!alertado && over > 0) {
            try {
              if (beepRef.current) {
                beepRef.current.currentTime = 0;
                beepRef.current.play().catch(err => console.log('Audio error:', err));
              }
            } catch (err) {
              console.log('Error playing audio:', err);
            }
            setAlertado(true);
            enviarEstadoWebSocket('limite_superado', {
              estado: estadoActual,
              limite_segundos: limiteActualSeg,
            });
          }
        }
      }, 1000);
    } else {
      setTiempoActual(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [estadoActual, horaInicio, limiteActualSeg, alertado, registroHoy.horaEntrada]);

  // Recalcular límite cuando cambia el estado
  useEffect(() => {
    const e = estadosDisponibles.find(x => (x.codigo || x.slug) === estadoActual);
    const min = e?.limite_minutos ?? e?.limite_minutos_default ?? null;
    const lim = (typeof min === 'number' && !isNaN(min)) ? min * 60 : null;
    setLimiteActualSeg(lim);
    setExcedenteActual(0);
    setAlertado(false);
  }, [estadoActual, estadosDisponibles]);

  // Funciones API
  const cargarEstadosDelAsesor = async () => {
    try {
      setCargandoEstados(true);
      const estados = await getAsesorEstados(asesorId);
      setEstadosDisponibles(estados || []);
    } catch (err) {
      console.error('Error cargando estados:', err);
    } finally {
      setCargandoEstados(false);
    }
  };

  const cargarEstadoActualBackend = async () => {
    try {
      const res = await getAsesorStatus(asesorId);

      const codigo = (res?.estado || res?.codigo || res)?.toString().toLowerCase();
      const inicioIso = res?.inicio;
      
      if (inicioIso) {
        const fechaInicio = new Date(inicioIso).toISOString().split('T')[0];
        const hoy = new Date().toISOString().split('T')[0];
        
        if (fechaInicio !== hoy) {
          console.log('🔴 Estado del backend es de otro día, ignorando');
          return;
        }
      }

      const hayJornadaHoy = registroHoy.horaEntrada && !registroHoy.horaSalida;

      if (codigo && codigo !== 'desconectado' && hayJornadaHoy) {
        console.log('✅ Restaurando estado del backend:', codigo);
        setEstadoActual(codigo);
        if (inicioIso) {
          setHoraInicio(inicioIso);
          const diff = Math.floor((new Date() - new Date(inicioIso)) / 1000);
          setTiempoActual(diff);
        } else {
          setHoraInicio(new Date().toISOString());
          setTiempoActual(0);
        }
      } else {
        console.log('🔴 No hay condiciones para restaurar estado del backend');
      }
    } catch (err) {
      console.warn('No se pudo obtener el estado actual del backend:', err);
    }
  };

  const cargarHorarioHoy = async () => {
    try {
      const data = await getHorarioActualAsesor(asesorId);
      if (!data?.hora_entrada || !data?.hora_salida) {
        setPuedeIniciar(false);
        setPuedeFinalizar(false);
        setMensajeHorario('No hay horario asignado para hoy');
        return;
      }

      setHorarioHoy(data);
      const ahora = new Date();
      const [hEntrada, mEntrada] = data.hora_entrada.split(':').map(Number);
      const [hSalida, mSalida] = data.hora_salida.split(':').map(Number);

      const horaEntrada = new Date();
      horaEntrada.setHours(hEntrada, mEntrada, 0, 0);
      const horaSalida = new Date();
      horaSalida.setHours(hSalida, mSalida, 0, 0);

      const margenEntrada = 30 * 60 * 1000;
      const margenSalida = 2 * 60 * 60 * 1000;
      const ventanaInicio = new Date(horaEntrada.getTime() - margenEntrada);
      const ventanaFin = new Date(horaSalida.getTime() + margenSalida);

      const puedeIniciarAhora = ahora >= ventanaInicio && ahora <= ventanaFin;
      const puedeFinalizarAhora = ahora >= horaSalida;

      setPuedeIniciar(puedeIniciarAhora);
      setPuedeFinalizar(puedeFinalizarAhora);

      if (!puedeIniciarAhora && ahora < ventanaInicio) {
        const minutos = Math.ceil((ventanaInicio - ahora) / 60000);
        setMensajeHorario(`Podrás iniciar en ${minutos} minutos`);
      } else if (ahora > ventanaFin) {
        setMensajeHorario('Fuera de la ventana de marcación para hoy');
      } else if (ahora >= horaSalida) {
        const nombre = (user?.nombre || '').split(' ')[0];
        setMensajeHorario(`${nombre}, ya es hora de finalizar tu jornada.`);
      } else {
        setMensajeHorario('');
      }
    } catch (err) {
      console.error('Error cargando horario:', err);
    }
  };

  useEffect(() => {
    requiereReconexionRef.current = requiereReconexion;
  }, [requiereReconexion]);

  useEffect(() => {
    mostrarModalInactividadRef.current = mostrarModalInactividad;
  }, [mostrarModalInactividad]);


  useEffect(() => {
    if (!horarioHoy) return;

    const ahora = new Date();
    const [hEntrada, mEntrada] = horarioHoy.hora_entrada.split(':').map(Number);
    const [hSalida, mSalida] = horarioHoy.hora_salida.split(':').map(Number);

    const horaEntrada = new Date();
    horaEntrada.setHours(hEntrada, mEntrada, 0, 0);
    const horaSalida = new Date();
    horaSalida.setHours(hSalida, mSalida, 0, 0);

    const margenInicio = new Date(horaEntrada.getTime() - 30 * 60 * 1000);
    const margenFin = new Date(horaSalida.getTime() + 30 * 60 * 1000);

    setFueraDeHorario(!(ahora >= margenInicio && ahora <= margenFin));
  }, [horarioHoy, tiempoActual]);

  const enviarEstadoWebSocket = (nuevoEstado, datos = {}) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] No se puede enviar, conexión no disponible');
      return;
    }

    const estadoSlug = (nuevoEstado || '').toString().toLowerCase();

    try {
      ws.send(JSON.stringify({
        type: 'estado_cambio',
        userId: asesorId,
        nombre: user.nombre,
        cargo: user.cargo,
        area: user.area,
        estado: estadoSlug,
        nuevo_estado: estadoSlug,
        estado_slug: estadoSlug,
        estado_actual: estadoSlug,
        estado_actual_slug: estadoSlug,
        timestamp: new Date().toISOString(),
        ...datos
      }));
      console.log('[WS] Estado enviado:', estadoSlug);
    } catch (error) {
      console.error('[WS] Error enviando estado:', error);
    }
  };

  // 🔄 Enviar estado cuando cambia
  useEffect(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!asesorId) return;

    enviarEstadoWebSocket(estadoActual, {
      horaEntrada: registroHoy.horaEntrada,
      horaSalida: registroHoy.horaSalida,
      jornadaActiva: registroHoy.horaEntrada && !registroHoy.horaSalida,
    });
  }, [estadoActual, ws, asesorId]);

  const verificarJornadaActual = async () => {
    if (verificandoJornadaRef.current) {
      console.log('⏭️ Ya se está verificando jornada, omitiendo...');
      return;
    }

    try {
      verificandoJornadaRef.current = true;
      const jornada = await getJornadaActual(asesorId);
      const hoyStr = new Date().toISOString().split('T')[0];

      if (jornada?.fecha && jornada.fecha !== hoyStr) {
        console.log('📅 Jornada de otro día, ignorando');
        return;
      }

      if (!jornada?.items || jornada.items.length === 0) {
        console.log('✅ No hay jornada registrada hoy');
        return;
      }

      const primerItem = jornada.items[0];
      const ultimoItem = jornada.items[jornada.items.length - 1];
      const jornadaActiva = ultimoItem && !ultimoItem.fin && ultimoItem.estado !== 'desconectado';

      if (jornadaActiva) {
        console.log('🟢 Jornada activa detectada');
        
        const horaEntrada = new Date(primerItem.inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        setRegistroHoy(prev => ({
          ...prev,
          horaEntrada: horaEntrada,
          horaSalida: null,
        }));
        
        const estadoActivo = ultimoItem.estado || 'jornada_activa';
        setEstadoActual(estadoActivo);
        
        if (ultimoItem.inicio && estadoActivo !== 'desconectado') {
          setHoraInicio(ultimoItem.inicio);
          const diff = Math.floor((new Date() - new Date(ultimoItem.inicio)) / 1000);
          setTiempoActual(diff);
        }
        
        setJornadaCerrada(false);
        setPuedeIniciar(false);
        
        console.log('Jornada activa configurada:', {
          horaEntrada,
          estadoActivo,
          puedeIniciar: false
        });
        
        return;
      }

      const salida = ultimoItem.fin
        ? new Date(ultimoItem.fin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : null;

      if (salida || ultimoItem.estado === 'desconectado') {
        console.log('Jornada finalizada detectada');
        setRegistroHoy(prev => ({
          ...prev,
          horaEntrada: new Date(primerItem.inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          horaSalida: salida,
        }));
        setEstadoActual('desconectado');
        setJornadaCerrada(true);
        setPuedeIniciar(false);
        setPuedeFinalizar(false);
      }

    } catch (err) {
      console.warn('Error verificando jornada:', err);
    } finally {
      verificandoJornadaRef.current = false;
    }
  };

  const handleCambiarEstado = async (nuevoEstado) => {
    if (jornadaCerrada) {
      notifyWarn('Tu jornada ya fue finalizada. No puedes cambiar estados.');
      return;
    }
    const ahora = new Date();
    const horaActual = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    try {
      if (nuevoEstado === 'iniciar_jornada') {
        setRegistroHoy(prev => ({ ...prev, horaEntrada: horaActual }));
        setEstadoActual('jornada_activa');
        enviarEstadoWebSocket('start_shift');
        console.log('Jornada iniciada - Estados ahora disponibles (solo frontend)');
        return;
      }

      if (nuevoEstado === 'finalizar_jornada' || nuevoEstado === 'salida') {
        if (excedenteActual > 0) {
          setRegistroHoy(prev => ({
            ...prev,
            tiempoReponer: (prev?.tiempoReponer || 0) + excedenteActual,
          }));
        }
        
        setRegistroHoy(prev => ({ ...prev, horaSalida: horaActual, estado: 'desconectado' }));
        setHoraInicio(null);
        setTiempoActual(0);
        setEstadoActual('desconectado');
        enviarEstadoWebSocket('end_shift');
        
        if (estadoActual !== 'jornada_activa' && estadoActual !== 'desconectado') {
          try {
            await transitionEstadoAsesor(asesorId, { estado: 'desconectado' });
          } catch (err) {
            console.warn('No se pudo notificar desconexión al backend:', err);
          }
        }
        
        console.log('Jornada finalizada');
        return;
      }

      console.log(`Transición: ${estadoActual} → ${nuevoEstado}`);

      await transitionEstadoAsesor(asesorId, { estado: nuevoEstado });

      if (excedenteActual > 0 && estadoActual !== 'desconectado' && estadoActual !== 'jornada_activa') {
        setRegistroHoy(prev => ({
          ...prev,
          tiempoReponer: (prev?.tiempoReponer || 0) + excedenteActual,
        }));
      }

      if (estadoActual === 'jornada_activa') {
        setHoraInicio(ahora.toISOString());
        setTiempoActual(0);
        setEstadoActual(nuevoEstado);
        enviarEstadoWebSocket(nuevoEstado);
        console.log(`Primer estado activo: ${nuevoEstado}`);
        return;
      }

      if (nuevoEstado === 'disponible') {
        if (estadoActual === 'break') {
          const breakActual = registroHoy.breaks[registroHoy.breaks.length - 1];
          if (breakActual) breakActual.fin = horaActual;
        } else if (estadoActual === 'almuerzo') {
          setRegistroHoy(prev => ({ 
            ...prev, 
            almuerzo: { ...(prev.almuerzo || {}), fin: horaActual } 
          }));
        }
        setHoraInicio(ahora.toISOString());
        setTiempoActual(0);
        setEstadoActual('disponible');
        enviarEstadoWebSocket('disponible');
        return;
      }

      if (nuevoEstado === 'break') {
        setRegistroHoy(prev => ({
          ...prev,
          breaks: [...prev.breaks, { inicio: horaActual, fin: null }],
        }));
        setHoraInicio(ahora.toISOString());
        setTiempoActual(0);
        setEstadoActual('break');
        enviarEstadoWebSocket('break');
        return;
      }

      if (nuevoEstado === 'almuerzo') {
        setRegistroHoy(prev => ({
          ...prev,
          almuerzo: { inicio: horaActual, fin: null },
        }));
        setHoraInicio(ahora.toISOString());
        setTiempoActual(0);
        setEstadoActual('almuerzo');
        enviarEstadoWebSocket('almuerzo');
        return;
      }

      setHoraInicio(ahora.toISOString());
      setTiempoActual(0);
      setEstadoActual(nuevoEstado);
      enviarEstadoWebSocket(nuevoEstado);

    } catch (err) {
      notifyError(`No se pudo cambiar al estado "${nuevoEstado}". ${err.message || 'Intenta nuevamente.'}`);
    }
  };

  const notificarDesconexionWS = (motivo = 'desconocido') => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      ws.send(JSON.stringify({
        type: 'estado_cambio',
        userId: asesorId,
        nombre: user.nombre,
        cargo: user.cargo,
        area: user.area,
        estado: 'desconectado',
        estado_slug: 'desconectado',
        motivo,
        timestamp: new Date().toISOString(),
        origen: 'auto_disconnect',
      }));
    } catch (error) {
      console.error('[WS] Error notificando desconexión:', error);
    }
  };

  const formatearTiempo = (segundos) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  const getEstadoColor = () => {
    const encontrado = estadosDisponibles.find(e => (e.codigo || e.slug) === estadoActual);
    if (encontrado?.color_hex) return encontrado.color_hex;

    switch (estadoActual) {
      case 'disponible': return '#82cc0e';
      case 'break': return '#f59e0b';
      case 'almuerzo': return '#82cc0e';
      default: return '#6b7280';
    }
  };

  const getEstadoTexto = () => {
    if (estadoActual === 'jornada_activa') {
      return 'Sin estado activo';
    }
    
    const encontrado = estadosDisponibles.find(e => (e.codigo || e.slug) === estadoActual);
    if (encontrado?.nombre) return encontrado.nombre;

    switch (estadoActual) {
      case 'disponible': return 'Disponible';
      case 'break': return 'En Break';
      case 'almuerzo': return 'En Almuerzo';
      default: return 'Desconectado';
    }
  };

  const labelDe = (codigo) => {
    switch ((codigo || '').toLowerCase()) {
      case 'ingreso': return 'Ingresar';
      case 'salida': return 'Finalizar Jornada';
      case 'disponible': return 'Disponible';
      case 'break': return 'Break';
      case 'almuerzo': return 'Almuerzo';
      case 'reunion': return 'Reunión';
      default: return codigo?.charAt(0).toUpperCase() + codigo?.slice(1);
    }
  };

  const iconoDe = (codigo) => {
    switch ((codigo || '').toLowerCase()) {
      case 'ingreso': return PlayCircle;
      case 'salida': return StopCircle;
      case 'disponible': return CheckCircle;
      case 'break': return Coffee;
      case 'almuerzo': return UtensilsCrossed;
      default: return Clock;
    }
  };

  const colorDe = (codigo) => {
    switch ((codigo || '').toLowerCase()) {
      case 'disponible': return '#10b981';
      case 'break': return '#f59e0b';
      case 'almuerzo': return '#3b82f6';
      case 'ingreso': return '#10b981';
      case 'salida': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleMarcarEntrada = async () => {
    try {
      await marcarEntrada(asesorId);
      setRegistroHoy(prev => ({
        ...prev,
        horaEntrada: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      }));
      setEstadoActual('jornada_activa');
      setPuedeIniciar(false);
      setPuedeFinalizar(true);
      notifySuccess('Entrada marcada correctamente');
      await verificarJornadaActual();
    } catch (err) {
      notifyError(`Error al marcar entrada: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleMarcarSalida = async () => {
    try {
      const ahora = new Date();
      const horaSalidaActual = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const finISOString = ahora.toISOString();
      const estadoAnterior = estadoActual;

      console.log('Iniciando proceso de finalización de jornada...');

      setHoraInicio(null);
      setTiempoActual(0);

      if (estadoAnterior !== 'desconectado' && estadoAnterior !== 'jornada_activa') {
        console.log('Finalizando estado activo:', estadoAnterior);
        
        if (estadoAnterior === 'break') {
          const breakActual = registroHoy.breaks[registroHoy.breaks.length - 1];
          if (breakActual && !breakActual.fin) {
            breakActual.fin = horaSalidaActual;
          }
        }
        
        if (estadoAnterior === 'almuerzo') {
          if (registroHoy.almuerzo && !registroHoy.almuerzo.fin) {
            setRegistroHoy(prev => ({ 
              ...prev, 
              almuerzo: { ...prev.almuerzo, fin: horaSalidaActual } 
            }));
          }
        }

        if (excedenteActual > 0) {
          setRegistroHoy(prev => ({
            ...prev,
            tiempoReponer: (prev?.tiempoReponer || 0) + excedenteActual,
          }));
        }

        try {
          await transitionEstadoAsesor(asesorId, { 
            estado: estadoAnterior,
            fin: finISOString,
            finalizando: true
          });
        } catch (err) {
          console.error('Error al finalizar estado actual:', err);
        }

        try {
          await transitionEstadoAsesor(asesorId, { 
            estado: 'desconectado',
            inicio: finISOString,
            finalizando_jornada: true,
            estado_anterior: estadoAnterior
          });
        } catch (err) {
          console.error('Error al crear estado desconectado:', err);
        }
      } else {
        try {
          await transitionEstadoAsesor(asesorId, { estado: 'desconectado' });
        } catch (err) {
          console.error('Error al enviar estado desconectado:', err);
        }
      }

      setEstadoActual('desconectado');
      const res = await marcarSalida(asesorId);
      notifySuccess(res.mensaje || 'Salida registrada correctamente.');

      setRegistroHoy(prev => ({
        ...prev,
        horaSalida: horaSalidaActual,
      }));

      setPuedeFinalizar(false);
      setJornadaCerrada(true);
      setExcedenteActual(0);
      setAlertado(false);

      enviarEstadoWebSocket('desconectado', {
        ...res,
        evento: 'end_shift',
        estadoAnterior,
        horaSalida: horaSalidaActual,
        fin: finISOString
      });

      setTimeout(() => {
        verificarJornadaActual();
      }, 1500);
    } catch (err) {
      console.error('Error al marcar salida:', err);
      notifyError(`Error al marcar salida: ${err.response?.data?.detail || err.message}`);
    }
  };

  const cargarHistorialHoy = async () => {
    try {
      const hoyStr = new Date().toISOString().split('T')[0];
      const data = await getHistorialAsesor(asesorId, hoyStr);
      setHistorialHoy(data?.transiciones || []);
    } catch (err) {
      console.error('Error al cargar historial de hoy:', err);
    }
  };

  // 🌐 Conectar WebSocket con reconexión automática mejorada
  const conectarWebSocket = () => {
    const explicit = import.meta.env.VITE_WS_URL;
    const fallback = 'wss://tu-fallback-si-aplica';
    const WS_URL = explicit || fallback;

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      console.log('[WS] Ya hay un WebSocket activo, no se crea otro');
      return ws;
    }

    try {
      console.log('[WS] 🔄 Iniciando conexión a:', WS_URL);
      const websocket = new WebSocket(WS_URL);
      
      const connectionTimeout = setTimeout(() => {
        if (websocket.readyState !== WebSocket.OPEN) {
          console.log('[WS] ⏱️ Timeout de conexión, cerrando...');
          websocket.close();
        }
      }, 10000);

      websocket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('[WS] 🟢 Conectado exitosamente');
        
        // Resetear contador de intentos
        reconnectAttemptsRef.current = 0;
        sessionStorage.removeItem('ws_reconnect_attempts');

        // Identificarse
        websocket.send(JSON.stringify({
          type: 'identify',
          userId: asesorId,
          nombre: user.nombre,
          cargo: user.cargo,
          area: user.area,
          timestamp: new Date().toISOString(),
        }));

        // Enviar estado actual
        const estadoActualizado = estadoActualRef.current;
        if (estadoActualizado && estadoActualizado !== 'desconectado') {
          websocket.send(JSON.stringify({
            type: 'estado_cambio',
            userId: asesorId,
            nombre: user.nombre,
            cargo: user.cargo,
            area: user.area,
            estado: estadoActualizado,
            estado_slug: estadoActualizado,
            timestamp: new Date().toISOString(),
            origen: 'reconnect',
            horaEntrada: registroHoy.horaEntrada,
            jornadaActiva: registroHoy.horaEntrada && !registroHoy.horaSalida,
          }));
          console.log('[WS] ✅ Estado actual enviado:', estadoActualizado);
        }

        setRequiereReconexion(false);
        setMostrarModalInactividad(false);
        ultimaActividadRef.current = Date.now();
        
        
        //notifySuccess('Conexión establecida correctamente', { duration: 3000 });
      };

      websocket.onclose = (evt) => {
        clearTimeout(connectionTimeout);
        console.log(
          `[WS] 🔴 Conexión cerrada -> code: ${evt.code}, reason: "${evt.reason}", clean: ${evt.wasClean}`
        );

        // Limpiar intervalos
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Si el cierre fue por inactividad, NO reconectamos
        if (evt.code === CIERRE_INACTIVIDAD_CODE) {
          console.log('[WS] 🚫 Cierre por inactividad del usuario, esperando reconexión manual');
          setWs(null);
          wsRef.current = null;
          return; // ⚠️ Esta línea DETIENE la reconexión automática
        }

        // Reconexión automática con backoff exponencial
        setWs(null);
        wsRef.current = null;
        
        reconnectAttemptsRef.current++;
        const attempts = reconnectAttemptsRef.current;
        
        // Backoff: 3s, 6s, 12s, 24s, hasta max 30s
        const delay = Math.min(3000 * Math.pow(2, attempts - 1), 30000);
        
        console.log(`[WS] 🔄 Reintentando conexión en ${delay/1000}s (intento ${attempts})...`);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WS] Ejecutando reconexión automática...');
          conectarWebSocket();
        }, delay);
      };


      websocket.onerror = (err) => {
        console.error('[WS] ❌ Error:', err);
        notifyError('Error en la conexión WebSocket', { duration: 3000 });
      };

      setWs(websocket);
      wsRef.current = websocket;
      return websocket;
    } catch (err) {
      console.error('Error creando WebSocket:', err);
      notifyError('No se pudo conectar con el servidor en tiempo real');
      return null;
    }
  };



  // 🔔 Detectar actividad del usuario (resetea el contador)
  useEffect(() => {
    const marcarActividad = () => {
      ultimaActividadRef.current = Date.now();

      // Si estaba mostrando el modal de inactividad pero aún no necesita reconexión,
      // lo cerramos al detectar actividad.
      if (mostrarModalInactividadRef.current && !requiereReconexionRef.current) {
        setMostrarModalInactividad(false);
      }
    };

    window.addEventListener('mousemove', marcarActividad);
    window.addEventListener('keydown', marcarActividad);
    window.addEventListener('click', marcarActividad);
    window.addEventListener('scroll', marcarActividad);
    window.addEventListener('touchstart', marcarActividad);

    return () => {
      window.removeEventListener('mousemove', marcarActividad);
      window.removeEventListener('keydown', marcarActividad);
      window.removeEventListener('click', marcarActividad);
      window.removeEventListener('scroll', marcarActividad);
      window.removeEventListener('touchstart', marcarActividad);
    };
  }, []); // 👈 solo una vez




  const requiereReconexionRef = useRef(false);
  const mostrarModalInactividadRef = useRef(false);

  // Mantener los refs sincronizados con el estado
  useEffect(() => {
    requiereReconexionRef.current = requiereReconexion;
  }, [requiereReconexion]);

  useEffect(() => {
    mostrarModalInactividadRef.current = mostrarModalInactividad;
  }, [mostrarModalInactividad]);
  // ⏱️ Monitorear inactividad
  // ⏱️ Monitorear inactividad del usuario
  useEffect(() => {
    const WARNING_MS = INACTIVIDAD_WARNING_MIN * 60 * 1000;
    const MAX_MS = INACTIVIDAD_MAX_MIN * 60 * 1000;

    const timer = setInterval(() => {
      const diff = Date.now() - ultimaActividadRef.current;

      // Solo para debug: ver cuánto tiempo lleva inactivo
      console.log('[INACTIVIDAD] minutos inactivo:', (diff / 60000).toFixed(2));

      // Si ya está en modo "requiere reconexión", no hacemos nada más
      if (requiereReconexionRef.current) return;

      // 1) AVISO a los 25 minutos
      if (
        diff >= WARNING_MS &&
        diff < MAX_MS &&
        !mostrarModalInactividadRef.current
      ) {
        playBeep();
        notifyWarn(
          'Llevas un buen tiempo sin actividad. Si sigues inactivo te desconectaremos por seguridad.',
          { duration: 10000 }
        );
        setMostrarModalInactividad(true);
      }

      // 2) DESCONECTAR a los 30 minutos
      if (diff >= MAX_MS) {
        playBeep();

        try {
          notificarDesconexionWS('inactividad');
        } catch (e) {
          console.error('Error notificando desconexión por inactividad:', e);
        }

        setEstadoActual('desconectado');
        setHoraInicio(null);
        setTiempoActual(0);

        try {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(CIERRE_INACTIVIDAD_CODE, 'Inactividad del usuario');
          }
        } catch (e) {
          console.error('Error cerrando WS por inactividad:', e);
        }

        setRequiereReconexion(true);
        setMostrarModalInactividad(true);
        notifyError(
          'Te hemos desconectado por inactividad. Debes reconectar para seguir usando el marcador.',
          { duration: 8000 }
        );
      }
    }, 60000); // 👈 se revisa cada 1 minuto

    return () => clearInterval(timer);
  }, []); // 👈 SOLO se crea una vez, no depende de ws ni de otros estados


  // 💓 Ping al servidor
  useEffect(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

    pingIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          console.log('[WS] 🔄 Enviando ping...');
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch (err) {
          console.error('[WS] Error enviando ping:', err);
        }
      }
    }, WS_PING_INTERVAL_MS);

    return () => clearInterval(pingIntervalRef.current);
  }, [ws]);

  // 🚪 Notificar al cerrar pestaña
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        notificarDesconexionWS('cerrar_pestaña');
      } catch (e) {
        console.error('Error notificando desconexión al cerrar pestaña:', e);
      }

      try {
        // aquí SÍ cerramos la conexión porque el usuario se va del sitio
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000, 'Cerrar pestaña');
        }
      } catch (e) {
        console.error('Error cerrando WebSocket al cerrar pestaña:', e);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);


  const handleReconectarWS = () => {
    setRequiereReconexion(false);
    setMostrarModalInactividad(false);
    ultimaActividadRef.current = Date.now();
    reconnectAttemptsRef.current = 0;
    conectarWebSocket();
  };

  const colorActualDisplay = excedenteActual > 0 ? '#ef4444' : getEstadoColor();

  const hoy = new Date();
  const diaDeHoy = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    timeZone: 'America/Bogota',
  }).format(hoy);

  const mostrarBotonIngreso = 
    estadoActual === 'desconectado' && 
    puedeIniciar && 
    !registroHoy.horaEntrada && 
    !jornadaCerrada && 
    horarioHoy;

  const mostrarBotonSalida = 
    registroHoy.horaEntrada && 
    !registroHoy.horaSalida && 
    !jornadaCerrada && 
    (estadoActual !== 'desconectado');
  


  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Marcador de Tiempo</h2>
          <p style={styles.subtitle}>
            {user?.nombre || 'Usuario'} - {user?.cargo || 'Cargo'}
          </p>
        </div>
        <div style={styles.conexionStatus}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: ws?.readyState === WebSocket.OPEN ? '#10b981' : '#ef4444',
            marginRight: 8
          }} />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginRight: 8 }}>
            {ws?.readyState === WebSocket.OPEN
              ? 'Conectado'
              : (requiereReconexion ? 'Desconectado por inactividad' : 'Desconectado')}
          </span>

          {requiereReconexion && (
            <button
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: 'none',
                background: '#82cc0e',
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
              }}
              onClick={handleReconectarWS}
            >
              Reconectar
            </button>
          )}
        </div>


      </div>

      <div style={styles.mainCard}>
        {/* Reloj principal */}
        <div style={{
          ...styles.relojPrincipal,
          background: `linear-gradient(135deg, ${colorActualDisplay}15, ${colorActualDisplay}05)`
        }}>
          <div style={{ ...styles.estadoBadge, background: colorActualDisplay }}>
            {getEstadoTexto()}
          </div>

          <div style={styles.relojDisplay}>
            <Clock size={48} style={{ color: colorActualDisplay, marginBottom: 16 }} />
            <div style={{
              fontSize: 72,
              fontWeight: 700,
              color: colorActualDisplay,
              fontFamily: 'monospace',
              letterSpacing: 4
            }}>
              {formatearTiempo(tiempoActual)}
            </div>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginTop: 8 }}>
              {limiteActualSeg != null
                ? (tiempoActual <= limiteActualSeg
                    ? `Límite: ${formatearTiempo(limiteActualSeg)}`
                    : `Excedente: +${formatearTiempo(excedenteActual)}`)
                : (estadoActual === 'disponible' ? 'Tiempo trabajando'
                    : estadoActual === 'break' ? 'Tiempo en break'
                    : estadoActual === 'almuerzo' ? 'Tiempo de almuerzo'
                    : estadoActual === 'jornada_activa' ? 'Selecciona un estado para comenzar'
                    : 'Fuera de servicio')}
            </p>
            {horarioHoy && (
              <p style={{ fontSize: 15, color: '#666', marginTop: 10 }}>
                Horario de hoy {diaDeHoy}: {horarioHoy.hora_entrada?.slice(0, 5)} - {horarioHoy.hora_salida?.slice(0, 5)}
              </p>
            )}
            {mensajeHorario && (
              <p style={{ fontSize: 14, color: '#f59e0b', marginTop: 8, fontWeight: 500 }}>
                {mensajeHorario}
              </p>
            )}
          </div>
        </div>

        {/* Botones de Ingreso/Salida */}
        {/* Botón Iniciar */}
        {mostrarBotonIngreso && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              style={{ 
                ...styles.btnIniciar,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                marginTop: 20,
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '600',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                background: 'linear-gradient(135deg, #82cc0e 0%, #82cc0e 100%)',
                color: 'white',
                minWidth: '220px',
                transform: 'scale(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
              onClick={handleMarcarEntrada}
            >
              <PlayCircle size={28} />
              <span>Iniciar Jornada</span>
            </button>
          </div>
        )}

        {/* Botón Finalizar */}
        {mostrarBotonSalida && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              style={{ 
                ...styles.btnFinalizar,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                marginTop: 20,
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '600',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                background: 'linear-gradient(135deg, #f50000ff 0%, #fa0021ff 100%)',
                color: 'white',
                minWidth: '220px',
                transform: 'scale(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
              onClick={handleMarcarSalida}
            >
              <StopCircle size={28} />
              <span>Finalizar Jornada</span>
            </button>
          </div>
        )}

        
        {jornadaCerrada && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: '#e5e7eb',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 13,
            color: '#374151',
            textAlign: 'center'
          }}>
            Jornada finalizada. Los estados están desactivados hasta mañana.
          </div>
        )}

        {/* Mensaje cuando no puede iniciar/finalizar */}
        {!mostrarBotonIngreso && !mostrarBotonSalida && !jornadaCerrada && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 13,
            color: '#6b7280',
            textAlign: 'center'
          }}>
            {!horarioHoy 
              ? 'No hay horario asignado para hoy'
              : mensajeHorario || 'Fuera de horario laboral'}
          </div>
        )}

        {/* Mis estados (API) */}
        <div style={{ marginTop: 24 }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>Mis estados</h4>

          {cargandoEstados && <p style={{ color: 'var(--text-secondary)' }}>Cargando estados…</p>}
          {errorEstados && (
            <div style={{
              padding: 16,
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={20} />
              <span>{errorEstados}</span>
            </div>
          )}

          {!cargandoEstados && !errorEstados && estadosDisponibles.length === 0 && (
            <p style={{ color: 'var(--text-secondary)' }}>No tienes estados asignados.</p>
          )}

          {!cargandoEstados && estadosDisponibles.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                 {estadosDisponibles.map(est => {
                    const code = est.codigo || est.slug;
                    const Icon = iconoDe(code);
                    const color = est.color_hex || colorDe(code);
                    
                    // Ocultar botones de ingreso/salida si ya se muestran arriba
                    if (code === 'ingreso' || code === 'salida') {
                      return null;
                    }

                    // Determinar si debe estar deshabilitado
                    const configInactiva = est.activo_config === false || est.activo_catalogo === false;
                    const noHaIniciadoJornada = estadoActual === 'desconectado' && !registroHoy.horaEntrada;
                    
                    const disabled = 
                      configInactiva || 
                      noHaIniciadoJornada || 
                      jornadaCerrada || 
                      fueraDeHorario;

                    // Tooltip informativo
                    let tooltip = est.nombre || labelDe(code);
                    if (configInactiva) {
                      tooltip = 'Estado inactivo en la configuración';
                    } else if (noHaIniciadoJornada) {
                      tooltip = 'Debes iniciar jornada primero';
                    } else if (jornadaCerrada) {
                      tooltip = 'La jornada ya fue finalizada';
                    } else if (fueraDeHorario) {
                      tooltip = 'Fuera de horario laboral';
                    }

                    return (
                      <button
                        key={est.id ?? code}
                        onClick={() => !disabled && handleCambiarEstado(code)}
                        disabled={disabled}
                        style={{
                          ...styles.btnControl,
                          padding: '14px 18px',
                          background: disabled 
                            ? '#9ca3af' 
                            : `linear-gradient(135deg, ${color}, ${color})`,
                          opacity: disabled ? 0.5 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          border: estadoActual === code ? '2px solid rgba(255,255,255,.8)' : 'none',
                          boxShadow: estadoActual === code 
                            ? '0 0 20px rgba(255,255,255,.3)' 
                            : 'none'
                        }}
                        title={tooltip}
                      >
                        <Icon size={22} />
                        <span>{est.nombre || labelDe(code)}</span>
                      </button>
                    );
                  })}

              </div>
              
              {/* Mensajes informativos */}
              {!registroHoy.horaEntrada && !mostrarBotonIngreso && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#92400e',
                  textAlign: 'center'
                }}>
                  Espera a que llegue tu horario para iniciar jornada
                </div>
              )}
              
              {registroHoy.horaEntrada && !jornadaCerrada && estadoActual === 'jornada_activa' && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: '#dbeafe',
                  border: '1px solid #93c5fd',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#3baf1eff',
                  textAlign: 'center'
                }}>
                  Jornada iniciada. Selecciona un estado para comenzar a trabajar
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Resumen del Día */}
      {historialHoy.length > 0 && (
        <div style={styles.breaksList}>
          <h4 style={styles.breaksTitle}>Estados de hoy</h4>
          {historialHoy.map((t, idx) => (
            <div key={idx} style={styles.breakItem}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: t.color || '#9ca3af',
                  marginRight: 8,
                }}
              />
              <span style={{ fontWeight: 600 }}>{t.estado}</span>
              <span style={{ marginLeft: 8, color: '#555' }}>
                ({t.inicio?.slice(11, 19)} - {t.fin ? t.fin.slice(11, 19) : 'En curso'})
              </span>
            </div>
          ))}
        </div>
      )}

      {mostrarModalInactividad && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4231,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: 24,
              borderRadius: 12,
              maxWidth: 400,
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18 }}>Sesión inactiva</h3>
            <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 20 }}>
              Te hemos desconectado por inactividad. Para seguir usando el marcador, debes reconectar tu sesión en tiempo real.
            </p>

            <button
              onClick={handleReconectarWS}
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                border: 'none',
                background: '#10b981',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reconectar ahora
            </button>
          </div>
        </div>
      )}


    </div>
  );
}

const styles = {
  container: { padding: 24, maxWidth: 900, margin: '0 auto', background: 'var(--bg)', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--text)' },
  subtitle: { margin: '4px 0 0 0', fontSize: 14, color: 'var(--text-secondary)' },
  conexionStatus: { display: 'flex', alignItems: 'center', padding: '8px 16px', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)' },
  mainCard: { background: 'var(--surface)', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px var(--shadow)', marginBottom: 24 },
  relojPrincipal: { borderRadius: 12, padding: 40, textAlign: 'center', marginBottom: 32, position: 'relative' },
  estadoBadge: { display: 'inline-block', padding: '8px 24px', borderRadius: 20, color: 'white', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24 },
  relojDisplay: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  controlesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  btnControl: { padding: '16px 24px', border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, transition: 'all 0.2s', color: 'white' },
  btnIniciar: { background: 'linear-gradient(135deg, #10b981, #059669)', gridColumn: '1 / -1' },
  btnBreak: { background: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  btnAlmuerzo: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  btnDisponible: { background: 'linear-gradient(135deg, #10b981, #059669)', gridColumn: '1 / -1' },
  btnFinalizar: { background: 'linear-gradient(135deg, #ef4444, #dc2626)', gridColumn: '1 / -1' },
  resumenCard: { background: 'var(--surface)', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px var(--shadow)' },
  resumenTitle: { margin: '0 0 20px 0', fontSize: 18, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 },
  resumenGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 20 },
  resumenItem: { display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' },
  resumenLabel: { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' },
  resumenValor: { fontSize: 20, fontWeight: 700, color: 'var(--text)' },
  estadoMini: { fontSize: 14, fontWeight: 600, padding: '4px 12px', borderRadius: 12, textAlign: 'center' },
  breaksList: { marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' },
  breaksTitle: { margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase' },
  breakItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, marginBottom: 8, fontSize: 14, color: 'var(--text)' },
};