import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/index';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Restore session from localStorage on first mount
  useEffect(() => {
    const token    = localStorage.getItem('staffsync_token');
    const cached   = localStorage.getItem('staffsync_user');

    if (token && cached) {
      try {
        setUser(JSON.parse(cached));
      } catch { /* corrupted cache */ }
      // Re-validate token with server
      authService.getMe()
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('staffsync_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          // Token invalid / expired
          localStorage.removeItem('staffsync_token');
          localStorage.removeItem('staffsync_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    const res = await authService.login({ email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('staffsync_token', token);
    localStorage.setItem('staffsync_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    localStorage.removeItem('staffsync_token');
    localStorage.removeItem('staffsync_user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.getMe();
      setUser(res.data.user);
      localStorage.setItem('staffsync_user', JSON.stringify(res.data.user));
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refreshUser, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
