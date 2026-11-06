import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { servicios, turnos } from '../services/api';
import AppointmentSlotPicker from '../components/AppointmentSlotPicker';

export default function NuevoTurno() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Alta rápida de una persona que todavía no es cliente de la app (demanda espontánea)
  const [nuevo, setNuevo] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', apellido: '', telefono: '', email: '' });
  const [errorCliente, setErrorCliente] = useState('');
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  const contactoDe = (client) => client.email || client.telefono || 'sin contacto';

  function cambiarNuevoCliente(campo, valor) {
    setNuevoCliente((actual) => ({ ...actual, [campo]: valor }));
  }

  async function crearCliente() {
    setErrorCliente('');
    if (!nuevoCliente.nombre.trim() || !nuevoCliente.apellido.trim()) {
      setErrorCliente('Completá nombre y apellido.');
      return;
    }
    if (!nuevoCliente.telefono.trim() && !nuevoCliente.email.trim()) {
      setErrorCliente('Indicá al menos un teléfono o un email.');
      return;
    }
    setGuardandoCliente(true);
    try {
      const respuesta = await turnos.createClient(nuevoCliente);
      const lista = await turnos.getClients();
      setClients(Array.isArray(lista) ? lista : []);
      setClientId(String(respuesta.idUsuario));
      setSearch('');
      setNuevo(false);
      setNuevoCliente({ nombre: '', apellido: '', telefono: '', email: '' });
    } catch (requestError) {
      setErrorCliente(requestError.message || 'No se pudo cargar el cliente.');
    } finally {
      setGuardandoCliente(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([turnos.getClients(), servicios.getByProfesional(user.idProfesional)])
      .then(([clientRows, serviceRows]) => {
        if (!active) return;
        setClients(Array.isArray(clientRows) ? clientRows : []);
        setServices(Array.isArray(serviceRows) ? serviceRows : []);
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.idProfesional]);

  const matchingClients = clients.filter((client) =>
    `${client.nombre} ${client.apellido} ${client.email || ''} ${client.telefono || ''}`.toLocaleLowerCase('es-AR')
      .includes(search.toLocaleLowerCase('es-AR')));

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!clientId || !serviceId || !date || !time) {
      setError('Elegí cliente, servicio, fecha y horario.');
      return;
    }
    setSaving(true);
    try {
      await turnos.create({ idCliente: Number(clientId), idServicio: Number(serviceId),
        idProfesional: user.idProfesional, fecha: date, horaInicio: time });
      setSuccess('El turno quedó creado como pendiente. Podés verlo en la agenda.');
      setDate('');
      setTime('');
    } catch (requestError) {
      setError(requestError.message || 'No se pudo crear el turno.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pro-module-page appointment-workspace">
      <section className="module-hero"><div><span className="module-kicker">AGENDA PROFESIONAL</span>
        <h2>Nuevo turno</h2><p>Reservá un horario para un cliente, o cargá uno nuevo si todavía no tiene cuenta.</p></div>
        <Link className="appointment-hero-link" to="/agenda">Volver a la agenda</Link></section>
      {loading ? <div className="spinner" /> : <form className="appointment-workspace-card" onSubmit={submit}>
        <div className="appointment-workspace-heading"><span>DATOS DE LA RESERVA</span><h3>Elegí a quién vas a atender</h3></div>
        {error && <p className="appointment-feedback error" role="alert">{error}</p>}
        {success && <p className="appointment-feedback success" role="status">{success} <Link to="/agenda">Ver agenda</Link></p>}
        <label className="form-label" htmlFor="client-search">Buscar cliente</label>
        <input id="client-search" className="form-input" type="search" placeholder="Nombre, correo o teléfono"
          value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="form-label" htmlFor="client-select">Cliente</label>
        <select id="client-select" className="form-select" value={clientId}
          onChange={(event) => setClientId(event.target.value)} required>
          <option value="">Seleccioná un cliente</option>
          {matchingClients.map((client) => <option key={client.idUsuario} value={client.idUsuario}>
            {client.apellido}, {client.nombre} · {contactoDe(client)}{client.cuentaActiva === false ? ' · sin cuenta' : ''}</option>)}
        </select>
        {clients.length === 0 && <p className="appointment-help">Todavía no hay clientes registrados.</p>}
        {!nuevo ? (
          <button type="button" className="appointment-text-button" onClick={() => setNuevo(true)}>
            <i className="fas fa-user-plus" /> ¿No está en la lista? Cargar cliente nuevo
          </button>
        ) : (
          <div className="appointment-new-client" style={{ border: '1px dashed var(--border, #c9d1de)', borderRadius: 12, padding: 16, margin: '8px 0', display: 'grid', gap: 8 }}>
            <strong>Cliente nuevo (sin cuenta)</strong>
            <p className="appointment-help">Cargá al menos un teléfono o un email. Si después se registra con ese email, conserva sus turnos.</p>
            {errorCliente && <p className="appointment-feedback error" role="alert">{errorCliente}</p>}
            <input className="form-input" placeholder="Nombre" aria-label="Nombre" value={nuevoCliente.nombre} onChange={(e) => cambiarNuevoCliente('nombre', e.target.value)} />
            <input className="form-input" placeholder="Apellido" aria-label="Apellido" value={nuevoCliente.apellido} onChange={(e) => cambiarNuevoCliente('apellido', e.target.value)} />
            <input className="form-input" type="tel" placeholder="Teléfono" aria-label="Teléfono" value={nuevoCliente.telefono} onChange={(e) => cambiarNuevoCliente('telefono', e.target.value)} />
            <input className="form-input" type="email" placeholder="Email (opcional si cargás teléfono)" aria-label="Email" value={nuevoCliente.email} onChange={(e) => cambiarNuevoCliente('email', e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="module-primary-btn" onClick={crearCliente} disabled={guardandoCliente}>{guardandoCliente ? 'Guardando…' : 'Guardar cliente'}</button>
              <button type="button" className="appointment-text-button" onClick={() => { setNuevo(false); setErrorCliente(''); }}>Cancelar</button>
            </div>
          </div>
        )}
        <label className="form-label" htmlFor="service-select">Servicio</label>
        <select id="service-select" className="form-select" value={serviceId} required
          onChange={(event) => { setServiceId(event.target.value); setDate(''); setTime(''); }}>
          <option value="">Seleccioná un servicio</option>
          {services.map((service) => <option key={service.idServicio} value={service.idServicio}>
            {service.nombre} · {service.duracionMin} min</option>)}
        </select>
        {serviceId && <AppointmentSlotPicker key={serviceId} professionalId={user.idProfesional}
          serviceId={Number(serviceId)} date={date} onDateChange={setDate}
          time={time} onTimeChange={setTime} />}
        <div className="appointment-workspace-actions"><button className="module-primary-btn" type="submit"
          disabled={saving || !clientId || !serviceId || !time}>{saving ? 'Guardando…' : 'Crear turno'}</button></div>
      </form>}
    </div>
  );
}
