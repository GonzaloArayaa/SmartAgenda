import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { servicios, profesionales, recomendaciones, turnos, listaEspera } from '../services/api';

export default function Reservar() {
  const { idProfesional } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [paso, setPaso] = useState(1);
  const [profesional, setProfesional] = useState(null);
  const [listaServicios, setListaServicios] = useState([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [fecha, setFecha] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [enEspera, setEnEspera] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profData, servData] = await Promise.all([
          profesionales.getOne(idProfesional),
          servicios.getByProfesional(idProfesional),
        ]);
        setProfesional(profData.profesional || profData);
        setListaServicios(Array.isArray(servData) ? servData : servData.servicios || []);
      } catch {
        setProfesional(null);
        setListaServicios([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [idProfesional]);

  async function fetchSlots() {
    if (!servicioSeleccionado || !fecha) return;
    setLoadingSlots(true);
    setSlots([]);
    setSlotSeleccionado(null);
    try {
      const data = await recomendaciones.get(idProfesional, servicioSeleccionado.idServicio, fecha);
      const slotsArr = Array.isArray(data) ? data : data.horarios || data.slots || [];
      setSlots(slotsArr);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    if (paso === 3 && servicioSeleccionado && fecha) {
      fetchSlots();
    }
  }, [paso, fecha]);

  function selectServicio(s) {
    setServicioSeleccionado(s);
    setPaso(2);
  }

  function selectFecha() {
    if (!fecha) {
      setError('Seleccioná una fecha.');
      return;
    }
    setError('');
    setPaso(3);
  }

  function selectSlot(slot) {
    setSlotSeleccionado(slot);
    setPaso(4);
  }

  async function confirmarReserva() {
    setSaving(true);
    setError('');
    try {
      await turnos.create({
        idProfesional: Number(idProfesional),
        idServicio: servicioSeleccionado.idServicio,
        fecha: fecha,
        horaInicio: slotSeleccionado.horaInicio || slotSeleccionado.hora,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Error al crear el turno.');
    } finally {
      setSaving(false);
    }
  }

  async function anotarmeEnEspera() {
    setSaving(true); setError('');
    try {
      await listaEspera.create({ idProfesional: Number(idProfesional), idServicio: servicioSeleccionado.idServicio, fecha });
      setEnEspera(true);
    } catch (err) { setError(err.message || 'No se pudo registrar la solicitud.'); }
    finally { setSaving(false); }
  }

  function getStepClass(n) {
    if (n === paso) return 'step active';
    if (n < paso) return 'step done';
    return 'step';
  }

  if (loading) return <div className="spinner"></div>;

  if (success) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ marginBottom: '12px' }}>¡Turno Reservado!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Tu turno con <strong>{profesional?.nombreNegocio || profesional?.nombre}</strong> fue confirmado.
          </p>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            <strong>{servicioSeleccionado?.nombre}</strong> — {fecha} a las {slotSeleccionado?.horaInicio || slotSeleccionado?.hora}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/mis-turnos')}>
              <i className="fas fa-calendar-check"></i> Ver Mis Turnos
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/buscar')}>
              <i className="fas fa-search"></i> Buscar Más
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hoy = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2><i className="fas fa-calendar-plus"></i> Reservar Turno</h2>
          <p>
            {profesional
              ? `Reservá con ${profesional.nombreNegocio || `${profesional.nombre} ${profesional.apellido}`}`
              : 'Seleccioná servicio, fecha y horario.'}
          </p>
        </div>
      </div>

      <div className="steps">
        <div className={getStepClass(1)}>
          <span className="step-number">1</span> Servicio
        </div>
        <div className={getStepClass(2)}>
          <span className="step-number">2</span> Fecha
        </div>
        <div className={getStepClass(3)}>
          <span className="step-number">3</span> Horario
        </div>
        <div className={getStepClass(4)}>
          <span className="step-number">4</span> Confirmar
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          marginBottom: '20px',
        }}>
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {paso === 1 && (
        <div>
          <h3 className="section-title">Seleccioná un servicio</h3>
          {listaServicios.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-concierge-bell"></i>
              <h3>Sin servicios disponibles</h3>
              <p>Este profesional aún no tiene servicios configurados.</p>
            </div>
          ) : (
            <div className="services-grid">
              {listaServicios.map((s) => (
                <div
                  key={s.idServicio}
                  className="service-card"
                  onClick={() => selectServicio(s)}
                  style={{ cursor: 'pointer' }}
                >
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {paso === 2 && (
        <div className="card">
          <h3 className="section-title">
            <i className="fas fa-calendar-alt"></i> Seleccioná la fecha
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Servicio seleccionado: <strong style={{ color: 'var(--accent)' }}>{servicioSeleccionado?.nombre}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input
              type="date"
              className="form-input"
              value={fecha}
              min={hoy}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" onClick={() => setPaso(1)}>
              <i className="fas fa-arrow-left"></i> Volver
            </button>
            <button className="btn btn-primary" onClick={selectFecha}>
              Continuar <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent)' }}>{servicioSeleccionado?.nombre}</strong> — {fecha}
            </p>
          </div>

          <h3 className="section-title">
            <i className="fas fa-clock"></i> Horarios Disponibles
          </h3>

          {loadingSlots ? (
            <div className="spinner"></div>
          ) : slots.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-clock"></i>
              <h3>Sin horarios disponibles</h3>
              <p>No hay horarios disponibles para esta fecha. Probá con otra.</p>
              {enEspera ? <p style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Te anotaste en la lista de espera. Te avisaremos aquí si se libera un turno.</p> : (
                <button className="btn btn-primary" onClick={anotarmeEnEspera} disabled={saving}>
                  <i className="fas fa-hourglass-half"></i> {saving ? 'Registrando...' : 'Anotarme en lista de espera'}
                </button>
              )}
            </div>
          ) : (
            <div className="slots-grid">
              {slots.map((slot, i) => {
                const hora = slot.horaInicio || slot.hora;
                const esRecomendado = slot.recomendado || slot.puntaje >= 80;
                const esSeleccionado = slotSeleccionado && (slotSeleccionado.horaInicio || slotSeleccionado.hora) === hora;
                let clases = 'slot-card';
                if (esRecomendado) clases += ' recommended';
                if (esSeleccionado) clases += ' selected';

                return (
                  <div
                    key={i}
                    className={clases}
                    onClick={() => selectSlot(slot)}
                  >
                    {esRecomendado && (
                      <span className="slot-card-badge">⭐ Recomendado</span>
                    )}
                    <div className="slot-card-time">{hora}</div>
                    {slot.puntaje !== undefined && (
                      <div className="slot-card-score">
                        Puntaje: {slot.puntaje}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <button className="btn btn-outline" onClick={() => setPaso(2)}>
              <i className="fas fa-arrow-left"></i> Volver
            </button>
          </div>
        </div>
      )}

      {paso === 4 && (
        <div className="card">
          <h3 className="section-title">
            <i className="fas fa-check-circle"></i> Confirmar Reserva
          </h3>

          <div style={{
            background: 'var(--bg-section)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Profesional</span>
                <p style={{ fontWeight: '600' }}>
                  {profesional?.nombreNegocio || `${profesional?.nombre} ${profesional?.apellido}`}
                </p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Servicio</span>
                <p style={{ fontWeight: '600' }}>{servicioSeleccionado?.nombre}</p>
              </div>
              <div style={{ display: 'flex', gap: '40px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Fecha</span>
                  <p style={{ fontWeight: '600' }}>{fecha}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Hora</span>
                  <p style={{ fontWeight: '600' }}>{slotSeleccionado?.horaInicio || slotSeleccionado?.hora}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Duración</span>
                  <p style={{ fontWeight: '600' }}>{servicioSeleccionado?.duracionMin} min</p>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Precio</span>
                <p style={{ fontWeight: '800', color: 'var(--accent)', fontSize: '1.3rem' }}>
                  ${Number(servicioSeleccionado?.precio).toLocaleString('es-AR')}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" onClick={() => setPaso(3)}>
              <i className="fas fa-arrow-left"></i> Volver
            </button>
            <button className="btn btn-primary btn-lg" onClick={confirmarReserva} disabled={saving}>
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Reservando...</>
              ) : (
                <><i className="fas fa-check"></i> Confirmar Reserva</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
