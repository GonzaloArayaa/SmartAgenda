import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { servicios } from '../services/api';

export default function Servicios() {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', duracionMin: '', precio: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchServicios() {
    setLoading(true);
    try {
      const data = await servicios.getByProfesional(user.idProfesional);
      setLista(Array.isArray(data) ? data : data.servicios || []);
    } catch {
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServicios();
  }, [user.idProfesional]);

  function openCreate() {
    setEditing(null);
    setForm({ nombre: '', descripcion: '', duracionMin: '', precio: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(servicio) {
    setEditing(servicio);
    setForm({
      nombre: servicio.nombre || '',
      descripcion: servicio.descripcion || '',
      duracionMin: servicio.duracionMin || '',
      precio: servicio.precio || '',
    });
    setError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setError('');
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim() || !form.duracionMin || !form.precio) {
      setError('Completá nombre, duración y precio.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await servicios.update({
          idServicio: editing.idServicio,
          idProfesional: user.idProfesional,
          nombre: form.nombre,
          descripcion: form.descripcion,
          duracionMin: Number(form.duracionMin),
          precio: Number(form.precio),
        });
      } else {
        await servicios.create({
          idProfesional: user.idProfesional,
          nombre: form.nombre,
          descripcion: form.descripcion,
          duracionMin: Number(form.duracionMin),
          precio: Number(form.precio),
        });
      }
      closeModal();
      fetchServicios();
    } catch (err) {
      setError(err.message || 'Error al guardar el servicio.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(servicio) {
    if (!window.confirm(`¿Estás seguro de eliminar "${servicio.nombre}"?`)) return;
    try {
      await servicios.delete(servicio.idServicio);
      fetchServicios();
    } catch (err) {
      alert(err.message || 'Error al eliminar el servicio.');
    }
  }

  if (loading) return <div className="spinner"></div>;

  const precioPromedio = lista.length ? lista.reduce((sum, s) => sum + Number(s.precio || 0), 0) / lista.length : 0;
  const duracionPromedio = lista.length ? Math.round(lista.reduce((sum, s) => sum + Number(s.duracionMin || 0), 0) / lista.length) : 0;

  return (
    <div className="services-page pro-module-page">
      <section className="module-hero">
        <div>
          <span className="module-kicker">CATÁLOGO PROFESIONAL</span>
          <h2>Servicios</h2>
          <p>Organizá lo que ofrecés, su duración y el valor de cada atención.</p>
        </div>
        <button className="module-primary-btn" onClick={openCreate}>
          <i className="fas fa-plus"></i> Nuevo servicio
        </button>
      </section>

      <section className="module-summary-strip">
        <div><span>Servicios activos</span><strong>{lista.length}</strong></div>
        <div><span>Duración promedio</span><strong>{duracionPromedio} min</strong></div>
        <div><span>Valor promedio</span><strong>${Math.round(precioPromedio).toLocaleString('es-AR')}</strong></div>
        <p><i className="fas fa-info-circle" /> Estos servicios aparecen al momento de reservar.</p>
      </section>

      {lista.length === 0 ? (
        <section className="module-empty-state"><div><i className="fas fa-briefcase" /></div><h3>Creá tu primer servicio</h3><p>Definí qué ofrecés para habilitar las reservas de tus clientes.</p><button onClick={openCreate}>Agregar servicio</button></section>
      ) : (
        <section className="service-catalog">
          <header><div><span>CATÁLOGO ACTIVO</span><h3>Servicios disponibles</h3></div><small>{lista.length} {lista.length === 1 ? 'servicio' : 'servicios'}</small></header>
          <div className="service-catalog-list">
            {lista.map((s, index) => (
              <article key={s.idServicio} className="service-row-card">
                <div className="service-row-number">{String(index + 1).padStart(2, '0')}</div>
                <div className="service-row-info"><h3>{s.nombre}</h3><p>{s.descripcion || 'Sin descripción agregada.'}</p></div>
                <div className="service-row-duration"><span>Duración</span><strong><i className="far fa-clock" /> {s.duracionMin} min</strong></div>
                <div className="service-row-price"><span>Valor</span><strong>${Number(s.precio).toLocaleString('es-AR')}</strong></div>
                <div className="service-row-actions">
                  <button onClick={() => openEdit(s)} title={`Editar ${s.nombre}`}><i className="fas fa-pen" /></button>
                  <button className="delete" onClick={() => handleDelete(s)} title={`Eliminar ${s.nombre}`}><i className="far fa-trash-alt" /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {showModal && (
        <div className="modal-overlay module-modal-overlay" onClick={closeModal}>
          <div className="modal module-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><span>{editing ? 'ACTUALIZAR SERVICIO' : 'NUEVO SERVICIO'}</span><h3>{editing ? editing.nombre : 'Crear servicio'}</h3></div>
              <button className="modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {error && <div className="module-form-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  className="form-input"
                  placeholder="Ej: Corte de cabello"
                  value={form.nombre}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  name="descripcion"
                  className="form-textarea"
                  placeholder="Descripción del servicio..."
                  value={form.descripcion}
                  onChange={handleChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Duración (min) *</label>
                  <input
                    type="number"
                    name="duracionMin"
                    className="form-input"
                    placeholder="30"
                    min="5"
                    value={form.duracionMin}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio ($) *</label>
                  <input
                    type="number"
                    name="precio"
                    className="form-input"
                    placeholder="5000"
                    min="0"
                    step="0.01"
                    value={form.precio}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
                  ) : (
                    <><i className="fas fa-check"></i> {editing ? 'Actualizar servicio' : 'Crear servicio'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
