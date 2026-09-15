import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('clinickg_token');
    const savedUser = localStorage.getItem('clinickg_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('clinickg_token');
        localStorage.removeItem('clinickg_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('clinickg_token', access_token);
    localStorage.setItem('clinickg_user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('clinickg_token');
    localStorage.removeItem('clinickg_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isDoctor: user?.role === 'doctor',
    isPatient: user?.role === 'patient',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
