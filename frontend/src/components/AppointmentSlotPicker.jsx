import { useEffect, useState } from 'react';
import { recomendaciones } from '../services/api';

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function AppointmentSlotPicker({ professionalId, serviceId, excludedAppointmentId,
  date, onDateChange, time, onTimeChange }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!date || !professionalId || !serviceId) return;
    let active = true;
    recomendaciones.get(professionalId, serviceId, date, excludedAppointmentId)
      .then((response) => {
        if (!active) return;
        setSlots(Array.isArray(response.slots) ? response.slots : []);
        setMessage(response.resumenInteligente || '');
      })
      .catch((error) => {
        if (!active) return;
        setSlots([]);
        setMessage(error.message || 'No se pudieron consultar los horarios.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [professionalId, serviceId, excludedAppointmentId, date]);

  function changeDate(value) {
    setSlots([]);
    setMessage('');
    setLoading(Boolean(value));
    onTimeChange('');
    onDateChange(value);
  }

  return (
    <div className="slot-picker">
      <label className="form-label" htmlFor="appointment-date">Elegí una fecha</label>
      <input id="appointment-date" type="date" className="form-input" min={todayLocal()}
        value={date} onChange={(event) => changeDate(event.target.value)} />
      {date && <div className="slot-picker-results" aria-live="polite">
        <span className="slot-picker-label">HORARIOS DISPONIBLES</span>
        {loading ? <p>Consultando la agenda…</p> : slots.length ? (
          <div className="slot-picker-grid">
            {slots.map((slot) => {
              const start = String(slot.horaInicio).slice(0, 5);
              return <button type="button" key={start} className={time === start ? 'selected' : ''}
                aria-pressed={time === start} onClick={() => onTimeChange(start)}>
                <strong>{start}</strong><small>{slot.nivel || 'Disponible'}</small>
              </button>;
            })}
          </div>
        ) : <p>{message || 'No hay horarios disponibles para esa fecha.'}</p>}
      </div>}
    </div>
  );
}
