import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { turnos } from '../services/api';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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

function formatDate(date) {
  return date.toISOString().split('T')[0];
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

  const weekDates = getWeekDates(baseDate);

  async function fetchTurnos() {
    setLoading(true);
    try {
      const desde = formatDate(weekDates[0]);
      const hasta = formatDate(weekDates[6]);
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
    fetchTurnos();
  }, [baseDate]);

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
  }

  function getTurnosByDate(fecha) {
    return turnosList.filter((t) => t.fecha === fecha);
  }

  async function handleCambiarEstado(turno, nuevoEstado) {
    try {
      const payload = { idTurno: turno.idTurno, estado: nuevoEstado };
      if (nuevoEstado === 'Cancelado') {
        const motivo = window.prompt('Motivo de cancelación:');
        if (motivo === null) return;
        payload.motivoCancelacion = motivo;
      }
      await turnos.update(payload);
      setSelectedTurno(null);
      fetchTurnos();
    } catch (err) {
      alert(err.message || 'Error al actualizar el turno.');
    }
  }

  const hoy = formatDate(new Date());

  return (
    <div>
      <div className="page-header">
        <div>
          <h2><i className="fas fa-calendar-alt"></i> Agenda Semanal</h2>
          <p>Vista semanal de todos tus turnos.</p>
        </div>
      </div>

      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={prevWeek}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <button onClick={goToday} style={{ width: 'auto', padding: '0 12px', fontSize: '0.8rem' }}>
            Hoy
          </button>
          <button onClick={nextWeek}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
          {formatDateShort(weekDates[0])} — {formatDateShort(weekDates[6])}{' '}
          <span style={{ color: 'var(--text-muted)' }}>
            {weekDates[0].getFullYear()}
          </span>
        </h3>
      </div>

      {loading ? (
        <div className="spinner"></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
          {weekDates.map((date, i) => {
            const fechaStr = formatDate(date);
            const esHoy = fechaStr === hoy;
            const turnosDelDia = getTurnosByDate(fechaStr);
            const dayIndex = date.getDay();

            return (
              <div
                key={i}
                className="card"
                style={{
                  padding: '16px',
                  borderColor: esHoy ? 'var(--primary)' : undefined,
                  minHeight: '200px',
                }}
              >
                <div style={{
                  textAlign: 'center',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: esHoy ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}>
                    {DIAS_SEMANA[dayIndex]}
                  </div>
                  <div style={{
                    fontSize: '1.4rem',
                    fontWeight: '800',
                    color: esHoy ? 'var(--primary)' : 'var(--text-primary)',
                  }}>
                    {date.getDate()}
                  </div>
                </div>

                {turnosDelDia.length === 0 ? (
                  <p style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '16px',
                  }}>
                    Sin turnos
                  </p>
                ) : (
                  turnosDelDia.map((t) => (
                    <div
                      key={t.idTurno}
                      className={`calendar-event ${(t.estado || '').toLowerCase()}`}
                      onClick={() => setSelectedTurno(t)}
                    >
                      <div style={{ fontWeight: '700' }}>{t.horaInicio}</div>
                      <div>{t.nombreCliente || t.cliente || 'Cliente'}</div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedTurno && (
        <div className="modal-overlay" onClick={() => setSelectedTurno(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle del Turno</h3>
              <button className="modal-close" onClick={() => setSelectedTurno(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Cliente</label>
                <p>{selectedTurno.nombreCliente || selectedTurno.cliente || '-'}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Servicio</label>
                <p>{selectedTurno.nombreServicio || selectedTurno.servicio || '-'}</p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <p>{selectedTurno.fecha}</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Hora</label>
                  <p>{selectedTurno.horaInicio}</p>
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
              {selectedTurno.estado === 'Pendiente' && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleCambiarEstado(selectedTurno, 'Confirmado')}
                >
                  <i className="fas fa-check"></i> Confirmar
                </button>
              )}
              {(selectedTurno.estado === 'Pendiente' || selectedTurno.estado === 'Confirmado') && (
                <>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleCambiarEstado(selectedTurno, 'Cancelado')}
                  >
                    <i className="fas fa-times"></i> Cancelar
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleCambiarEstado(selectedTurno, 'Finalizado')}
                  >
                    <i className="fas fa-flag-checkered"></i> Finalizar
                  </button>
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
