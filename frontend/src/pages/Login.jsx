import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !contrasena.trim()) {
      setError('Por favor completá todos los campos.');
      return;
    }
    setLoading(true);
    try {
      await login(email, contrasena);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Verificá tus credenciales.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <button className="theme-toggle-fixed" onClick={toggleTheme} title="Cambiar tema">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="auth-split">
        <div className="auth-panel-left">
          <Link to="/" className="auth-brand">
            <div className="auth-brand-icon">📅</div>
            <span>SmartAgenda Pro</span>
          </Link>
          <div className="auth-panel-quote">
            <h2>Gestioná tu agenda profesional con facilidad</h2>
            <p>Turnos, clientes y servicios en un solo lugar.</p>
          </div>
          <div className="auth-panel-bubbles">
            <div className="auth-bubble">✂️ Peluquería</div>
            <div className="auth-bubble">🐾 Veterinaria</div>
            <div className="auth-bubble">🦷 Odontología</div>
            <div className="auth-bubble">🏋️ Gimnasio</div>
          </div>
        </div>

        <div className="auth-panel-right">
          <div className="auth-form-container">
            <h1 className="auth-title">Iniciar sesión</h1>
            <p className="auth-subtitle">Ingresá tus datos para continuar</p>

            {error && (
              <div className="auth-error">
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>Email</label>
                <div className="auth-input-wrap">
                  <i className="fas fa-envelope auth-input-icon"></i>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>Contraseña</label>
                <div className="auth-input-wrap">
                  <i className="fas fa-lock auth-input-icon"></i>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-input-toggle"
                    onClick={() => setShowPass(s => !s)}
                  >
                    <i className={`fas fa-eye${showPass ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading
                  ? <><i className="fas fa-spinner fa-spin"></i> Ingresando...</>
                  : 'Iniciar Sesión'
                }
              </button>
            </form>

            <p className="auth-switch">
              ¿No tenés cuenta? <Link to="/register">Registrate aquí</Link>
            </p>

            <div className="auth-demo">
              <p><strong>Demo:</strong></p>
              <p>Admin: admin@smartagenda.com / admin123</p>
              <p>Profesional: martinez@smartagenda.com / prof123</p>
              <p>Cliente: juanperez@smartagenda.com / cliente123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
