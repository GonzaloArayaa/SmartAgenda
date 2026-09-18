import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { reportes } from '../services/api';

// Step 1: choose account type
function StepTipo({ onSelect }) {
  return (
    <div className="auth-form-container">
      <h1 className="auth-title">Crear cuenta</h1>
      <p className="auth-subtitle">¿Cómo vas a usar SmartAgenda Pro?</p>
      <div className="register-tipo-grid">
        <button className="register-tipo-card" onClick={() => onSelect('Cliente')}>
          <span className="register-tipo-icon">👤</span>
          <strong>Cliente</strong>
          <p>Buscá y reservá turnos con profesionales</p>
        </button>
        <button className="register-tipo-card" onClick={() => onSelect('Profesional')}>
          <span className="register-tipo-icon">💼</span>
          <strong>Profesional</strong>
          <p>Gestioná tu agenda, servicios y clientes</p>
        </button>
      </div>
      <p className="auth-switch">
        ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </div>
  );
}

// Step 2 for Profesional: choose rubro
const RUBROS_VISUALES = [
  {
    icon: '✂️',
    label: 'Peluquería/\nBarbería',
    key: 'peluqueria',
    img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80',
  },
  {
    icon: '🐾',
    label: 'Veterinaria',
    key: 'veterinaria',
    img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80',
  },
  {
    icon: '🩺',
    label: 'Clínica/\nConsultorio',
    key: 'clinica',
    img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80',
  },
  {
    icon: '🦷',
    label: 'Odontología',
    key: 'odontologia',
    img: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=400&q=80',
  },
  {
    icon: '🏋️',
    label: 'Gimnasio/\nFitness',
    key: 'gimnasio',
    img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  },
  {
    icon: '🌸',
    label: 'Masajes/\nKinesiología',
    key: 'masajes',
    img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80',
  },
  {
    icon: '🗂️',
    label: 'Otro',
    key: 'otro',
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80',
  },
];

