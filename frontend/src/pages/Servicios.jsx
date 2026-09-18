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

  return (
    <div>
      <div className="page-header">
        <div>
          <h2><i className="fas fa-concierge-bell"></i> Mis Servicios</h2>
          <p>Gestioná los servicios que ofrecés a tus clientes.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="fas fa-plus"></i> Nuevo Servicio
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-concierge-bell"></i>
          <h3>Sin servicios</h3>
          <p>Creá tu primer servicio para que los clientes puedan reservar.</p>
        </div>
      ) : (
        <div className="services-grid">
          {lista.map((s) => (
            <div key={s.idServicio} className="service-card">
              <h3>{s.nombre}</h3>
              <p>{s.descripcion || 'Sin descripción'}</p>
              <div className="service-card-meta">
                <span className="service-card-price">
                  ${Number(s.precio).toLocaleString('es-AR')}
                </span>
                <span className="service-card-duration">
                  <i className="fas fa-clock"></i> {s.duracionMin} min
                </span>
              </div>
              <div className="service-card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>
                  <i className="fas fa-edit"></i> Editar
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>
                  <i className="fas fa-trash"></i> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

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
                    <><i className="fas fa-save"></i> {editing ? 'Actualizar' : 'Crear'}</>
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
