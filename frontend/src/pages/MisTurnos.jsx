import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { turnos } from '../services/api';
import AppointmentSlotPicker from '../components/AppointmentSlotPicker';

const filters = [
  ['todos', 'Todos'], ['pendiente', 'Pendientes'], ['confirmado', 'Confirmados'],
  ['cancelado', 'Cancelados'], ['finalizado', 'Finalizados'], ['vencido', 'Vencidos'],
];

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function MisTurnos() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rescheduling, setRescheduling] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadAppointments() {
    try {
      const data = await turnos.getAll();
      setAppointments(Array.isArray(data) ? data : []);
      setError('');
    } catch (requestError) {
      setAppointments([]);
      setError(requestError.message || 'No pudimos cargar tus turnos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    turnos.getAll()
      .then((data) => { if (active) { setAppointments(Array.isArray(data) ? data : []); setError(''); } })
      .catch((requestError) => { if (active) { setAppointments([]); setError(requestError.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function cancel(appointment) {
    const reason = window.prompt('Motivo de la cancelación:');
    if (reason === null) return;
    try {
      await turnos.update({ idTurno: appointment.idTurno, accion: 'cancelar', motivo: reason });
      await loadAppointments();
    } catch (requestError) {
      setError(requestError.message || 'No se pudo cancelar el turno.');
    }
  }

  function openRescheduling(appointment) {
    setRescheduling(appointment);
    setDate(appointment.fecha < todayLocal() ? '' : appointment.fecha);
    setTime('');
    setError('');
  }

  async function saveRescheduling(event) {
    event.preventDefault();
    if (!date || !time) return;
    setSaving(true);
    setError('');
    try {
      await turnos.update({ idTurno: rescheduling.idTurno, accion: 'reprogramar',
        fecha: date, horaInicio: time });
      setRescheduling(null);
      await loadAppointments();
    } catch (requestError) {
      setError(requestError.message || 'No se pudo reprogramar el turno.');
    } finally {
      setSaving(false);
    }
  }

  const shown = filter === 'todos' ? appointments
    : appointments.filter((appointment) => String(appointment.estado).toLowerCase() === filter);
  const today = todayLocal();
  const upcoming = appointments.filter((appointment) => appointment.fecha >= today
    && ['pendiente', 'confirmado'].includes(String(appointment.estado).toLowerCase())).length;

  return (
    <div className="appointments-page client-module-page">
      <section className="client-section-hero"><div><span className="client-kicker">TUS RESERVAS</span>
        <h2>Mis turnos</h2><p>Consultá el estado de cada reserva y administrá tus próximas visitas.</p></div>
        <div className="appointments-hero-count"><strong>{upcoming}</strong><span>próximos</span></div></section>
      {error && <p className="appointment-feedback error" role="alert">{error}</p>}
      <div className="appointments-filter-tabs">{filters.map(([key, label]) => <button key={key}
        className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}
        <span>{key === 'todos' ? appointments.length : appointments.filter((a) => String(a.estado).toLowerCase() === key).length}</span>
      </button>)}</div>
      {loading ? <div className="spinner" /> : shown.length === 0 ?
        <section className="client-empty-state"><div><i className="far fa-calendar" /></div>
          <h3>No hay turnos en esta vista</h3><p>Probá otro estado o reservá un turno nuevo.</p>
          {filter === 'todos' && <Link to="/buscar">Buscar profesionales</Link>}</section> :
        <section className="appointment-card-list">{shown.map((appointment) => {
          const state = String(appointment.estado).toLowerCase();
          const dateValue = new Date(`${appointment.fecha}T12:00:00`);
          const canChange = ['pendiente', 'confirmado'].includes(state) && appointment.fecha >= today;
          const professional = appointment.nombreNegocio || `${appointment.profesional_nombre} ${appointment.profesional_apellido}`;
          return <article key={appointment.idTurno} className={`client-appointment-card status-${state}`}>
            <div className="client-appointment-date"><strong>{dateValue.getDate()}</strong>
              <span>{dateValue.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()}</span>
              <small>{dateValue.getFullYear()}</small></div>
            <div className="client-appointment-main"><span>{appointment.servicio_nombre}</span>
              <h3>{professional}</h3><p><i className="far fa-clock" /> {String(appointment.horaInicio).slice(0, 5)} hs</p></div>
            <div className="client-appointment-status"><span className={`badge badge-${state}`}>{appointment.estado}</span>
              <small>Reserva #{appointment.idTurno}</small></div>
            <div className="client-appointment-action">{canChange ? <div className="appointment-inline-actions">
              <button onClick={() => openRescheduling(appointment)}><i className="far fa-calendar-alt" /> Reprogramar</button>
              <button onClick={() => cancel(appointment)}><i className="fas fa-times" /> Cancelar</button>
            </div> : <span>{state === 'finalizado' ? 'Completado' : state === 'vencido' ? 'Turno vencido' : 'Sin acciones'}</span>}</div>
          </article>;
        })}</section>}

      {rescheduling && <div className="modal-overlay module-modal-overlay" onClick={() => setRescheduling(null)}>
        <div className="modal module-modal appointment-modal appointment-reschedule-modal" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header"><div><span>CAMBIAR FECHA Y HORARIO</span><h3>Reprogramar turno</h3></div>
            <button className="modal-close" type="button" onClick={() => setRescheduling(null)} aria-label="Cerrar"><i className="fas fa-times" /></button></div>
          <form onSubmit={saveRescheduling} className="appointment-modal-content">
            <p>Elegí un horario disponible para {rescheduling.servicio_nombre} con {rescheduling.nombreNegocio}.</p>
            {error && <p className="appointment-feedback error" role="alert">{error}</p>}
            <AppointmentSlotPicker key={rescheduling.idTurno} professionalId={rescheduling.idProfesional}
              serviceId={rescheduling.idServicio} excludedAppointmentId={rescheduling.idTurno}
              date={date} onDateChange={setDate} time={time} onTimeChange={setTime} />
            <div className="appointment-workspace-actions"><button type="button" className="appointment-text-button"
              onClick={() => setRescheduling(null)}>Volver</button>
              <button type="submit" className="module-primary-btn" disabled={!time || saving}>
                {saving ? 'Guardando…' : 'Confirmar cambio'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}
