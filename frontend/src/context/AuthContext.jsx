import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    const cerrarSesionVencida = () => setUser(null);
    window.addEventListener('smartagenda:sesion-vencida', cerrarSesionVencida);
    return () => window.removeEventListener('smartagenda:sesion-vencida', cerrarSesionVencida);
  }, []);

  async function checkAuth() {
    try {
      const data = await auth.check();
      if (data.authenticated) {
        setUser(data.user);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, contrasena) {
    const data = await auth.login(email, contrasena);
    setUser(data.user);
    return data;
  }

  async function register(formData) {
    const data = await auth.register(formData);
    return data;
  }

  async function logout() {
    await auth.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
