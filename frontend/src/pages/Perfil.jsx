import { useEffect, useRef, useState } from 'react';
import { perfil, reportes } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { validarFoto } from '../utils/foto';

export default function Perfil() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    nombreNegocio: user?.nombreNegocio || '',
    localidad: user?.localidad || '',
    rubro: user?.nombreRubro || user?.rubro || '',
    idRubro: user?.idRubro || '',
    descripcion: user?.descripcion || '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [rubros, setRubros] = useState([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState('');
  const inputFoto = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([perfil.get(), reportes.getRubros()])
      .then(([data, availableRubros]) => {
        setRubros(availableRubros);
        if (!active) return;
        setForm({
          nombre: data.nombre || '', apellido: data.apellido || '',
          email: data.email || '', telefono: data.telefono || '',
          nombreNegocio: data.nombreNegocio || '', localidad: data.localidad || '',
          rubro: data.nombreRubro || '', idRubro: data.idRubro || '',
          descripcion: data.descripcion || '',
        });
      })
      .catch((err) => { if (active) setError(err.message || 'No pudimos cargar el perfil.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setToast('');
    try {
      const result = await perfil.update({
        nombre: form.nombre, apellido: form.apellido, telefono: form.telefono,
        ...(user?.rol === 'Profesional' ? { nombreNegocio: form.nombreNegocio, localidad: form.localidad, descripcion: form.descripcion, idRubro: form.idRubro } : {}),
      });
      updateUser(result.user);
      setToast(result.message || 'Perfil actualizado correctamente.');
    } catch (err) {
      setError(err.message || 'No pudimos guardar el perfil.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFoto(event) {
    const archivo = event.target.files?.[0];
    event.target.value = ''; // permite elegir de nuevo el mismo archivo
    if (!archivo) return;
    const problema = validarFoto(archivo);
    if (problema) { setErrorFoto(problema); return; }
    setSubiendoFoto(true);
    setErrorFoto('');
    setToast('');
    try {
      const result = await perfil.subirFoto(archivo);
      updateUser(result.user);
      setToast(result.message);
    } catch (err) {
      setErrorFoto(err.message === 'Failed to fetch' ? 'No pudimos subir la foto. Revisá tu conexión.' : err.message || 'No pudimos subir la foto.');
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function handleQuitarFoto() {
    setSubiendoFoto(true);
    setErrorFoto('');
    setToast('');
    try {
      const result = await perfil.quitarFoto();
      updateUser(result.user);
      setToast(result.message);
    } catch (err) {
      setErrorFoto(err.message || 'No pudimos quitar la foto.');
    } finally {
      setSubiendoFoto(false);
    }
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

      {loading && <div className="module-inline-message">Cargando tus datos...</div>}
      {error && <div className="auth-error" role="alert">{error}</div>}
      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <i className="fas fa-check-circle"></i> {toast}
          </div>
        </div>
      )}

      <div className="profile-layout">
        <aside className="profile-identity-card">
          <Avatar className="profile-avatar" idUsuario={user?.idUsuario} fotoVersion={user?.fotoVersion} nombre={form.nombre} apellido={form.apellido} />
          <div className="profile-photo-actions">
            <input ref={inputFoto} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFoto} aria-label="Elegir foto de perfil" />
            <button type="button" className="profile-photo-btn" onClick={() => inputFoto.current?.click()} disabled={subiendoFoto}>
              <i className={`fas ${subiendoFoto ? 'fa-spinner fa-spin' : 'fa-camera'}`} /> {subiendoFoto ? 'Subiendo…' : user?.fotoVersion ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {user?.fotoVersion && <button type="button" className="profile-photo-remove" onClick={handleQuitarFoto} disabled={subiendoFoto}>Quitar</button>}
            <small>JPG, PNG o WebP · hasta 2 MB</small>
          </div>
          {errorFoto && <p className="profile-photo-error" role="alert"><i className="fas fa-exclamation-circle" /> {errorFoto}</p>}
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
                  <label className="form-label">Localidad</label>
                  <input
                    type="text"
                    name="localidad"
                    className="form-input"
                    placeholder="Ej.: Godoy Cruz"
                    maxLength={100}
                    required
                    value={form.localidad}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rubro</label>
                  <select name="idRubro" value={form.idRubro} onChange={handleChange} className="form-input" required>
                    <option value="">Seleccioná un rubro</option>
                    {rubros.map((item) => <option key={item.idRubro} value={item.idRubro}>{item.nombre}</option>)}
                  </select>
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

            <div className="profile-form-actions"><span>Los cambios se aplicarán a tu perfil.</span><button type="submit" className="module-primary-btn" disabled={saving || loading}>
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
