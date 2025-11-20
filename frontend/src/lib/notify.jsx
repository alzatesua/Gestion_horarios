// src/lib/notify.jsx
import React from 'react';
import toast from 'react-hot-toast';

const ICONS = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️', neutral:'💬', loading:'⏳' };

const FN = {
  success: (m, o) => toast.success(m, o),
  error:   (m, o) => toast.error(m, o),
  warning: (m, o) => toast(m, { icon: ICONS.warning, ...o }),
  info:    (m, o) => toast(m, { icon: ICONS.info, ...o }),
  neutral: (m, o) => toast(m, { icon: ICONS.neutral, ...o }),
  loading: (m, o) => toast.loading(m, o),
};

export function notify(message, type = 'info', opts = {}) {
  const fn = FN[type] || FN.info;
  return fn(message, opts); // devuelve id
}

// alias con tu firma favorita
export function toastLite(message, type = 'info', opts = {}) {
  return notify(message, type, opts);
}

// atajos
export const notifySuccess = (m, o) => notify(m, 'success', o);
export const notifyError   = (m, o) => notify(m, 'error', o);
export const notifyWarn    = (m, o) => notify(m, 'warning', o);
export const notifyInfo    = (m, o) => notify(m, 'info', o);
export const notifyLoading = (m, o) => notify(m, 'loading', o);

export function notifyPromise(
  promise,
  { loading='Procesando…', success='Listo ', error='Algo falló ' } = {},
  opts = {}
) {
  return toast.promise(promise, { loading, success, error }, opts);
}

// 👇 exporta dismiss (lo estabas importando en AsignarHorarios)
export function dismiss(id) {
  if (id) toast.dismiss(id); else toast.dismiss();
}

// (opcional) toast “custom” con JSX
export function notifyAction({
  title,
  subtitle,
  type = 'info',
  actionText = 'OK',
  onAction = () => {},
  duration = 5000,
} = {}) {
  return toast.custom((t) => (
    <div
      style={{
        display: 'grid',
        gap: 6,
        minWidth: 260,
        maxWidth: 360,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--toast-bg, #111827)',
        color: 'var(--toast-fg, #fff)',
        boxShadow: '0 10px 30px rgba(0,0,0,.15)',
        opacity: t.visible ? 1 : 0,
        transform: `translateY(${t.visible ? 0 : -6}px)`,
        transition: 'all .2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{ICONS[type] || ICONS.info}</span>
        <strong style={{ fontWeight: 600 }}>{title}</strong>
      </div>
      {subtitle && <div style={{ opacity: .85, fontSize: 13 }}>{subtitle}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => { toast.dismiss(t.id); onAction(); }}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,.2)',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          {actionText}
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,.15)',
            background: 'transparent',
            color: 'inherit',
            opacity: .8,
            cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  ), { duration });
}
