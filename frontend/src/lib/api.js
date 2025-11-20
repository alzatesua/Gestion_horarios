const isDev = import.meta.env.DEV;

const API_BASE = isDev
  ? '/api' // usa proxy en desarrollo
  : `${import.meta.env.VITE_BACKEND_HOST}${import.meta.env.VITE_API_BASE || ''}`;

const APP_SECRET = import.meta.env.VITE_APP_SECRET || '';

function buildUrl(path) {
  // Limpia barras duplicadas
  const base = API_BASE.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${base}/${cleanPath}`.replace(/([^:]\/)\/+/g, '$1');
}



// Timeout helper: aborta si el servidor no responde en N ms
function fetchWithTimeout(url, options = {}, timeout = 10000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: El servidor no respondió')), timeout)
    ),
  ]);
}


// ---------------------------------------------
//  🚀 Función principal de request
// ---------------------------------------------

async function request(path, { method = 'GET', data, headers, timeout = 10000 } = {}) {
  const url = buildUrl(path);

  const baseHeaders = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  // En producción, agregamos el header secreto
  if (!isDev && APP_SECRET) {
    baseHeaders['X-Distritec-App'] = APP_SECRET;
  }

  if (isDev) console.debug('[API] →', method, url, data ? { ...data, clave: '***' } : '');

  try {
    const res = await fetchWithTimeout(
      url,
      {
        method,
        headers: baseHeaders,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'omit',

        // ⚙️ Ajustes para compatibilidad con Qt WebEngine (PySide)
        keepalive: false,
        cache: 'no-store',
        mode: 'cors',
      },
      timeout
    );

    const text = await res.text().catch(() => '');
    if (isDev) console.debug('[API] ←', res.status, text.slice(0, 150));

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(text || '{}');
        msg = json.detail || json.message || JSON.stringify(json);
      } catch {}
      const err = new Error(msg);
      err.status = res.status;
      err.response = text;
      throw err;
    }

    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? JSON.parse(text || '{}') : text;
  } catch (err) {
    if (err.status) throw err;

    const e = new Error(
      err.message?.includes('Timeout')
        ? 'El servidor no responde. Verifica que el backend esté corriendo.'
        : `Error de conexión: ${err.message}`
    );
    e.isNetworkError = true;
    throw e;
  }
}


// ---------------------------------------------
//  🌐 API pública
// ---------------------------------------------

export const api = {
  post: (p, d, o) => request(p, { method: 'POST', data: d, ...(o || {}) }),
  get: (p, o) => request(p, { method: 'GET', ...(o || {}) }),
  put: (p, d, o) => request(p, { method: 'PUT', data: d, ...(o || {}) }),
  patch: (p, d, o) => request(p, { method: 'PATCH', data: d, ...(o || {}) }), 
  delete: (p, o) => request(p, { method: 'DELETE', ...(o || {}) }),

  // 🔐 Login especializado
  login: async (creds) => {
    try {
      return await request('/login/', {
        method: 'POST',
        data: creds,
        timeout: 15000,
      });
    } catch (err) {
      if (err.status === 401) throw new Error('Usuario o contraseña incorrectos');
      if (err.status === 403) throw new Error(err.message || 'No autorizado');
      if (err.isNetworkError) throw new Error('No se puede conectar con el servidor.');
      throw err;
    }
  },
};