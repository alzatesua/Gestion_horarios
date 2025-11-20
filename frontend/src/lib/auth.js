import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); }
  catch { return {}; }
};
export const getAccessToken = () => localStorage.getItem('access') || '';
export const getRefreshToken = () => localStorage.getItem('refresh') || '';

export function useAuth({ requireAuth = true } = {}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
  const [access, setAccess] = useState(getAccessToken());
  const [refresh, setRefresh] = useState(getRefreshToken());

  // escucha cambios en localStorage (otra pestaña o logout)
  useEffect(() => {
    const onStorage = () => {
      setUser(getUser());
      setAccess(getAccessToken());
      setRefresh(getRefreshToken());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // redirige si hace falta login
  useEffect(() => {
    if (requireAuth && !access) {
      navigate('/login', { replace: true });
    }
  }, [requireAuth, access, navigate]);

  const isLoggedIn = useMemo(() => Boolean(access), [access]);

  return { user, accessToken: access, refreshToken: refresh, isLoggedIn };
}
