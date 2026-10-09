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
    `${client.nombre} ${client.apellido} ${client.email}`.toLocaleLowerCase('es-AR')
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
        <h2>Nuevo turno</h2><p>Reservá un horario para un cliente existente.</p></div>
        <Link className="appointment-hero-link" to="/agenda">Volver a la agenda</Link></section>
      {loading ? <div className="spinner" /> : <form className="appointment-workspace-card" onSubmit={submit}>
        <div className="appointment-workspace-heading"><span>DATOS DE LA RESERVA</span><h3>Elegí a quién vas a atender</h3></div>
        {error && <p className="appointment-feedback error" role="alert">{error}</p>}
        {success && <p className="appointment-feedback success" role="status">{success} <Link to="/agenda">Ver agenda</Link></p>}
        <label className="form-label" htmlFor="client-search">Buscar cliente</label>
        <input id="client-search" className="form-input" type="search" placeholder="Nombre o correo"
          value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="form-label" htmlFor="client-select">Cliente</label>
        <select id="client-select" className="form-select" value={clientId}
          onChange={(event) => setClientId(event.target.value)} required>
          <option value="">Seleccioná un cliente</option>
          {matchingClients.map((client) => <option key={client.idUsuario} value={client.idUsuario}>
            {client.apellido}, {client.nombre} · {client.email}</option>)}
        </select>
        {clients.length === 0 && <p className="appointment-help">Todavía no hay clientes registrados.</p>}
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
