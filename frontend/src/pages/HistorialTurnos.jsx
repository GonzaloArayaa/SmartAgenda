import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { turnos } from '../services/api';

const states = [
  ['todos', 'Todos los estados'], ['pendiente', 'Pendiente'], ['confirmado', 'Confirmado'],
  ['finalizado', 'Finalizado'], ['cancelado', 'Cancelado'], ['vencido', 'Vencido'],
];

const emptyFilters = { fechaDesde: '', fechaHasta: '', estado: 'todos', idServicio: '', idCliente: '' };

export default function HistorialTurnos() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([turnos.getClients('', true), turnos.getHistoryServices()])
      .then(([clientRows, serviceRows]) => {
        if (!active) return;
        setClients(Array.isArray(clientRows) ? clientRows : []);
        setServices(Array.isArray(serviceRows) ? serviceRows : []);
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [user.idProfesional]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ idProfesional: user.idProfesional });
    Object.entries(applied).forEach(([key, value]) => {
      if (value && value !== 'todos') params.set(key, value);
    });
    turnos.getAll(params.toString())
      .then((data) => { if (active) { setRows(Array.isArray(data) ? data : []); setError(''); } })
      .catch((requestError) => { if (active) { setRows([]); setError(requestError.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied, user.idProfesional]);

  function change(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function apply(event) {
    event.preventDefault();
    if (filters.fechaDesde && filters.fechaHasta && filters.fechaDesde > filters.fechaHasta) {
      setError('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    setLoading(true);
    setApplied({ ...filters });
  }

  function clear() {
    setFilters({ ...emptyFilters });
    setLoading(true);
    setApplied({ ...emptyFilters });
  }

  return (
    <div className="pro-module-page appointment-workspace">
      <section className="module-hero"><div><span className="module-kicker">AGENDA PROFESIONAL</span>
        <h2>Historial de turnos</h2><p>Encontrá una atención por fecha, estado, servicio o cliente.</p></div>
        <Link className="appointment-hero-link" to="/nuevo-turno">Crear turno</Link></section>
      <form className="appointment-filter-card" onSubmit={apply}>
        <div><label htmlFor="history-from">Desde</label><input id="history-from" type="date" className="form-input"
          value={filters.fechaDesde} onChange={(event) => change('fechaDesde', event.target.value)} /></div>
        <div><label htmlFor="history-to">Hasta</label><input id="history-to" type="date" className="form-input"
          value={filters.fechaHasta} onChange={(event) => change('fechaHasta', event.target.value)} /></div>
        <div><label htmlFor="history-status">Estado</label><select id="history-status" className="form-select"
          value={filters.estado} onChange={(event) => change('estado', event.target.value)}>
          {states.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><label htmlFor="history-service">Servicio</label><select id="history-service" className="form-select"
          value={filters.idServicio} onChange={(event) => change('idServicio', event.target.value)}>
          <option value="">Todos los servicios</option>
          {services.map((service) => <option key={service.idServicio} value={service.idServicio}>{service.nombre}</option>)}
        </select></div>
        <div><label htmlFor="history-client">Cliente</label><select id="history-client" className="form-select"
          value={filters.idCliente} onChange={(event) => change('idCliente', event.target.value)}>
          <option value="">Todos los clientes</option>
          {clients.map((client) => <option key={client.idUsuario} value={client.idUsuario}>
            {client.apellido}, {client.nombre}</option>)}
        </select></div>
        <div className="appointment-filter-actions"><button type="submit" className="module-primary-btn">Filtrar</button>
          <button type="button" className="appointment-text-button" onClick={clear}>Limpiar</button></div>
      </form>
      {error && <p className="appointment-feedback error" role="alert">{error}</p>}
      {loading ? <div className="spinner" /> : <section className="appointment-history-list">
        <header><span>RESULTADOS</span><strong>{rows.length} {rows.length === 1 ? 'turno' : 'turnos'}</strong></header>
        {rows.length ? rows.map((appointment) => {
          const state = String(appointment.estado).toLowerCase();
          return <article key={appointment.idTurno}>
            <div className="appointment-history-date"><strong>{appointment.fecha}</strong>
              <span>{String(appointment.horaInicio).slice(0, 5)} hs</span></div>
            <div><strong>{appointment.cliente_nombre} {appointment.cliente_apellido}</strong>
              <span>{appointment.servicio_nombre} · {appointment.cliente_email}</span></div>
            <span className={`badge badge-${state}`}>{appointment.estado}</span>
          </article>;
        }) : <div className="appointment-history-empty">No encontramos turnos con estos filtros.</div>}
      </section>}
    </div>
  );
}
