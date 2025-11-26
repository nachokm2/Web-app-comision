import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, loginRequest, logoutRequest } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider ({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function bootstrap () {
      try {
        const me = await getCurrentUser();
        setUser(me);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function login (credentials) {
    setError(null);
    try {
      const response = await loginRequest(credentials);
      setUser(response);
      return response;
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      throw err;
    }
  }

  async function logout () {
    await logoutRequest();
    setUser(null);
  }

  const value = { user, loading, error, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth () {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
