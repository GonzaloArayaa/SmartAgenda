import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { turnos } from '../services/api';
import { fechaLocal, horaCorta } from '../utils/fecha';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Posición del día dentro de la semana de la agenda (0 = lunes ... 6 = domingo)
function indiceEnSemana(date) {
  return (date.getDay() + 6) % 7;
}

function getWeekDates(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const lunes = new Date(d.setDate(diff));

  const fechas = [];
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    fechas.push(fecha);
  }
  return fechas;
}

function formatDateShort(date) {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export default function Agenda() {
  const { user } = useAuth();
  const [baseDate, setBaseDate] = useState(new Date());
  const [turnosList, setTurnosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurno, setSelectedTurno] = useState(null);
  // Día que se muestra en celulares (en pantallas grandes se ve la semana completa)
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => indiceEnSemana(new Date()));

  const weekDates = getWeekDates(baseDate);

  async function fetchTurnos() {
    setLoading(true);
    try {
      const desde = fechaLocal(weekDates[0]);
      const hasta = fechaLocal(weekDates[6]);
      const data = await turnos.getAll(
        `idProfesional=${user.idProfesional}&fechaDesde=${desde}&fechaHasta=${hasta}`
      );
      const arr = Array.isArray(data) ? data : data.turnos || [];
      setTurnosList(arr);
    } catch {
      setTurnosList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const dates = getWeekDates(baseDate);
    const params = new URLSearchParams({ idProfesional: user.idProfesional,
      fechaDesde: fechaLocal(dates[0]), fechaHasta: fechaLocal(dates[6]) });
    turnos.getAll(params.toString())
      .then((data) => { if (active) setTurnosList(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setTurnosList([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [baseDate, user.idProfesional]);

  function prevWeek() {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 7);
    setBaseDate(d);
  }

  function nextWeek() {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7);
    setBaseDate(d);
  }

  function goToday() {
    setBaseDate(new Date());
    setDiaSeleccionado(indiceEnSemana(new Date()));
  }

  // Selector de día (celular): flechas para moverse, Inicio/Fin para ir al lunes/domingo
  function handleDiaKeyDown(e) {
    const destinos = { ArrowRight: diaSeleccionado + 1, ArrowLeft: diaSeleccionado - 1, Home: 0, End: 6 };
    if (!(e.key in destinos)) return;
    e.preventDefault();
    const nuevo = Math.min(6, Math.max(0, destinos[e.key]));
    setDiaSeleccionado(nuevo);
    document.getElementById(`agenda-dia-${nuevo}`)?.focus();
  }

  function getTurnosByDate(fecha) {
    return turnosList.filter((t) => t.fecha === fecha);
  }

  async function handleCambiarEstado(turno, nuevoEstado) {
    try {
      const acciones = { Confirmado: 'confirmar', Cancelado: 'cancelar', Finalizado: 'finalizar' };
      const payload = { idTurno: turno.idTurno, accion: acciones[nuevoEstado] };
      if (nuevoEstado === 'Cancelado') {
        const motivo = window.prompt('Motivo de cancelación:');
        if (motivo === null) return;
        payload.motivo = motivo;
      }
      await turnos.update(payload);
      setSelectedTurno(null);
      fetchTurnos();
    } catch (err) {
      alert(err.message || 'Error al actualizar el turno.');
    }
  }

  const hoy = fechaLocal(new Date());
  const totalSemana = turnosList.length;
  const confirmados = turnosList.filter((t) => String(t.estado).toLowerCase() === 'confirmado').length;

  return (
    <div className="agenda-page pro-module-page">
      <section className="module-hero agenda-module-hero">
        <div>
          <span className="module-kicker">AGENDA OPERATIVA</span>
          <h2>Semana de trabajo</h2>
          <p>Revisá tus próximas atenciones y gestioná cada turno desde un solo lugar.</p>
        </div>
        <div className="agenda-hero-summary"><div><span>Turnos</span><strong>{totalSemana}</strong></div><div><span>Confirmados</span><strong>{confirmados}</strong></div></div>
      </section>

      <div className="agenda-primary-actions">
        <Link className="module-primary-btn" to="/nuevo-turno"><i className="fas fa-plus" /> Crear turno</Link>
        <Link className="appointment-hero-link" to="/historial-turnos"><i className="fas fa-history" /> Ver historial</Link>
      </div>

      <section className="agenda-toolbar">
        <div><span>SEMANA ACTUAL</span><h3>{formatDateShort(weekDates[0])} — {formatDateShort(weekDates[6])} <small>{weekDates[0].getFullYear()}</small></h3></div>
        <div className="calendar-nav">
          <button onClick={prevWeek} title="Semana anterior"><i className="fas fa-chevron-left" /></button>
          <button onClick={goToday} className="calendar-today">Ir a hoy</button>
          <button onClick={nextWeek} title="Semana siguiente"><i className="fas fa-chevron-right" /></button>
        </div>
      </section>

      <div className="agenda-day-picker" role="tablist" aria-label="Día de la semana">
        {weekDates.map((date, i) => {
          const fechaStr = fechaLocal(date);
          const cantidad = getTurnosByDate(fechaStr).length;
          const seleccionado = i === diaSeleccionado;
          return (
            <button
              key={fechaStr}
              id={`agenda-dia-${i}`}
              type="button"
              role="tab"
              aria-selected={seleccionado}
              tabIndex={seleccionado ? 0 : -1}
              className={`${seleccionado ? 'is-selected' : ''} ${fechaStr === hoy ? 'is-today' : ''}`}
              onClick={() => setDiaSeleccionado(i)}
              onKeyDown={handleDiaKeyDown}
            >
              <span>{DIAS_SEMANA[date.getDay()]}</span>
              <strong>{date.getDate()}</strong>
              <small>{cantidad > 0 ? cantidad : '·'}</small>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="spinner"></div>
      ) : (
        <section className="modern-week-grid">
          {weekDates.map((date, i) => {
            const fechaStr = fechaLocal(date);
            const esHoy = fechaStr === hoy;
            const turnosDelDia = getTurnosByDate(fechaStr);
            const dayIndex = date.getDay();

            return (
              <article key={i} className={`modern-day-column ${esHoy ? 'is-today' : ''} ${i === diaSeleccionado ? 'is-selected' : ''}`}>
                <header><span>{DIAS_SEMANA[dayIndex]}</span><strong>{date.getDate()}</strong>{esHoy && <small>HOY</small>}</header>
                <div className="modern-day-events">
                {turnosDelDia.length === 0 ? (
                  <div className="agenda-day-empty"><i className="fas fa-minus" /><span>Sin turnos</span></div>
                ) : (
                  turnosDelDia.map((t) => (
                    <button key={t.idTurno} className={`modern-calendar-event ${(t.estado || '').toLowerCase()}`} onClick={() => setSelectedTurno(t)}>
                      <time>{horaCorta(t.horaInicio)}</time>
                      <strong>{t.cliente_nombre ? `${t.cliente_nombre} ${t.cliente_apellido || ''}` : t.nombreCliente || t.cliente || 'Cliente'}</strong>
                      <span>{t.servicio_nombre || t.nombreServicio || t.servicio || 'Servicio'}</span>
                    </button>
                  ))
                )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {selectedTurno && (
        <div className="modal-overlay module-modal-overlay" onClick={() => setSelectedTurno(null)}>
          <div className="modal module-modal appointment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><span>DETALLE DE ATENCIÓN</span><h3>{horaCorta(selectedTurno.horaInicio)} · {selectedTurno.fecha}</h3></div>
              <button className="modal-close" onClick={() => setSelectedTurno(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="appointment-detail-grid">
              <div className="form-group">
                <label className="form-label">Cliente</label>
                <p>{selectedTurno.cliente_nombre ? `${selectedTurno.cliente_nombre} ${selectedTurno.cliente_apellido || ''}` : selectedTurno.nombreCliente || selectedTurno.cliente || '-'}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Servicio</label>
                <p>{selectedTurno.servicio_nombre || selectedTurno.nombreServicio || selectedTurno.servicio || '-'}</p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <p>{selectedTurno.fecha}</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Hora</label>
                  <p>{horaCorta(selectedTurno.horaInicio)}</p>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <span className={`badge badge-${(selectedTurno.estado || '').toLowerCase()}`}>
                  {selectedTurno.estado}
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
              {selectedTurno.estado === 'pendiente' && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleCambiarEstado(selectedTurno, 'Confirmado')}
                >
                  <i className="fas fa-check"></i> Confirmar
                </button>
              )}
              {(selectedTurno.estado === 'pendiente' || selectedTurno.estado === 'confirmado') && (
                <>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleCambiarEstado(selectedTurno, 'Cancelado')}
                  >
                    <i className="fas fa-times"></i> Cancelar
                  </button>
                  {selectedTurno.estado === 'confirmado' && <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleCambiarEstado(selectedTurno, 'Finalizado')}
                  ><i className="fas fa-flag-checkered"></i> Finalizar</button>}
                </>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedTurno(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
