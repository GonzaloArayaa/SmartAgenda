import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logoSmartAgendaDark from '../assets/smartagenda-logo-dark.png';

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
    <div className="auth-page login-page">
      <button className="theme-toggle-fixed" onClick={toggleTheme} title="Cambiar tema">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="auth-split">
        <div className="auth-panel-left">
          <Link to="/" className="auth-brand"><img src={logoSmartAgendaDark} alt="SmartAgenda Pro" /></Link>
          <div className="auth-panel-quote">
            <span className="login-eyebrow">TU AGENDA, EN ORDEN</span>
            <h2>Volvé a enfocarte en atender, no en coordinar.</h2>
            <p>Turnos, clientes y servicios en un solo lugar.</p>
          </div>
          <div className="auth-panel-bubbles">
            <div className="auth-bubble"><i className="fas fa-scissors" /> Peluquería</div>
            <div className="auth-bubble"><i className="fas fa-paw" /> Veterinaria</div>
            <div className="auth-bubble"><i className="fas fa-tooth" /> Odontología</div>
            <div className="auth-bubble"><i className="fas fa-dumbbell" /> Gimnasio</div>
          </div>
        </div>

        <div className="auth-panel-right">
          <div className="auth-form-container">
            <span className="login-form-kicker">BIENVENIDO DE NUEVO</span>
            <h1 className="auth-title">Iniciar sesión</h1>
            <p className="auth-subtitle">Ingresá tus datos para abrir tu agenda.</p>

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

            <div className="auth-demo login-demo">
              <div><i className="fas fa-flask" /><strong> Accesos de demostración</strong></div>
              <p><b>Administrador</b><span>admin@smartagenda.com · admin123</span></p>
              <p><b>Profesional</b><span>martinez@smartagenda.com · prof123</span></p>
              <p><b>Cliente</b><span>juanperez@smartagenda.com · cliente123</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
