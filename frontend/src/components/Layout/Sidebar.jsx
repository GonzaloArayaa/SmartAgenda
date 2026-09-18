import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const rol = user?.rol;

  const menuItems = {
    Profesional: [
      { to: '/dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
      { to: '/servicios', icon: 'fa-briefcase', label: 'Servicios' },
      { to: '/disponibilidad', icon: 'fa-clock', label: 'Disponibilidad' },
      { to: '/agenda', icon: 'fa-calendar-alt', label: 'Agenda' },
      { to: '/reportes', icon: 'fa-chart-bar', label: 'Reportes' },
      { to: '/perfil', icon: 'fa-user-cog', label: 'Perfil' },
    ],
    Cliente: [
      { to: '/dashboard', icon: 'fa-home', label: 'Dashboard' },
      { to: '/buscar', icon: 'fa-search', label: 'Buscar Profesionales' },
      { to: '/mis-turnos', icon: 'fa-calendar-check', label: 'Mis Turnos' },
      { to: '/perfil', icon: 'fa-user-cog', label: 'Perfil' },
    ],
    Administrador: [
      { to: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { to: '/usuarios', icon: 'fa-users-cog', label: 'Usuarios' },
      { to: '/reportes', icon: 'fa-chart-bar', label: 'Reportes' },
      { to: '/perfil', icon: 'fa-user-cog', label: 'Perfil' },
    ],
  };

  const items = menuItems[rol] || [];
  const initials = user ? (user.nombre[0] + user.apellido[0]).toUpperCase() : '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">📅</div>
        <div>
          <h2>SmartAgenda Pro</h2>
          <span>Agenda Inteligente</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="sidebar-section">Menú Principal</p>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <i className={`fas ${item.icon}`}></i>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <p>{user?.nombre} {user?.apellido}</p>
          <span>{rol}</span>
        </div>
        <button className="sidebar-logout" onClick={logout} title="Cerrar sesión">
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </aside>
  );
}
