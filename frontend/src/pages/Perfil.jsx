import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Perfil() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    nombreNegocio: user?.nombreNegocio || '',
    rubro: user?.nombreRubro || user?.rubro || '',
    descripcion: user?.descripcion || '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToast('Perfil actualizado correctamente.');
      setTimeout(() => setToast(''), 3000);
    }, 800);
  }

  function getInitials() {
    return ((form.nombre?.[0] || '') + (form.apellido?.[0] || '')).toUpperCase();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2><i className="fas fa-user-circle"></i> Mi Perfil</h2>
          <p>Consultá y editá tu información personal.</p>
        </div>
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <i className="fas fa-check-circle"></i> {toast}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start' }}>
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'var(--gradient)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: '700',
            color: 'white',
            margin: '0 auto 16px',
            boxShadow: '0 8px 30px rgba(108, 99, 255, 0.3)',
          }}>
            {getInitials()}
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px' }}>
            {form.nombre} {form.apellido}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
            {form.email}
          </p>
          <span className={`badge badge-${user?.rol === 'Administrador' ? 'confirmado' : user?.rol === 'Profesional' ? 'pendiente' : 'finalizado'}`}>
            {user?.rol}
          </span>
        </div>

        <div className="card">
          <h3 className="section-title" style={{ marginBottom: '24px' }}>
            <i className="fas fa-edit"></i> Información Personal
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  className="form-input"
                  value={form.nombre}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido</label>
                <input
                  type="text"
                  name="apellido"
                  className="form-input"
                  value={form.apellido}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-envelope"></i> Email
              </label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={form.email}
                readOnly
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-phone"></i> Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                className="form-input"
                placeholder="+54 9 11 1234-5678"
                value={form.telefono}
                onChange={handleChange}
              />
            </div>

            {user?.rol === 'Profesional' && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    <i className="fas fa-store"></i> Nombre del Negocio
                  </label>
                  <input
                    type="text"
                    name="nombreNegocio"
                    className="form-input"
                    value={form.nombreNegocio}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <i className="fas fa-briefcase"></i> Rubro
                  </label>
                  <input
                    type="text"
                    name="rubro"
                    className="form-input"
                    value={form.rubro}
                    readOnly
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <i className="fas fa-align-left"></i> Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    className="form-textarea"
                    value={form.descripcion}
                    onChange={handleChange}
                    placeholder="Describí tu negocio..."
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
              ) : (
                <><i className="fas fa-save"></i> Guardar Cambios</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
