import { useState, useEffect } from 'react';

const API = '/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/me`, { credentials: 'include' })
      .then((r) => {
        if (r.ok) return r.json();
        setUser(null);
        setLoading(false);
        return null;
      })
      .then((data) => {
        if (data) setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const logout = () => {
    return fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }).then(() =>
      setUser(null)
    );
  };

  return { user, loading, logout };
}

export function api(path, options = {}) {
  return fetch(`${API}${path}`, { ...options, credentials: 'include' });
}
