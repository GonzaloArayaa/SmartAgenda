import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { disponibilidad } from '../services/api';

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

export default function Disponibilidad() {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    diaSemana: 'Lunes',
    horaInicio: '08:00',
    horaFin: '17:00',
    intervaloMin: '30',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchDisponibilidad() {
    setLoading(true);
    try {
      const data = await disponibilidad.getByProfesional(user.idProfesional);
      setLista(Array.isArray(data) ? data : data.disponibilidad || []);
    } catch {
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDisponibilidad();
  }, [user.idProfesional]);

  function openCreate() {
    setEditing(null);
    setForm({ diaSemana: 'Lunes', horaInicio: '08:00', horaFin: '17:00', intervaloMin: '30' });
    setError('');
    setShowModal(true);
  }

  function openEdit(d) {
    setEditing(d);
    setForm({
      diaSemana: d.diaSemana || 'Lunes',
      horaInicio: d.horaInicio || '08:00',
      horaFin: d.horaFin || '17:00',
      intervaloMin: d.intervaloMin?.toString() || '30',
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

    if (!form.horaInicio || !form.horaFin || !form.intervaloMin) {
      setError('Completá todos los campos.');
      return;
    }

    if (form.horaInicio >= form.horaFin) {
      setError('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await disponibilidad.update({
          idDisponibilidad: editing.idDisponibilidad,
          idProfesional: user.idProfesional,
          diaSemana: form.diaSemana,
          horaInicio: form.horaInicio,
          horaFin: form.horaFin,
          intervaloMin: Number(form.intervaloMin),
        });
      } else {
        await disponibilidad.create({
          idProfesional: user.idProfesional,
          diaSemana: form.diaSemana,
          horaInicio: form.horaInicio,
          horaFin: form.horaFin,
          intervaloMin: Number(form.intervaloMin),
        });
      }
      closeModal();
      fetchDisponibilidad();
    } catch (err) {
      setError(err.message || 'Error al guardar la disponibilidad.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(d) {
    if (!window.confirm(`¿Eliminar la disponibilidad del ${d.diaSemana}?`)) return;
    try {
      await disponibilidad.delete(d.idDisponibilidad);
      fetchDisponibilidad();
    } catch (err) {
      alert(err.message || 'Error al eliminar.');
    }
  }

  function getDayIcon(dia) {
    const icons = {
      Lunes: 'fa-calendar-day',
      Martes: 'fa-calendar-day',
      Miercoles: 'fa-calendar-day',
      Jueves: 'fa-calendar-day',
      Viernes: 'fa-calendar-day',
      Sabado: 'fa-calendar-week',
      Domingo: 'fa-calendar-week',
    };
    return icons[dia] || 'fa-calendar';
  }

  if (loading) return <div className="spinner"></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2><i className="fas fa-clock"></i> Disponibilidad</h2>
          <p>Configurá los días y horarios en los que atendés.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="fas fa-plus"></i> Agregar Día
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-clock"></i>
          <h3>Sin disponibilidad configurada</h3>
          <p>Agregá tus días y horarios de atención para que los clientes puedan reservar.</p>
        </div>
      ) : (
        <div className="disp-grid">
          {lista.map((d) => (
            <div key={d.idDisponibilidad} className="disp-card">
              <h4>
                <i className={`fas ${getDayIcon(d.diaSemana)}`}></i> {d.diaSemana}
              </h4>
              <p className="disp-time">{d.horaInicio} - {d.horaFin}</p>
              <p>Intervalo: {d.intervaloMin} min</p>
              <div className="disp-card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(d)}>
                  <i className="fas fa-edit"></i>
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d)}>
                  <i className="fas fa-trash"></i>
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
              <h3>{editing ? 'Editar Disponibilidad' : 'Nueva Disponibilidad'}</h3>
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
                <label className="form-label">Día de la Semana</label>
                <select
                  name="diaSemana"
                  className="form-select"
                  value={form.diaSemana}
                  onChange={handleChange}
                >
                  {DIAS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hora Inicio</label>
                  <input
                    type="time"
                    name="horaInicio"
                    className="form-input"
                    value={form.horaInicio}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora Fin</label>
                  <input
                    type="time"
                    name="horaFin"
                    className="form-input"
                    value={form.horaFin}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Intervalo (minutos)</label>
                <select
                  name="intervaloMin"
                  className="form-select"
                  value={form.intervaloMin}
                  onChange={handleChange}
                >
                  <option value="15">15 minutos</option>
                  <option value="20">20 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">60 minutos</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
                  ) : (
                    <><i className="fas fa-save"></i> {editing ? 'Actualizar' : 'Guardar'}</>
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