function RubroCard({ rubro, selected, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className={`register-rubro-card${selected ? ' selected' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Imagen de fondo con fade */}
      <div
        className="rubro-card-bg"
        style={{
          backgroundImage: `url(${rubro.img})`,
          opacity: hovered || selected ? 1 : 0,
        }}
      />
      {/* Overlay para legibilidad */}
      <div
        className="rubro-card-overlay"
        style={{ opacity: hovered || selected ? 1 : 0 }}
      />
      {/* Contenido */}
      <span className="rubro-card-icon">{rubro.icon}</span>
      <small style={{ whiteSpace: 'pre-line' }}>{rubro.label}</small>
      {selected && <span className="rubro-card-check">✓</span>}
    </button>
  );
}

function StepRubro({ onSelect, onBack }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className="auth-form-container">
      <button className="auth-back-btn" onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Volver
      </button>
      <h1 className="auth-title">¿Qué tipo de negocio gestionás?</h1>
      <p className="auth-subtitle">Seleccioná una opción (podés cambiarla después)</p>
      <div className="register-rubro-grid">
        {RUBROS_VISUALES.map((r) => (
          <RubroCard
            key={r.key}
            rubro={r}
            selected={selected === r.key}
            onClick={() => setSelected(r.key)}
          />
        ))}
      </div>
      <button
        className="auth-btn-primary"
        disabled={!selected}
        onClick={() => onSelect(selected)}
        style={{ marginTop: '20px' }}
      >
        Continuar
      </button>
    </div>
  );
}

// Step 3: fill data form
function StepForm({ rol, rubro, rubrosApi, error, loading, onSubmit, onBack }) {
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', telefono: '',
    contrasena: '', confirmarContrasena: '',
    nombreNegocio: '', idRubro: '', descripcion: '',
  });
  const [showPass, setShowPass] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="auth-form-container" style={{ maxWidth: '480px' }}>
      <button className="auth-back-btn" onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Volver
      </button>
      <h1 className="auth-title">Completá tus datos</h1>
      <p className="auth-subtitle">
        {rol === 'Profesional' ? `Cuenta Profesional · ${rubro}` : 'Cuenta Cliente'}
      </p>

      {error && (
        <div className="auth-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field-row">
          <div className="auth-field">
            <label>Nombre *</label>
            <div className="auth-input-wrap">
              <i className="fas fa-user auth-input-icon"></i>
              <input name="nombre" placeholder="Juan" value={form.nombre} onChange={handleChange} />
            </div>
          </div>
          <div className="auth-field">
            <label>Apellido *</label>
            <div className="auth-input-wrap">
              <i className="fas fa-user auth-input-icon"></i>
              <input name="apellido" placeholder="Pérez" value={form.apellido} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="auth-field">
          <label>Email *</label>
          <div className="auth-input-wrap">
            <i className="fas fa-envelope auth-input-icon"></i>
            <input type="email" name="email" placeholder="tu@email.com" value={form.email} onChange={handleChange} />
          </div>
        </div>

        <div className="auth-field">
          <label>Teléfono</label>
          <div className="auth-input-wrap">
            <i className="fas fa-phone auth-input-icon"></i>
            <input type="tel" name="telefono" placeholder="+54 9 11 1234-5678" value={form.telefono} onChange={handleChange} />
          </div>
        </div>

        <div className="auth-field-row">
          <div className="auth-field">
            <label>Contraseña *</label>
            <div className="auth-input-wrap">
              <i className="fas fa-lock auth-input-icon"></i>
              <input
                type={showPass ? 'text' : 'password'}
                name="contrasena"
                placeholder="Mínimo 6 caracteres"
                value={form.contrasena}
                onChange={handleChange}
              />
              <button type="button" className="auth-input-toggle" onClick={() => setShowPass(s => !s)}>
                <i className={`fas fa-eye${showPass ? '-slash' : ''}`}></i>
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label>Confirmar *</label>
            <div className="auth-input-wrap">
              <i className="fas fa-lock auth-input-icon"></i>
              <input
                type={showPass ? 'text' : 'password'}
                name="confirmarContrasena"
                placeholder="Repetí la contraseña"
                value={form.confirmarContrasena}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {rol === 'Profesional' && (
          <>
            <div className="auth-field">
              <label>Nombre del Negocio *</label>
              <div className="auth-input-wrap">
                <i className="fas fa-store auth-input-icon"></i>
                <input name="nombreNegocio" placeholder="Mi Consultorio" value={form.nombreNegocio} onChange={handleChange} />
              </div>
            </div>

            {rubrosApi.length > 0 && (
              <div className="auth-field">
                <label>Rubro (detallado)</label>
                <div className="auth-input-wrap">
                  <i className="fas fa-briefcase auth-input-icon"></i>
                  <select name="idRubro" value={form.idRubro} onChange={handleChange} style={{ paddingLeft: '44px' }}>
                    <option value="">Seleccionar...</option>
                    {rubrosApi.map(r => (
                      <option key={r.idRubro} value={r.idRubro}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="auth-field">
              <label>Descripción</label>
              <textarea
                name="descripcion"
                className="auth-textarea"
                placeholder="Describí tu negocio o servicios..."
                value={form.descripcion}
                onChange={handleChange}
              />
            </div>
          </>
        )}

        <button type="submit" className="auth-btn-primary" disabled={loading}>
          {loading
            ? <><i className="fas fa-spinner fa-spin"></i> Registrando...</>
            : <><i className="fas fa-user-plus"></i> Crear Cuenta</>
          }
        </button>
      </form>

      <p className="auth-switch">
        ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </div>
  );
}

export default function Register() {
  const [step, setStep] = useState('tipo'); // 'tipo' | 'rubro' | 'form'
  const [rol, setRol] = useState(null);
  const [rubro, setRubro] = useState(null);
  const [rubrosApi, setRubrosApi] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRubros() {
      try {
        const data = await reportes.getRubros();
        setRubrosApi(Array.isArray(data) ? data : data.rubros || []);
      } catch {
        setRubrosApi([]);
      }
    }
    fetchRubros();
  }, []);

  function handleTipoSelect(tipo) {
    setRol(tipo);
    if (tipo === 'Profesional') {
      setStep('rubro');
    } else {
      setStep('form');
    }
  }

  function handleRubroSelect(r) {
    setRubro(r);
    setStep('form');
  }

  async function handleSubmit(form) {
    setError('');
    if (!form.nombre.trim() || !form.apellido.trim() || !form.email.trim() || !form.contrasena.trim()) {
      setError('Completá todos los campos obligatorios.'); return;
    }
    if (form.contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.'); return;
    }
    if (form.contrasena !== form.confirmarContrasena) {
      setError('Las contraseñas no coinciden.'); return;
    }
    if (rol === 'Profesional' && !form.nombreNegocio.trim()) {
      setError('El nombre del negocio es obligatorio para profesionales.'); return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre, apellido: form.apellido,
        email: form.email, telefono: form.telefono,
        contrasena: form.contrasena, rol,
      };
      if (rol === 'Profesional') {
        payload.nombreNegocio = form.nombreNegocio;
        payload.idRubro = form.idRubro;
        payload.descripcion = form.descripcion;
      }
      await register(payload);
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Error al registrarse.');
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
            <h2>Unite a miles de profesionales que ya organizan su agenda</h2>
            <p>Gratis para empezar. Sin tarjeta de crédito.</p>
          </div>
          <div className="auth-panel-steps">
            <div className={`auth-step${step === 'tipo' ? ' active' : ''}`}>
              <span>1</span> Elegí tu tipo de cuenta
            </div>
            {rol === 'Profesional' && (
              <div className={`auth-step${step === 'rubro' ? ' active' : ''}`}>
                <span>2</span> Seleccioná tu rubro
              </div>
            )}
            <div className={`auth-step${step === 'form' ? ' active' : ''}`}>
              <span>{rol === 'Profesional' ? '3' : '2'}</span> Completá tus datos
            </div>
          </div>
        </div>

        <div className="auth-panel-right">
          {step === 'tipo' && <StepTipo onSelect={handleTipoSelect} />}
          {step === 'rubro' && (
            <StepRubro onSelect={handleRubroSelect} onBack={() => setStep('tipo')} />
          )}
          {step === 'form' && (
            <StepForm
              rol={rol}
              rubro={rubro}
              rubrosApi={rubrosApi}
              error={error}
              loading={loading}
              onSubmit={handleSubmit}
              onBack={() => rol === 'Profesional' ? setStep('rubro') : setStep('tipo')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
