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
  const [analisisAgenda, setAnalisisAgenda] = useState(null);
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
    setAnalisisAgenda(null);
    setSlotSeleccionado(null);
    try {
      const data = await recomendaciones.get(idProfesional, servicioSeleccionado.idServicio, fecha);
      const slotsArr = Array.isArray(data) ? data : data.horarios || data.slots || [];
      setSlots(slotsArr);
      setAnalisisAgenda(Array.isArray(data) ? null : data);
    } catch (err) {
      setSlots([]);
      setError(err.message || 'No se pudieron analizar los horarios.');
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

  function seleccionarFechaRapida(dias) {
    const date = new Date();
    date.setDate(date.getDate() + dias);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setFecha(`${year}-${month}-${day}`);
    setError('');
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
  const slotsRecomendados = slots
    .filter((slot) => slot.recomendado)
    .sort((a, b) => (a.posicionRanking || 99) - (b.posicionRanking || 99));
  const otrosSlots = slots.filter((slot) => !slot.recomendado);
  const profesionalNoAtiende = analisisAgenda?.resumenInteligente
    ?.toLowerCase().includes('no atiende');
  const nombreProfesional = profesional?.nombreNegocio
    || `${profesional?.nombre || ''} ${profesional?.apellido || ''}`.trim();
  const fechaReserva = fecha ? new Date(`${fecha}T12:00:00`) : null;
  const fechaLegible = fechaReserva
    ? new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(fechaReserva)
    : '';
  const mesReserva = fechaReserva
    ? new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(fechaReserva).replace('.', '').toUpperCase()
    : '';
  const pasosReserva = [
    { numero: 1, nombre: 'Servicio', detalle: 'Qué necesitás' },
    { numero: 2, nombre: 'Fecha', detalle: 'Elegí el día' },
    { numero: 3, nombre: 'Horario', detalle: 'Opción inteligente' },
    { numero: 4, nombre: 'Confirmar', detalle: 'Revisá la reserva' },
  ];

  function renderSlot(slot, i, compact = false) {
    const hora = slot.horaInicio || slot.hora;
    const esSeleccionado = slotSeleccionado
      && (slotSeleccionado.horaInicio || slotSeleccionado.hora) === hora;
    let clases = compact ? 'smart-slot compact' : 'smart-slot';
    if (slot.posicionRanking === 1) clases += ' best';
    if (esSeleccionado) clases += ' selected';

    return (
      <button
        type="button"
        key={`${hora}-${i}`}
        className={clases}
        onClick={() => selectSlot(slot)}
      >
        {!compact && (
          <div className="smart-slot-topline">
            <span>{slot.nivel || 'Recomendado'}</span>
            <small>#{slot.posicionRanking}</small>
          </div>
        )}
        <strong>{hora}</strong>
        <span className="smart-slot-range">hasta {slot.horaFin}</span>
        {!compact && (
          <p><i className="fas fa-wand-magic-sparkles" /> {slot.motivoPrincipal}</p>
        )}
        {compact && <small>Horario disponible</small>}
      </button>
    );
  }

  return (
    <div className="booking-page">
      <section className="booking-intro">
        <div className="booking-intro-copy">
          <span className="booking-kicker">NUEVA RESERVA</span>
          <h2>Coordiná tu turno en pocos pasos.</h2>
          <p>Elegí el servicio y dejá que SmartAgenda encuentre las opciones que mejor aprovechan la agenda.</p>
        </div>
        <aside className="booking-professional-card">
          <div className="booking-professional-avatar">
            {(nombreProfesional || 'P').split(' ').map((part) => part[0]).join('').slice(0, 2)}
          </div>
          <div>
            <span>ESTÁS RESERVANDO CON</span>
            <strong>{nombreProfesional || 'Profesional'}</strong>
            <small><i className="fas fa-circle" /> Disponible para reservas</small>
          </div>
        </aside>
      </section>

      <nav className="booking-progress" aria-label="Progreso de la reserva">
        {pasosReserva.map((item) => (
          <div key={item.numero} className={getStepClass(item.numero)}>
            <span className="booking-step-number">
              {item.numero < paso ? <i className="fas fa-check" /> : item.numero}
            </span>
            <div>
              <strong>{item.nombre}</strong>
              <small>{item.detalle}</small>
            </div>
          </div>
        ))}
      </nav>

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
        <section className="booking-service-panel">
          <header>
            <div>
              <span>PASO 01</span>
              <h3>¿Qué servicio querés reservar?</h3>
              <p>Seleccioná una opción para consultar las fechas disponibles.</p>
            </div>
            <div className="booking-service-count">
              <strong>{listaServicios.length}</strong>
              <span>{listaServicios.length === 1 ? 'servicio' : 'servicios'}</span>
            </div>
          </header>
          {listaServicios.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-concierge-bell"></i>
              <h3>Sin servicios disponibles</h3>
              <p>Este profesional aún no tiene servicios configurados.</p>
            </div>
          ) : (
            <div className="booking-service-grid">
              {listaServicios.map((s, index) => (
                <button
                  type="button"
                  key={s.idServicio}
                  className="booking-service-card"
                  onClick={() => selectServicio(s)}
                >
                  <div className="booking-service-card-top">
                    <span className="booking-service-index">{String(index + 1).padStart(2, '0')}</span>
                    <i className="fas fa-arrow-up-right" />
                  </div>
                  <div className="booking-service-card-body">
                    <div className="booking-service-icon"><i className="fas fa-calendar-check" /></div>
                    <h3>{s.nombre}</h3>
                    <p>{s.descripcion || 'Atención personalizada con este profesional.'}</p>
                  </div>
                  <div className="booking-service-card-meta">
                    <div><span>VALOR</span><strong>${Number(s.precio).toLocaleString('es-AR')}</strong></div>
                    <div><span>DURACIÓN</span><strong><i className="far fa-clock" /> {s.duracionMin} min</strong></div>
                  </div>
                  <div className="booking-service-select">Seleccionar servicio <i className="fas fa-arrow-right" /></div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {paso === 2 && (
        <section className="booking-date-layout">
          <aside className="booking-date-summary">
            <span className="booking-date-label">TU SELECCIÓN</span>
            <div className="booking-date-service-icon"><i className="fas fa-calendar-check" /></div>
            <h3>{servicioSeleccionado?.nombre}</h3>
            <p>{servicioSeleccionado?.descripcion || 'Atención personalizada con este profesional.'}</p>
            <div className="booking-date-details">
              <div><span>Duración</span><strong>{servicioSeleccionado?.duracionMin} min</strong></div>
              <div><span>Valor</span><strong>${Number(servicioSeleccionado?.precio).toLocaleString('es-AR')}</strong></div>
            </div>
            <div className="booking-date-professional">
              <span>PROFESIONAL</span>
              <strong>{nombreProfesional}</strong>
            </div>
          </aside>

          <div className="booking-date-picker">
            <header>
              <span>PASO 02</span>
              <h3>¿Qué día te queda mejor?</h3>
              <p>Después analizaremos la agenda para recomendarte los horarios más convenientes.</p>
            </header>

            <div className="booking-quick-dates">
              <button type="button" onClick={() => seleccionarFechaRapida(0)}>Hoy</button>
              <button type="button" onClick={() => seleccionarFechaRapida(1)}>Mañana</button>
              <button type="button" onClick={() => seleccionarFechaRapida(3)}>En 3 días</button>
              <button type="button" onClick={() => seleccionarFechaRapida(7)}>Próxima semana</button>
            </div>

            <label className="booking-date-field">
              <span>FECHA DEL TURNO</span>
              <div>
                <i className="far fa-calendar" />
                <input
                  type="date"
                  value={fecha}
                  min={hoy}
                  onChange={(e) => { setFecha(e.target.value); setError(''); }}
                />
              </div>
            </label>

            <div className="booking-date-note">
              <i className="fas fa-wand-magic-sparkles" />
              <div><strong>Agenda inteligente</strong><span>Solo vas a ver horarios realmente disponibles para este servicio.</span></div>
            </div>

            <footer>
              <button className="booking-secondary-action" onClick={() => setPaso(1)}>
                <i className="fas fa-arrow-left" /> Cambiar servicio
              </button>
              <button className="booking-primary-action" onClick={selectFecha}>
                Ver horarios <i className="fas fa-arrow-right" />
              </button>
            </footer>
          </div>
        </section>
      )}

      {paso === 3 && (
        <div className="smart-booking-page">
          <section className="smart-booking-header">
            <div>
              <span className="smart-booking-kicker">AGENDA INTELIGENTE</span>
              <h3>Elegí el horario que mejor aprovecha el día</h3>
              <p>{analisisAgenda?.resumenInteligente || 'Estamos analizando la agenda del profesional.'}</p>
            </div>
            <div className="smart-booking-context">
              <span>{servicioSeleccionado?.nombre}</span>
              <strong>{fecha}</strong>
              <small>{servicioSeleccionado?.duracionMin} minutos</small>
            </div>
          </section>

          {loadingSlots ? (
            <div className="smart-analysis-loading">
              <div className="spinner"></div>
              <strong>Analizando la agenda</strong>
              <span>Buscamos las opciones que dejan menos tiempo muerto.</span>
            </div>
          ) : slots.length === 0 ? (
            <section className="booking-empty-state">
              <div className="booking-empty-visual">
                <span><i className={profesionalNoAtiende ? 'far fa-calendar-xmark' : 'fas fa-hourglass-half'} /></span>
                <i className="fas fa-sparkles" />
              </div>
              <span className="booking-empty-kicker">
                {profesionalNoAtiende ? 'DÍA SIN ATENCIÓN' : 'AGENDA COMPLETA'}
              </span>
              <h3>{profesionalNoAtiende ? 'Este día no forma parte de su agenda' : 'Todos los horarios están ocupados'}</h3>
              <p>
                {profesionalNoAtiende
                  ? `${nombreProfesional} no configuró atención para esta fecha. Elegí otro día para ver nuevas opciones.`
                  : 'Podés elegir otra fecha o sumarte a la lista de espera para aprovechar una cancelación.'}
              </p>

              {enEspera ? (
                <div className="booking-waitlist-success">
                  <i className="fas fa-check" />
                  <div><strong>Ya estás en la lista</strong><span>Te avisaremos si se libera un turno.</span></div>
                </div>
              ) : (
                <div className="booking-empty-actions">
                  <button className="booking-primary-action" onClick={() => setPaso(2)}>
                    <i className="far fa-calendar" /> Elegir otra fecha
                  </button>
                  {!profesionalNoAtiende && (
                    <button className="booking-secondary-action" onClick={anotarmeEnEspera} disabled={saving}>
                      <i className="fas fa-hourglass-half" /> {saving ? 'Registrando...' : 'Unirme a la lista de espera'}
                    </button>
                  )}
                </div>
              )}

              <button className="booking-empty-back" onClick={() => setPaso(1)}>
                <i className="fas fa-arrow-left" /> Cambiar servicio
              </button>
            </section>
          ) : (
            <>
              <section className="smart-recommendations">
                <header>
                  <div><span>MEJORES OPCIONES</span><h4>Selección inteligente</h4></div>
                  <small><i className="fas fa-sparkles" /> Según la distribución actual</small>
                </header>
                <div className="smart-slots-featured">
                  {slotsRecomendados.map((slot, i) => renderSlot(slot, i))}
                </div>
              </section>

              {otrosSlots.length > 0 && (
                <section className="smart-other-times">
                  <header>
                    <div><span>MÁS ALTERNATIVAS</span><h4>Otros horarios disponibles</h4></div>
                    <small>{otrosSlots.length} opciones</small>
                  </header>
                  <div className="smart-slots-compact">
                    {otrosSlots.map((slot, i) => renderSlot(slot, i, true))}
                  </div>
                </section>
              )}
            </>
          )}

          {slots.length > 0 && <div style={{ marginTop: '20px' }}>
            <button className="btn btn-outline" onClick={() => setPaso(2)}>
              <i className="fas fa-arrow-left"></i> Volver
            </button>
          </div>}
        </div>
      )}

      {paso === 4 && (
        <section className="booking-confirmation-layout">
          <div className="booking-confirmation-card">
            <header>
              <div>
                <span>PASO FINAL</span>
                <h3>Revisá los datos de tu turno</h3>
                <p>La reserva se enviará al profesional para su confirmación.</p>
              </div>
              <div className="booking-confirmation-status"><i className="fas fa-lock" /> Reserva segura</div>
            </header>

            <div className="booking-confirmation-main">
              <div className="booking-confirmation-date">
                <span>{mesReserva}</span>
                <strong>{fechaReserva?.getDate()}</strong>
                <small>{slotSeleccionado?.horaInicio || slotSeleccionado?.hora}</small>
              </div>

              <div className="booking-confirmation-info">
                <span>SERVICIO SELECCIONADO</span>
                <h4>{servicioSeleccionado?.nombre}</h4>
                <p><i className="far fa-calendar" /> {fechaLegible}</p>
                <p><i className="far fa-clock" /> {servicioSeleccionado?.duracionMin} minutos de duración</p>
              </div>

              <div className="booking-confirmation-price">
                <span>VALOR DEL SERVICIO</span>
                <strong>${Number(servicioSeleccionado?.precio).toLocaleString('es-AR')}</strong>
                <small>Pago coordinado con el profesional</small>
              </div>
            </div>

            <div className="booking-confirmation-professional">
              <div className="booking-confirmation-avatar">
                {(nombreProfesional || 'P').split(' ').map((part) => part[0]).join('').slice(0, 2)}
              </div>
              <div><span>PROFESIONAL</span><strong>{nombreProfesional}</strong></div>
              <small><i className="fas fa-circle" /> Perfil verificado</small>
            </div>

            {slotSeleccionado?.motivoPrincipal && (
              <div className="booking-confirmation-reason">
                <i className="fas fa-wand-magic-sparkles" />
                <div>
                  <span>ELECCIÓN INTELIGENTE</span>
                  <strong>{slotSeleccionado.motivoPrincipal}</strong>
                </div>
                <small>Recomendado</small>
              </div>
            )}

            <footer>
              <button className="booking-secondary-action" onClick={() => setPaso(3)}>
                <i className="fas fa-arrow-left" /> Cambiar horario
              </button>
              <button className="booking-primary-action booking-confirm-action" onClick={confirmarReserva} disabled={saving}>
                {saving ? (
                  <><i className="fas fa-spinner fa-spin" /> Confirmando...</>
                ) : (
                  <><i className="fas fa-check" /> Confirmar reserva</>
                )}
              </button>
            </footer>
          </div>

          <aside className="booking-next-steps">
            <span>DESPUÉS DE RESERVAR</span>
            <h3>Todo listo para tu turno.</h3>
            <div><i className="fas fa-check" /><p><strong>Solicitud registrada</strong><small>El turno aparecerá en “Mis turnos”.</small></p></div>
            <div><i className="fas fa-bell" /><p><strong>Seguimiento simple</strong><small>Podrás consultar su estado desde tu cuenta.</small></p></div>
            <div><i className="fas fa-calendar-check" /><p><strong>Gestión en un lugar</strong><small>Si lo necesitás, podrás cancelar o reprogramar.</small></p></div>
            <p className="booking-next-note"><i className="fas fa-shield-halved" /> Tus datos se utilizan únicamente para gestionar la reserva.</p>
          </aside>
        </section>
      )}
    </div>
  );
}
