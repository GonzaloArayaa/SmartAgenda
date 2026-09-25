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

  const camposCompletos = [form.nombre, form.apellido, form.email, form.telefono, form.nombreNegocio, form.descripcion].filter(Boolean).length;
  const completitud = Math.round((camposCompletos / 6) * 100);

  return (
    <div className="profile-page pro-module-page">
      <section className="module-hero profile-module-hero">
        <div>
          <span className="module-kicker">IDENTIDAD PROFESIONAL</span>
          <h2>Perfil</h2>
          <p>Mantené actualizados tus datos personales y la información de tu negocio.</p>
        </div>
        <div className="profile-completion"><span>Perfil completo</span><strong>{completitud}%</strong><div><i style={{ width:`${completitud}%` }} /></div></div>
      </section>

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <i className="fas fa-check-circle"></i> {toast}
          </div>
        </div>
      )}

      <div className="profile-layout">
        <aside className="profile-identity-card">
          <div className="profile-avatar">{getInitials()}</div>
          <span className="profile-status"><i className="fas fa-circle" /> CUENTA ACTIVA</span>
          <h3>{form.nombre} {form.apellido}</h3>
          <p>{form.email}</p>
          <div className="profile-role"><i className="fas fa-briefcase" /><div><span>Tipo de cuenta</span><strong>{user?.rol}</strong></div></div>
          {form.nombreNegocio && <div className="profile-role"><i className="fas fa-store" /><div><span>Negocio</span><strong>{form.nombreNegocio}</strong></div></div>}
          <div className="profile-security-note"><i className="fas fa-shield-alt" /><span>Tu email funciona como identificación de acceso.</span></div>
        </aside>

        <section className="profile-form-card">
          <header><div><span>DATOS DE LA CUENTA</span><h3>Información personal</h3></div><i className="far fa-user" /></header>

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
              <label className="form-label">Email de acceso</label>
              <input
                type="email"
                name="email"
                value={form.email}
                readOnly
                className="form-input profile-readonly"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
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
                <div className="profile-form-divider"><span>INFORMACIÓN PROFESIONAL</span></div>
                <div className="form-group">
                  <label className="form-label">Nombre del negocio</label>
                  <input
                    type="text"
                    name="nombreNegocio"
                    className="form-input"
                    value={form.nombreNegocio}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rubro</label>
                  <input
                    type="text"
                    name="rubro"
                    value={form.rubro}
                    readOnly
                    className="form-input profile-readonly"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción profesional</label>
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

            <div className="profile-form-actions"><span>Los cambios se aplicarán a tu perfil.</span><button type="submit" className="module-primary-btn" disabled={saving}>
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
              ) : (
                <><i className="fas fa-save"></i> Guardar Cambios</>
              )}
            </button></div>
          </form>
        </section>
      </div>
    </div>
  );
}
