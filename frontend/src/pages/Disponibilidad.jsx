import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { disponibilidad } from '../services/api';

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

const formatHora = (hora) => String(hora || '').slice(0, 5);
const aMinutos = (hora) => {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + m;
};
const deMinutos = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

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

  function openCreate(dia = 'Lunes') {
    setEditing(null);
    // Si el día ya tiene tramos, se propone uno nuevo después del último (horario cortado)
    const tramos = lista.filter((item) => item.diaSemana === dia);
    const ultimoFin = tramos.reduce((fin, t) => Math.max(fin, aMinutos(t.horaFin)), 0);
    const inicio = tramos.length ? Math.min(ultimoFin + 120, 20 * 60) : 8 * 60;
    const fin = tramos.length ? Math.min(inicio + 240, 23 * 60) : 17 * 60;
    setForm({ diaSemana: dia, horaInicio: deMinutos(inicio), horaFin: deMinutos(fin),
      intervaloMin: tramos.length ? String(tramos[0].intervaloMin || 30) : '30' });
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
    if (!window.confirm(`¿Eliminar el horario de ${formatHora(d.horaInicio)} a ${formatHora(d.horaFin)} del ${d.diaSemana}?`)) return;
    try {
      await disponibilidad.delete(d.idDisponibilidad);
      fetchDisponibilidad();
    } catch (err) {
      alert(err.message || 'Error al eliminar.');
    }
  }

  if (loading) return <div className="spinner"></div>;

  const minutosSemanales = lista.reduce((total, d) => {
    const [hi, mi] = String(d.horaInicio).split(':').map(Number);
    const [hf, mf] = String(d.horaFin).split(':').map(Number);
    return total + Math.max(0, (hf * 60 + mf) - (hi * 60 + mi));
  }, 0);
  const diasConfigurados = new Set(lista.map((item) => item.diaSemana)).size;
  const horasSemanales = Math.round((minutosSemanales / 60) * 10) / 10;

  return (
    <div className="availability-page">
      <section className="availability-hero">
        <div>
          <span className="availability-kicker">PLANIFICACIÓN SEMANAL</span>
          <h2>Tu disponibilidad</h2>
          <p>Definí cuándo pueden reservarte y mantené tu semana bajo control.</p>
        </div>
        <button className="availability-add-btn" onClick={() => openCreate()}>
          <i className="fas fa-plus"></i> Agregar horario
        </button>
      </section>

      <section className="availability-summary">
        <div className="availability-summary-main">
          <div className="availability-summary-icon"><i className="far fa-calendar-check" /></div>
          <div><span>Cobertura semanal</span><strong>{diasConfigurados} de 7 días configurados</strong></div>
        </div>
        <div className="availability-progress"><span style={{ width: `${(diasConfigurados / 7) * 100}%` }} /></div>
        <div className="availability-summary-metric"><span>Horas disponibles</span><strong>{horasSemanales} h</strong></div>
        <div className="availability-summary-metric"><span>Duración habitual</span><strong>{lista[0]?.intervaloMin || 30} min</strong></div>
      </section>

      <section className="week-planner">
        <div className="week-planner-header">
          <div><span>SEMANA DE TRABAJO</span><h3>Horarios de atención</h3></div>
          <p><i className="fas fa-circle" /> Disponible para reservas</p>
        </div>
        <div className="week-list">
          {DIAS.map((dia, index) => {
            // Un día puede tener varios tramos (horario cortado), ordenados por hora de inicio
            const tramos = lista
              .filter((item) => item.diaSemana === dia)
              .sort((a, b) => formatHora(a.horaInicio).localeCompare(formatHora(b.horaInicio)));
            const subtitulo = tramos.length === 0 ? 'Sin atención'
              : tramos.length === 1 ? 'Atención habilitada' : `Horario cortado · ${tramos.length} tramos`;
            return (
              <article key={dia} className={`week-day-row ${tramos.length ? 'is-active has-ranges' : 'is-closed'}`}>
                <div className="week-day-name"><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{dia}</strong><small>{subtitulo}</small></div></div>
                {tramos.length ? (
                  <div className="week-day-ranges">
                    {tramos.map((tramo) => (
                      <div key={tramo.idDisponibilidad} className="week-day-range">
                        <div className="week-day-hours"><i className="far fa-clock" /><strong>{formatHora(tramo.horaInicio)} — {formatHora(tramo.horaFin)}</strong></div>
                        <div className="week-day-interval"><span>Turnos cada</span><strong>{tramo.intervaloMin} min</strong></div>
                        <div className="week-day-actions">
                          <button onClick={() => openEdit(tramo)} title={`Editar ${dia} ${formatHora(tramo.horaInicio)}`}><i className="fas fa-pen" /></button>
                          <button className="delete" onClick={() => handleDelete(tramo)} title={`Eliminar ${dia} ${formatHora(tramo.horaInicio)}`}><i className="far fa-trash-alt" /></button>
                        </div>
                      </div>
                    ))}
                    <button className="week-day-add week-day-add-range" onClick={() => openCreate(dia)}><i className="fas fa-plus" /> Agregar otro tramo</button>
                  </div>
                ) : (
                  <button className="week-day-add" onClick={() => openCreate(dia)}><i className="fas fa-plus" /> Configurar día</button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <aside className="availability-tip">
        <i className="far fa-lightbulb" />
        <div><strong>Una agenda precisa evita reservas fuera de horario.</strong><span>Revisá esta configuración cuando cambien tus jornadas o la duración de tus servicios.</span></div>
      </aside>

      {showModal && (
        <div className="modal-overlay availability-modal-overlay" onClick={closeModal}>
          <div className="modal availability-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><span>{editing ? 'ACTUALIZAR JORNADA' : 'NUEVA JORNADA'}</span><h3>{editing ? `Editar ${editing.diaSemana} (${formatHora(editing.horaInicio)} — ${formatHora(editing.horaFin)})` : `Configurar horario del ${form.diaSemana}`}</h3></div>
              <button className="modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {error && <div className="availability-form-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Día de la semana</label>
                <select name="diaSemana" className="form-select" value={form.diaSemana} onChange={handleChange} disabled={Boolean(editing)}>
                  {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Desde</label>
                  <input
                    type="time"
                    name="horaInicio"
                    className="form-input"
                    value={form.horaInicio}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hasta</label>
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
                <label className="form-label">Duración de cada turno</label>
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
                    <><i className="fas fa-check"></i> {editing ? 'Actualizar horario' : 'Guardar horario'}</>
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
