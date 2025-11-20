// src/lib/workforce.js
import { api } from './api';

// ---------------------------------------------
//  🔐 Autenticación
// ---------------------------------------------
export async function login(credentials) {
  try {
    return await api.post('/login/', credentials);
  } catch (err) {
    console.error('[Workforce] Error al iniciar sesión:', err);
    throw err;
  }
}

// ---------------------------------------------
//  👥 Asesores/Usuarios
// ---------------------------------------------

// GET /asesores/?id_cargo=123
export async function getAsesoresPorCargo(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const path = queryString ? `/asesores/?${queryString}` : '/asesores/';
    return await api.get(path);
  } catch (err) {
    console.error('[Workforce] Error al obtener asesores por cargo:', err);
    throw err;
  }
}

// POST /asesores/ { id_sede: string }  ← (según tu backend actual)
export async function getAsesoresPorSede(data) {
  try {
    return await api.post('/asesores/', data);
  } catch (err) {
    console.error('[Workforce] Error al obtener asesores por sede:', err);
    throw err;
  }
}

// ---------------------------------------------
//  🕐 Horarios
// ---------------------------------------------
export async function crearHorario(data) {
  try {
    return await api.post('/horarios/', data);
  } catch (err) {
    console.error('[Workforce] Error al crear horario:', err);
    throw err;
  }
}

export async function getHorarios(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const path = query ? `/horarios/?${query}` : '/horarios/';
    return await api.get(path);
  } catch (err) {
    console.error('[Workforce] Error al obtener horarios:', err);
    throw err;
  }
}

export async function getHorarioPorId(id) {
  try {
    return await api.get(`/horarios/${id}/`);
  } catch (err) {
    console.error('[Workforce] Error al obtener horario:', err);
    throw err;
  }
}

export async function actualizarHorario(id, data) {
  try {
    return await api.put(`/horarios/${id}/`, data);
  } catch (err) {
    console.error('[Workforce] Error al actualizar horario:', err);
    throw err;
  }
}

export async function eliminarHorario(id) {
  try {
    return await api.delete(`/horarios/${id}/`);
  } catch (err) {
    console.error('[Workforce] Error al eliminar horario:', err);
    throw err;
  }
}

// ---------------------------------------------
//  📋 Solicitudes
// ---------------------------------------------
export async function getSolicitudes(params = {}) {
  try {
    const user = (() => {
      try { return JSON.parse(localStorage.getItem('user') || '{}'); }
      catch { return {}; }
    })();

    const norm = { ...params };

    if (typeof norm.estado === 'string' && norm.estado.trim()) {
      const s = norm.estado.trim().toLowerCase();
      if (['pendiente', 'aprobado', 'rechazado'].includes(s)) {
        norm.estado = s.charAt(0).toUpperCase() + s.slice(1);
      }
    }

    if (norm.id_sede === undefined && user?.id_sede != null) {
      norm.id_sede = user.id_sede;
    }

    const cleanEntries = Object.entries(norm).filter(
      ([, v]) => v !== null && v !== undefined && String(v) !== ''
    );

    const query = new URLSearchParams(cleanEntries).toString();
    const path = query ? `/solicitudes/?${query}` : '/solicitudes/';

    return await api.get(path);
  } catch (err) {
    console.error('[Workforce] Error al obtener solicitudes:', err);
    throw err;
  }
}

export async function crearSolicitud(data) {
  try {
    return await api.post('/solicitudes/', data);
  } catch (err) {
    console.error('[Workforce] Error al crear solicitud:', err);
    throw err;
  }
}

export async function aprobarSolicitud(id, data = {}) {
  try {
    return await api.post(`/solicitudes/${id}/aprobar/`, data);
  } catch (err) {
    console.error('[Workforce] Error al aprobar solicitud:', err);
    throw err;
  }
}

export async function rechazarSolicitud(id, data) {
  try {
    return await api.post(`/solicitudes/${id}/rechazar/`, data);
  } catch (err) {
    console.error('[Workforce] Error al rechazar solicitud:', err);
    throw err;
  }
}

// ---------------------------------------------
//  📊 Exportación
// ---------------------------------------------
export async function exportarAsesores(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const path = query ? `/export/asesores?${query}` : '/export/asesores';
    
    const isDev = import.meta.env.DEV;
    const API_BASE = isDev
      ? '/api'
      : `${import.meta.env.VITE_BACKEND_HOST}${import.meta.env.VITE_API_BASE || ''}`;
    const APP_SECRET = import.meta.env.VITE_APP_SECRET || '';

    const base = API_BASE.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    const url = `${base}/${cleanPath}`.replace(/([^:]\/)\/+/g, '$1');

    const headers = { 'X-Distritec-App': APP_SECRET };

    const res = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
    if (!res.ok) throw new Error(`Error al exportar: HTTP ${res.status}`);
    return await res.blob();
  } catch (err) {
    console.error('[Workforce] Error al exportar asesores:', err);
    throw err;
  }
}

