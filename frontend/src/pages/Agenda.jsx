import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { turnos, huecos as huecosApi } from '../services/api';
import AppointmentSlotPicker from '../components/AppointmentSlotPicker';
import { fechaLocal, horaCorta } from '../utils/fecha';
import { duracionTexto } from '../utils/huecos';
import {
  semanaDe, indiceEnSemana, cuadriculaMes, rangoDeVista, moverFecha, minutosDeHora,
} from '../utils/agendaFechas';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const ENCABEZADO_MES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const VISTAS = [{ id: 'dia', label: 'Día' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }];
const CLAVE_VISTA = 'smartagenda-agenda-vista';

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// La vista elegida se recuerda en el navegador; si no se puede leer, arranca en la semana.
function vistaGuardada() {
  try {
    const guardada = localStorage.getItem(CLAVE_VISTA);
    return VISTAS.some((vista) => vista.id === guardada) ? guardada : 'semana';
  } catch {
    return 'semana';
  }
}

function formatDateShort(date) {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function nombreCliente(turno) {
  return turno.cliente_nombre ? `${turno.cliente_nombre} ${turno.cliente_apellido || ''}` : turno.nombreCliente || turno.cliente || 'Cliente';
}

function textoTurnos(cantidad) {
  if (cantidad === 0) return 'sin turnos';
  return cantidad === 1 ? '1 turno' : `${cantidad} turnos`;
}

export default function Agenda() {
  const { user } = useAuth();
  const [vista, setVista] = useState(vistaGuardada);
  // Día seleccionado: es el mismo para las tres vistas, así no se pierde al cambiar de una a otra
  const [baseDate, setBaseDate] = useState(() => new Date());
  // Turnos del rango que se está viendo (el rango identifica a qué pedido pertenecen)
  const [datos, setDatos] = useState({ rango: '', lista: [] });
  const [recarga, setRecarga] = useState(0);
  const [selectedTurno, setSelectedTurno] = useState(null);
  // Reprogramación del turno abierto en el detalle
  const [reprogramando, setReprogramando] = useState(false);
  const [fechaNueva, setFechaNueva] = useState('');
  const [horaNueva, setHoraNueva] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorReprogramar, setErrorReprogramar] = useState('');
  const [aviso, setAviso] = useState('');
  // Huecos (espacios libres) del rango que se está viendo (la vista mensual no los usa)
  const [huecosRango, setHuecosRango] = useState(null);

  const weekDates = semanaDe(baseDate);
  // En celulares la semana muestra un día por vez: es el día seleccionado
  const diaSeleccionado = indiceEnSemana(baseDate);
  const { desde, hasta } = rangoDeVista(vista, baseDate);
  const desdeStr = fechaLocal(desde);
  const hastaStr = fechaLocal(hasta);
  const rangoKey = `${desdeStr}|${hastaStr}`;
  const turnosList = datos.lista;
  const loading = datos.rango !== rangoKey;
  const mostrarHuecos = vista !== 'mes';

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ idProfesional: user.idProfesional, fechaDesde: desdeStr, fechaHasta: hastaStr });
    const rango = `${desdeStr}|${hastaStr}`;
    turnos.getAll(params.toString())
      .then((data) => { if (active) setDatos({ rango, lista: Array.isArray(data) ? data : [] }); })
      .catch(() => { if (active) setDatos({ rango, lista: [] }); });
    return () => { active = false; };
  }, [desdeStr, hastaStr, user.idProfesional, recarga]);

  // Se recalculan cada vez que cambia el rango o los turnos (reserva, cancelación, reprogramación)
  useEffect(() => {
    if (!mostrarHuecos) return undefined;
    let active = true;
    const rango = `${desdeStr}|${hastaStr}`;
    huecosApi.get(user.idProfesional, desdeStr, hastaStr)
      .then((data) => { if (active) setHuecosRango({ rango, data }); })
      .catch(() => { if (active) setHuecosRango(null); });
    return () => { active = false; };
  }, [user.idProfesional, desdeStr, hastaStr, mostrarHuecos, turnosList]);

  const huecosSemana = mostrarHuecos && huecosRango?.rango === rangoKey ? huecosRango.data : null;

  function cambiarVista(nueva) {
    setVista(nueva);
    try { localStorage.setItem(CLAVE_VISTA, nueva); } catch { /* sin almacenamiento: no se recuerda la vista */ }
  }

  function mover(direccion) {
    setBaseDate((actual) => moverFecha(vista, actual, direccion));
  }

  function goToday() {
    setBaseDate(new Date());
  }

  function abrirDia(fecha) {
    setBaseDate(fecha);
    cambiarVista('dia');
  }

  // Selector de día (celular): flechas para moverse, Inicio/Fin para ir al lunes/domingo
  function handleDiaKeyDown(e) {
    const destinos = { ArrowRight: diaSeleccionado + 1, ArrowLeft: diaSeleccionado - 1, Home: 0, End: 6 };
    if (!(e.key in destinos)) return;
    e.preventDefault();
    const nuevo = Math.min(6, Math.max(0, destinos[e.key]));
    setBaseDate(weekDates[nuevo]);
    document.getElementById(`agenda-dia-${nuevo}`)?.focus();
  }

  function getTurnosByDate(fecha) {
    return turnosList.filter((t) => t.fecha === fecha);
  }

  function cerrarDetalle() {
    setSelectedTurno(null);
    setReprogramando(false);
    setErrorReprogramar('');
  }

  function abrirReprogramar() {
    setFechaNueva(selectedTurno.fecha < fechaLocal() ? '' : selectedTurno.fecha);
    setHoraNueva('');
    setErrorReprogramar('');
    setReprogramando(true);
  }

  async function guardarReprogramacion(event) {
    event.preventDefault();
    if (!fechaNueva || !horaNueva) return;
    setGuardando(true);
    setErrorReprogramar('');
    try {
      await turnos.update({ idTurno: selectedTurno.idTurno, accion: 'reprogramar',
        fecha: fechaNueva, horaInicio: horaNueva });
      // Se muestra el día del nuevo horario para que el cambio quede a la vista
      const [anio, mes, dia] = fechaNueva.split('-').map(Number);
      setBaseDate(new Date(anio, mes - 1, dia));
      setAviso(`Turno reprogramado para el ${dia}/${mes} a las ${horaNueva}.`);
      cerrarDetalle();
    } catch (err) {
      setErrorReprogramar(err.message || 'No se pudo reprogramar el turno.');
    } finally {
      setGuardando(false);
    }
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
      cerrarDetalle();
      setRecarga((n) => n + 1);
    } catch (err) {
      alert(err.message || 'Error al actualizar el turno.');
    }
  }

  const hoy = fechaLocal(new Date());
  const baseStr = fechaLocal(baseDate);
  // Turnos que cuentan en el resumen: los del día, la semana o el mes mostrado (sin los días de relleno de la grilla)
  const turnosVista = vista === 'mes' ? turnosList.filter((t) => t.fecha.slice(0, 7) === baseStr.slice(0, 7)) : turnosList;
  const totalVista = turnosVista.length;
  const confirmados = turnosVista.filter((t) => String(t.estado).toLowerCase() === 'confirmado').length;

  const titulos = {
    dia: { h2: 'Agenda del día', texto: 'Cada franja horaria con sus turnos y los espacios libres.' },
    semana: { h2: 'Semana de trabajo', texto: 'Revisá tus próximas atenciones y gestioná cada turno desde un solo lugar.' },
    mes: { h2: 'Agenda del mes', texto: 'La carga de cada día de un vistazo. Tocá un día para ver su detalle.' },
  }[vista];
  const esHoyBase = baseStr === hoy;
  const etiquetaToolbar = {
    dia: { kicker: esHoyBase ? 'HOY' : 'DÍA', titulo: mayuscula(`${DIAS_LARGOS[baseDate.getDay()]} ${baseDate.getDate()} de ${MESES[baseDate.getMonth()]}`) },
    semana: { kicker: weekDates.some((d) => fechaLocal(d) === hoy) ? 'SEMANA ACTUAL' : 'SEMANA', titulo: `${formatDateShort(weekDates[0])} — ${formatDateShort(weekDates[6])}` },
    mes: { kicker: baseDate.getMonth() === new Date().getMonth() && baseDate.getFullYear() === new Date().getFullYear() ? 'MES ACTUAL' : 'MES', titulo: mayuscula(MESES[baseDate.getMonth()]) },
  }[vista];
  const unidad = { dia: 'día', semana: 'semana', mes: 'mes' }[vista];

  function renderDia() {
    const turnosDia = getTurnosByDate(baseStr).sort((a, b) => minutosDeHora(a.horaInicio) - minutosDeHora(b.horaInicio));
    const huecosDia = huecosSemana?.dias.find((d) => d.fecha === baseStr)?.huecos || [];
    const items = [
      ...turnosDia.map((t) => ({ tipo: 'turno', ini: minutosDeHora(t.horaInicio), fin: minutosDeHora(t.horaFin), turno: t })),
      ...huecosDia.map((h) => ({ tipo: 'hueco', ini: minutosDeHora(h.horaInicio), fin: minutosDeHora(h.horaFin), hueco: h })),
    ];
    if (items.length === 0) {
      return <div className="agenda-day-empty agenda-dia-vacio"><i className="far fa-calendar" /><span>Sin turnos ni horarios de atención este día</span></div>;
    }
    const primera = Math.floor(Math.min(...items.map((i) => i.ini)) / 60);
    const ultima = Math.max(primera + 1, Math.ceil(Math.max(...items.map((i) => i.fin)) / 60));
    const franjas = [];
    for (let hora = primera; hora < ultima; hora += 1) {
      // Lo que empezó en una franja anterior y sigue en curso al comenzar esta (un hueco largo o un turno de más de una hora)
      const continua = items.filter((i) => i.ini < hora * 60 && i.fin > hora * 60).sort((a, b) => b.fin - a.fin)[0];
      franjas.push({ hora, continua, items: items.filter((i) => Math.floor(i.ini / 60) === hora).sort((a, b) => a.ini - b.ini) });
    }
    return (
      <ol className="agenda-dia-franjas" aria-label={`Franjas horarias del ${baseDate.getDate()} de ${MESES[baseDate.getMonth()]}`}>
        {franjas.map((franja) => (
          <li key={franja.hora} className={`agenda-franja ${franja.items.length === 0 && !franja.continua ? 'is-libre' : ''}`}>
            <time>{String(franja.hora).padStart(2, '0')}:00</time>
            <div className="agenda-franja-items">
              {franja.items.length === 0 && franja.continua && (
                <div className={`agenda-franja-continua ${franja.continua.tipo === 'hueco' ? 'is-hueco' : 'is-turno'}`}>
                  {franja.continua.tipo === 'hueco'
                    ? `Libre hasta las ${franja.continua.hueco.horaFin}`
                    : `En curso hasta las ${horaCorta(franja.continua.turno.horaFin)} · ${nombreCliente(franja.continua.turno)}`}
                </div>
              )}
              {franja.items.map((item) => item.tipo === 'turno' ? (
                <button key={`t${item.turno.idTurno}`} type="button" className={`modern-calendar-event agenda-franja-turno ${(item.turno.estado || '').toLowerCase()}`} onClick={() => setSelectedTurno(item.turno)}>
                  <time>{horaCorta(item.turno.horaInicio)} – {horaCorta(item.turno.horaFin)}</time>
                  <strong>{nombreCliente(item.turno)}</strong>
                  <span>{item.turno.servicio_nombre || item.turno.nombreServicio || item.turno.servicio || 'Servicio'}</span>
                  <em className={`badge badge-${(item.turno.estado || '').toLowerCase()}`}>{item.turno.estado}</em>
                </button>
              ) : (
                <div key={`h${item.hueco.horaInicio}`} className={`agenda-franja-hueco ${item.hueco.aprovechable ? 'is-aprovechable' : 'is-muerto'}`}
                  title={item.hueco.aprovechable ? 'Hueco libre: se puede reservar un servicio' : 'Hueco muy corto: no alcanza para ningún servicio'}>
                  <i className={item.hueco.aprovechable ? 'far fa-clock' : 'fas fa-ban'} />
                  <time>{item.hueco.horaInicio} – {item.hueco.horaFin}</time>
                  <small>{duracionTexto(item.hueco.duracionMin)}{item.hueco.aprovechable ? ' libres' : ' · corto'}</small>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  function renderMes() {
    const porDia = new Map();
    turnosList.forEach((t) => porDia.set(t.fecha, (porDia.get(t.fecha) || 0) + 1));
    return (
      <section className="agenda-mes" aria-label={`Calendario de ${MESES[baseDate.getMonth()]} de ${baseDate.getFullYear()}`}>
        <div className="agenda-mes-cabecera" aria-hidden="true">{ENCABEZADO_MES.map((dia) => <span key={dia}>{dia}</span>)}</div>
        <div className="agenda-mes-grilla">
          {cuadriculaMes(baseDate).map((fecha) => {
            const fechaStr = fechaLocal(fecha);
            const cantidad = porDia.get(fechaStr) || 0;
            const nivel = cantidad >= 4 ? 3 : cantidad >= 2 ? 2 : cantidad === 1 ? 1 : 0;
            const clases = ['agenda-mes-dia', `nivel-${nivel}`,
              fecha.getMonth() !== baseDate.getMonth() && 'is-outside', fechaStr === hoy && 'is-today', fechaStr === baseStr && 'is-selected'].filter(Boolean).join(' ');
            return (
              <button key={fechaStr} type="button" className={clases} onClick={() => abrirDia(fecha)}
                aria-label={`${fecha.getDate()} de ${MESES[fecha.getMonth()]}: ${textoTurnos(cantidad)}`}>
                <strong>{fecha.getDate()}</strong>
                {cantidad > 0 && <span className="agenda-mes-count"><b>{cantidad}</b><small>{cantidad === 1 ? 'turno' : 'turnos'}</small></span>}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="agenda-page pro-module-page">
      <section className="module-hero agenda-module-hero">
        <div>
          <span className="module-kicker">AGENDA OPERATIVA</span>
          <h2>{titulos.h2}</h2>
          <p>{titulos.texto}</p>
        </div>
        <div className="agenda-hero-summary"><div><span>Turnos</span><strong>{totalVista}</strong></div><div><span>Confirmados</span><strong>{confirmados}</strong></div></div>
      </section>

      <div className="agenda-primary-actions">
        <Link className="module-primary-btn" to="/nuevo-turno"><i className="fas fa-plus" /> Crear turno</Link>
        <Link className="appointment-hero-link" to="/historial-turnos"><i className="fas fa-history" /> Ver historial</Link>
      </div>

      {aviso && <p className="appointment-feedback success agenda-aviso" role="status">
        <i className="fas fa-check-circle" /> {aviso}
        <button type="button" onClick={() => setAviso('')} aria-label="Cerrar aviso"><i className="fas fa-times" /></button>
      </p>}

      <section className="agenda-toolbar">
        <div><span>{etiquetaToolbar.kicker}</span><h3>{etiquetaToolbar.titulo} <small>{vista === 'semana' ? weekDates[0].getFullYear() : baseDate.getFullYear()}</small></h3></div>
        <div className="agenda-view-switch" role="group" aria-label="Vista de la agenda">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" aria-pressed={vista === v.id} className={vista === v.id ? 'is-active' : ''} onClick={() => cambiarVista(v.id)}>{v.label}</button>
          ))}
        </div>
        <div className="calendar-nav">
          <button onClick={() => mover(-1)} title={`${mayuscula(unidad)} anterior`} aria-label={`${mayuscula(unidad)} anterior`}><i className="fas fa-chevron-left" /></button>
          <button onClick={goToday} className="calendar-today">Ir a hoy</button>
          <button onClick={() => mover(1)} title={`${mayuscula(unidad)} siguiente`} aria-label={`${mayuscula(unidad)} siguiente`}><i className="fas fa-chevron-right" /></button>
        </div>
      </section>

      {huecosSemana && huecosSemana.resumen.cantidadHuecos > 0 && (
        <p className="agenda-huecos-resumen">
          <i className="far fa-clock" />
          <span><strong>{duracionTexto(huecosSemana.resumen.minutosAprovechables)}</strong> libres para reservar {vista === 'dia' ? 'este día' : 'esta semana'}
            {huecosSemana.resumen.minutosMuertos > 0 && <> · {duracionTexto(huecosSemana.resumen.minutosMuertos)} en huecos muy cortos</>}</span>
        </p>
      )}

      {vista === 'semana' && (
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
                onClick={() => setBaseDate(date)}
                onKeyDown={handleDiaKeyDown}
              >
                <span>{DIAS_SEMANA[date.getDay()]}</span>
                <strong>{date.getDate()}</strong>
                <small>{cantidad > 0 ? cantidad : '·'}</small>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="spinner"></div>
      ) : vista === 'dia' ? renderDia() : vista === 'mes' ? renderMes() : (
        <section className="modern-week-grid">
          {weekDates.map((date, i) => {
            const fechaStr = fechaLocal(date);
            const esHoy = fechaStr === hoy;
            const turnosDelDia = getTurnosByDate(fechaStr);
            const dayIndex = date.getDay();
            const huecosDelDia = huecosSemana?.dias.find((d) => d.fecha === fechaStr)?.huecos || [];

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
                {huecosDelDia.length > 0 && (
                  <ul className="agenda-huecos" aria-label={`Huecos del ${DIAS_SEMANA[dayIndex]}`}>
                    {huecosDelDia.map((hueco) => (
                      <li key={hueco.horaInicio} className={hueco.aprovechable ? 'is-aprovechable' : 'is-muerto'}
                        title={hueco.aprovechable ? 'Hueco libre: se puede reservar un servicio' : 'Hueco muy corto: no alcanza para ningún servicio'}>
                        <i className={hueco.aprovechable ? 'far fa-clock' : 'fas fa-ban'} />
                        <time>{hueco.horaInicio} – {hueco.horaFin}</time>
                        <small>{duracionTexto(hueco.duracionMin)}{hueco.aprovechable ? '' : ' · corto'}</small>
                      </li>
                    ))}
                  </ul>
                )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {selectedTurno && (
        <div className="modal-overlay module-modal-overlay" onClick={cerrarDetalle}>
          <div className="modal module-modal appointment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span>{reprogramando ? 'CAMBIAR FECHA Y HORARIO' : 'DETALLE DE ATENCIÓN'}</span>
                <h3>{reprogramando ? 'Reprogramar turno' : `${horaCorta(selectedTurno.horaInicio)} · ${selectedTurno.fecha}`}</h3>
              </div>
              <button className="modal-close" onClick={cerrarDetalle} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {reprogramando ? (
              <form onSubmit={guardarReprogramacion} className="appointment-modal-content">
                <p>Elegí un horario disponible para {selectedTurno.servicio_nombre || 'el servicio'} de {selectedTurno.cliente_nombre ? `${selectedTurno.cliente_nombre} ${selectedTurno.cliente_apellido || ''}` : 'tu cliente'}.</p>
                {errorReprogramar && <p className="appointment-feedback error" role="alert">{errorReprogramar}</p>}
                <AppointmentSlotPicker key={selectedTurno.idTurno} professionalId={selectedTurno.idProfesional}
                  serviceId={selectedTurno.idServicio} excludedAppointmentId={selectedTurno.idTurno}
                  date={fechaNueva} onDateChange={setFechaNueva} time={horaNueva} onTimeChange={setHoraNueva} />
                <div className="appointment-workspace-actions">
                  <button type="button" className="appointment-text-button" onClick={() => setReprogramando(false)}>Volver</button>
                  <button type="submit" className="module-primary-btn" disabled={!horaNueva || guardando}>
                    {guardando ? 'Guardando…' : 'Confirmar cambio'}
                  </button>
                </div>
              </form>
            ) : (
              <>
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
                      <button className="btn btn-outline btn-sm" onClick={abrirReprogramar}>
                        <i className="far fa-calendar-alt"></i> Reprogramar
                      </button>
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
                  <button className="btn btn-outline btn-sm" onClick={cerrarDetalle}>
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
