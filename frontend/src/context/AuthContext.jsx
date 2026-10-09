import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    auth.check()
      .then((data) => { if (active) setUser(data.authenticated ? data.user : null); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    const cerrarSesionVencida = () => setUser(null);
    window.addEventListener('smartagenda:sesion-vencida', cerrarSesionVencida);
    return () => {
      active = false;
      window.removeEventListener('smartagenda:sesion-vencida', cerrarSesionVencida);
    };
  }, []);

  async function login(email, contrasena) {
    const data = await auth.login(email, contrasena);
    setUser(data.user);
    return data;
  }

  async function register(formData) {
    const data = await auth.register(formData);
    return data;
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
  }

  async function logout() {
    await auth.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