export function downloadFile(blob, filename = 'asesores.xlsx') {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ---------------------------------------------
//  📚 Catálogo de Estados (admin)
// ---------------------------------------------

// Lista todos los estados del catálogo
export async function getEstadoTipos(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `/estados/?${qs}` : '/estados/';
  return api.get(path);
}

export async function crearEstado(data) {
  return api.post('/estados/', data);
}

// PATCH para actualizaciones parciales


export async function actualizarEstado(id, data) {
  // return api.patch(`/estados/${id}/`, data);
  return api.put(`/estados/${id}/`, data); // ← workaround rápido
}


export async function eliminarEstado(id) {
  return api.delete(`/estados/${id}/`);
}

// ---------------------------------------------
//  ⚙️ Overrides / Config por Asesor (admin)
// ---------------------------------------------

// Lista overrides (filtra por ?asesor=ID o ?estado_id=ID)
export async function getEstadoConfigs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `/estado-config/?${qs}` : '/estado-config/';
  return api.get(path);
}

// Crea override { asesor, estado_id, activo, limite_minutos?, color_hex_override? }
export async function crearEstadoConfig(data) {
  return api.post('/estado-config/', data);
}

// PATCH para updates parciales
export async function actualizarEstadoConfig(id, data) {
  return api.patch(`/estado-config/${id}/`, data);  
}


export async function eliminarEstadoConfig(id) {
  return api.delete(`/estado-config/${id}/`);
}

// ---------------------------------------------
//  👤 Endpoints por Asesor (id_asesor externo)
// ---------------------------------------------

// Devuelve SIEMPRE: [{id, nombre, codigo, color_hex, limite_minutos, activo}]
// util interno para desempaquetar respuestas (axios / fetch / DRF paginado)
// src/lib/workforce.js
function unwrap(payload) {
  if (!payload) return null;
  const d = (payload && typeof payload === 'object' && 'data' in payload) ? payload.data : payload;
  if (d && typeof d === 'object' && Array.isArray(d.results)) return d.results; // DRF paginado
  if (Array.isArray(d)) return d;
  return d;
}

