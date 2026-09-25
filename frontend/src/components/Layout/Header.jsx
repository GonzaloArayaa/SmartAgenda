import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Header() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <header className="header">
      <div className="header-context">
        <span>ESPACIO PROFESIONAL</span>
        <div className="header-welcome">
          <h1>Hola, {user?.nombre}</h1>
          <p><i className="far fa-calendar" /> {today}</p>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="header-icon-btn"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          onClick={toggleTheme}
          style={{ fontSize: '1.1rem' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="header-icon-btn" title="Notificaciones">
          <i className="fas fa-bell"></i>
        </button>
        <button className="header-icon-btn" title="Perfil">
          <i className="fas fa-user"></i>
        </button>
      </div>
    </header>
  );
}
