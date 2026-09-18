import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="landing-page">
      {/* NAVBAR */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="landing-nav-icon">📅</div>
          <span>SmartAgenda Pro</span>
        </div>
        <div className="landing-nav-links">
          <a href="#features">Funciones</a>
          <a href="#rubros">Rubros</a>
          <a href="#contacto">Contacto</a>
        </div>
        <div className="landing-nav-actions">
          <button className="theme-toggle" onClick={toggleTheme} title="Cambiar tema">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link to="/login" className="btn-nav-login">Iniciar sesión</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-text">
          <h1>Gestioná tus turnos<br />de cualquier rubro,<br />en un solo lugar</h1>
          <p>Ideal para peluquerías, veterinarias, clínicas,<br />gimnasios, odontólogos y más.</p>
          <div className="landing-hero-btns">
            <Link to="/register" className="btn-hero-primary">Comenzar ahora</Link>
            <Link to="/login" className="btn-hero-secondary">Ver demo</Link>
          </div>
        </div>
        <div className="landing-hero-visual">
          <div className="hero-calendar">
            <div className="hero-cal-header">
              <span>◀</span>
              <strong>Junio 2025</strong>
              <span>▶</span>
            </div>
            <div className="hero-cal-grid">
              {['L','M','X','J','V','S','D'].map(d => (
                <div key={d} className="hero-cal-day-label">{d}</div>
              ))}
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className={`hero-cal-day ${i === 14 ? 'active' : ''} ${[2,8,19,25].includes(i) ? 'has-event' : ''}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
          <div className="hero-badge hero-badge-1">✂️ Peluquería 14:00</div>
          <div className="hero-badge hero-badge-2">🐾 Vet. 10:30</div>
          <div className="hero-badge hero-badge-3">🦷 Odonto 16:00</div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-features" id="features">
        <div className="landing-feature">
          <span className="feature-icon">⚡</span>
          <strong>Rápido</strong>
        </div>
        <div className="landing-feature">
          <span className="feature-icon">🎯</span>
          <strong>Fácil</strong>
        </div>
        <div className="landing-feature">
          <span className="feature-icon">🔒</span>
          <strong>Seguro</strong>
        </div>
        <div className="landing-feature">
          <span className="feature-icon">🗂️</span>
          <strong>MultiRubro</strong>
        </div>
      </section>

      {/* RUBROS */}
      <section className="landing-rubros" id="rubros">
        <h2>Un sistema para todos los rubros</h2>
        <div className="rubros-grid">
          {[
            { icon: '✂️', name: 'Peluquería / Barbería' },
            { icon: '🐾', name: 'Veterinaria' },
            { icon: '🩺', name: 'Clínica / Consultorio' },
            { icon: '🦷', name: 'Odontología' },
            { icon: '🏋️', name: 'Gimnasio / Fitness' },
            { icon: '🌸', name: 'Masajes / Kinesiología' },
          ].map((r) => (
            <div key={r.name} className="rubro-card">
              <span className="rubro-icon">{r.icon}</span>
              <span>{r.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <h2>¿Listo para organizar tu agenda?</h2>
        <p>Unite a cientos de profesionales que ya usan SmartAgenda Pro</p>
        <Link to="/register" className="btn-hero-primary">Crear cuenta gratis</Link>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <p>© 2025 SmartAgenda Pro · Todos los derechos reservados</p>
      </footer>
    </div>
  );
}