// Devuelve SIEMPRE una lista (aunque haya configs inactivas)
export async function getAsesorEstados(asesorId) {
  if (!asesorId) throw new Error('idAsesor es requerido');

  const res = await api.get(`/estado-config/?asesor=${encodeURIComponent(asesorId)}`);
  const rows = unwrap(res) ?? [];
  const arr = Array.isArray(rows) ? rows : [rows];

  // NO filtramos nada; solo normalizamos campos
  const list = arr.map(cfg => {
    const e = cfg?.estado ?? cfg;
    const color =
      (cfg?.color_hex_override && String(cfg.color_hex_override).trim()) ||
      e?.color_hex || e?.color || null;

    return {
      id: e?.id ?? cfg?.estado_id ?? cfg?.id,
      nombre: e?.nombre ?? e?.label ?? e?.codigo ?? e?.slug ?? 'Estado',
      codigo: (e?.slug ?? e?.codigo ?? e?.nombre ?? '').toString().toLowerCase(),
      color_hex: color,
      limite_minutos: e?.limite_minutos ?? cfg?.limite_minutos ?? null,
      activo_catalogo: e?.activo !== false,
      activo_config: cfg?.activo !== false,
      _raw_cfg: cfg,     // para depurar
      _raw_estado: e,    // para depurar
    };
  }).filter(x => x.id != null || x.codigo); // algo identificable

  // dedup por id/codigo
  const seen = new Set();
  const unique = list.filter(e => {
    const key = (e.id ?? e.codigo)?.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}



export async function transitionEstadoAsesor(asesorId, payload) {
  // payload: { estado: 'break'|'disponible'|'almuerzo'|'reunion'|'formacion'|'ingreso'|'salida', meta? }
  if (!asesorId) throw new Error('idAsesor es requerido');
  return api.post(`/asesores/${asesorId}/transiciones/`, payload);
}

export async function getAsesorStatus(asesorId) {
  if (!asesorId) throw new Error('idAsesor es requerido');
  return api.get(`/asesores/${asesorId}/status/`);
}

// Alias solicitado por el front legado (evita ReferenceError)
export async function getEstadoActualAsesor(asesorId) {
  return getAsesorStatus(asesorId);
}

export async function getAsesorJornada(asesorId, params = {}) {
  if (!asesorId) throw new Error('idAsesor es requerido');
  const qs = new URLSearchParams(params).toString();
  return api.get(`/asesores/${asesorId}/jornada/${qs ? `?${qs}` : ''}`);
}

// Utilidad para filtrar horarios por asesor (si tu backend lo soporta vía query)
export async function getHorariosPorAsesor(asesorId, params = {}) {
  const norm = { ...params, asesor_id: asesorId };
  const qs = new URLSearchParams(norm).toString();
  return api.get(`/horarios/?${qs}`);
}

export async function getEstadoConfigsPorAsesor(asesorId) {
  if (!asesorId) throw new Error('asesorId es requerido');
  return getEstadoConfigs({ asesor: asesorId });
}

export async function getHorarioActualAsesor(asesorId) {
  if (!asesorId) throw new Error('asesorId es requerido');
  try {
    // Llama al endpoint /api/asesores/<id>/horario-actual/
    const res = await api.get(`/asesores/${asesorId}/horario-actual/`);
    return res?.data ?? res; // devuelve directamente el objeto horario
  } catch (err) {
    console.error('[Workforce] Error al obtener horario actual del asesor:', err);
    throw err;
  }
}


export async function marcarEntrada(asesorId) {
  if (!asesorId) throw new Error('asesorId es requerido');
  try {
    const res = await api.post(`/asesores/${asesorId}/jornada/entrada/`);
    return res?.data ?? res;
  } catch (err) {
    console.error('[Workforce] Error al marcar entrada:', err);
    throw err;
  }
}

export async function marcarSalida(asesorId) {
  if (!asesorId) throw new Error('asesorId es requerido');
  try {
    const res = await api.post(`/asesores/${asesorId}/jornada/salida/`);
    return res?.data ?? res;
  } catch (err) {
    console.error('[Workforce] Error al marcar salida:', err);
    throw err;
  }
}


export async function getJornadaActual(asesorId) {
  if (!asesorId) throw new Error('asesorId es requerido');
  try {
    const res = await api.get(`/asesores/${asesorId}/jornada/`);
    return res?.data ?? res;
  } catch (err) {
    console.error('[Workforce] Error al obtener jornada actual:', err);
    throw err;
  }
}

export async function getHistorialAsesor(asesorId, fecha) {
  if (!asesorId) throw new Error('asesorId es requerido');
  const date = fecha || new Date().toISOString().split('T')[0];
  try {
    const res = await api.get(`/asesores/${asesorId}/historial/?date=${date}`);
    return res?.data ?? res;
  } catch (err) {
    console.error('[Workforce] Error al obtener historial del asesor:', err);
    throw err;
  }
}




// ---------------------------------------------
//  🎯 API combinada (sin duplicados)
// ---------------------------------------------
export const workforceApi = {
  // Auth
  login,

  // Asesores
  getAsesoresPorCargo,
  getAsesoresPorSede,

  // Horarios
  crearHorario,
  getHorarios,
  getHorarioPorId,
  actualizarHorario,
  eliminarHorario,

  // Solicitudes
  getSolicitudes,
  crearSolicitud,
  aprobarSolicitud,
  rechazarSolicitud,

  // Export
  exportarAsesores,
  downloadFile,

  // ===== Estados (catálogo) =====
  getEstadoTipos,
  crearEstado,
  actualizarEstado,
  eliminarEstado,

  // ===== Overrides por asesor =====
  getEstadoConfigs,
  crearEstadoConfig,
  actualizarEstadoConfig,
  eliminarEstadoConfig,

  // ===== Por asesor =====
  getAsesorEstados,
  transitionEstadoAsesor,
  getAsesorStatus,
  getEstadoActualAsesor,  // alias legacy
  getAsesorJornada,
  getHorariosPorAsesor,
  getHorarioActualAsesor,
  marcarEntrada,
  marcarSalida,
  getJornadaActual,
  getHistorialAsesor,

  // ── ALIAS de retrocompatibilidad ──
  getEstados: getEstadoTipos,                   // algunos componentes antiguos usan getEstados
  getEstadoConfig: getEstadoConfigs,            // singular → lista
  updateEstadoConfig: actualizarEstadoConfig,   // nombre viejo → función nueva
  getEstadoConfigsPorAsesor,
};
