// src/lib/errorMessage.js
export function getErrorMessage(err, fallback = 'Ocurrió un error') {
  const data = err?.response?.data ?? err?.data ?? null;

  // { detail: '...' } (DRF)
  if (data && typeof data === 'object' && typeof data.detail === 'string') {
    return data.detail;
  }
  // { campo: ['msj1', 'msj2'], ... } o { campo: 'msj' }
  if (data && typeof data === 'object') {
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(' | ')}`);
      else if (typeof v === 'string') parts.push(`${k}: ${v}`);
    }
    if (parts.length) return parts.join('\n');
  }
  // texto plano
  if (typeof data === 'string' && data.trim()) return data;

  // error genérico de Axios/Fetch
  if (err?.message) return err.message;

  return fallback;
}
