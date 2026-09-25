import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportes, turnos, usuarios } from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const rol = user?.rol;

  if (rol === 'Profesional') return <DashboardProfesional user={user} />;
  if (rol === 'Administrador') return <DashboardAdmin user={user} />;
  return <DashboardCliente user={user} />;
}

function DashboardProfesional({ user }) {
  const [stats, setStats] = useState(null);
  const [turnosHoy, setTurnosHoy] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const hoy = new Date().toISOString().split('T')[0];
        const [statsData, turnosData] = await Promise.all([
          reportes.getEstadisticas(`idProfesional=${user.idProfesional}`),
          turnos.getAll(`idProfesional=${user.idProfesional}`),
        ]);
        setStats(statsData);
        const listaTurnos = Array.isArray(turnosData) ? turnosData : turnosData.turnos || [];
        setTurnosHoy(listaTurnos.filter((t) => t.fecha === hoy));
      } catch {
        setStats(null);
        setTurnosHoy([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user.idProfesional]);

  if (loading) return <div className="spinner"></div>;

  const tasaOcupacion = stats?.tasaOcupacion ?? 0;
  const ingresosMes = stats?.ingresos ?? stats?.ingresosMes ?? 0;
  const cancelaciones = stats?.totalCancelaciones ?? stats?.cancelaciones ?? 0;
  const fechaHoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="professional-dashboard">
      <section className="pro-dashboard-hero">
        <div>
          <span className="pro-kicker">PANEL PROFESIONAL</span>
          <h2>Buen día, {user.nombre}.</h2>
          <p>Tu agenda está lista para {fechaHoy}.</p>
          <div className="pro-hero-actions">
            <Link to="/agenda" className="pro-primary-action"><i className="fas fa-calendar-alt" /> Ver agenda</Link>
            <Link to="/disponibilidad" className="pro-secondary-action">Configurar horarios <i className="fas fa-arrow-right" /></Link>
          </div>
        </div>
        <div className="pro-hero-status">
          <span>Ocupación actual</span>
          <strong>{tasaOcupacion}%</strong>
          <div><i className="fas fa-chart-line" /> Basado en tus turnos del período</div>
        </div>
      </section>

      <section className="pro-stats-grid">
        <article className="pro-stat-card pro-stat-primary">
          <div className="stat-card-info">
            <h3>Turnos de hoy</h3>
            <p>{turnosHoy.length}</p>
            <span>{turnosHoy.length === 1 ? 'Una atención programada' : 'Atenciones programadas'}</span>
          </div>
          <div className="pro-stat-icon">
            <i className="fas fa-calendar-day"></i>
          </div>
        </article>

        <article className="pro-stat-card">
          <div className="stat-card-info">
            <h3>Ocupación</h3>
            <p>{tasaOcupacion}%</p>
            <span>Disponibilidad utilizada</span>
          </div>
          <div className="pro-stat-icon pro-stat-mint">
            <i className="fas fa-chart-pie"></i>
          </div>
        </article>

        <article className="pro-stat-card">
          <div className="stat-card-info">
            <h3>Ingresos del período</h3>
            <p>${Number(ingresosMes).toLocaleString('es-AR')}</p>
            <span>Turnos confirmados y finalizados</span>
          </div>
          <div className="pro-stat-icon pro-stat-amber">
            <i className="fas fa-dollar-sign"></i>
          </div>
        </article>

        <article className="pro-stat-card">
          <div className="stat-card-info">
            <h3>Cancelaciones</h3>
            <p>{cancelaciones}</p>
            <span>Para revisar en tus reportes</span>
          </div>
          <div className="pro-stat-icon pro-stat-rose">
            <i className="fas fa-times-circle"></i>
          </div>
        </article>
      </section>

      <section className="pro-agenda-card">
        <header className="pro-section-header">
          <div><span>AGENDA DEL DÍA</span><h3>Próximas atenciones</h3></div>
          <Link to="/agenda">Ver calendario <i className="fas fa-arrow-right" /></Link>
        </header>
        {turnosHoy.length === 0 ? (
          <div className="pro-empty-agenda">
            <div className="pro-empty-icon"><i className="fas fa-calendar-check" /></div>
            <div><h3>Tu agenda está libre por ahora</h3><p>No tenés turnos programados para hoy. Podés revisar tus horarios disponibles.</p></div>
            <Link to="/disponibilidad">Ver disponibilidad</Link>
          </div>
        ) : (
          <div className="pro-appointment-list">
            {turnosHoy.map((t) => (
              <article key={t.idTurno} className="pro-appointment-row">
                <time>{t.horaInicio}</time>
                <span className="pro-appointment-dot" />
                <div><b>{t.cliente_nombre ? `${t.cliente_nombre} ${t.cliente_apellido || ''}` : t.nombreCliente || t.cliente || 'Cliente'}</b><span>{t.servicio_nombre || t.nombreServicio || t.servicio || 'Servicio'}</span></div>
                <span className={`badge badge-${(t.estado || '').toLowerCase()}`}>{t.estado}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardCliente({ user }) {
  const [misTurnos, setMisTurnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await turnos.getAll();
        const lista = Array.isArray(data) ? data : data.turnos || [];
        setMisTurnos(lista);
      } catch {
        setMisTurnos([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="spinner"></div>;

  const hoy = new Date().toISOString().split('T')[0];
  const proximos = misTurnos.filter(
    (t) => t.fecha >= hoy && !['cancelado', 'finalizado'].includes(String(t.estado).toLowerCase())
  ).sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`));
  const finalizados = misTurnos.filter((t) => String(t.estado).toLowerCase() === 'finalizado').length;
  const proximo = proximos[0];
  const nombreProfesional = (t) => t?.nombreNegocio || (t?.profesional_nombre ? `${t.profesional_nombre} ${t.profesional_apellido || ''}` : t?.nombreProfesional || t?.profesional || 'Profesional');
  const nombreServicio = (t) => t?.servicio_nombre || t?.nombreServicio || t?.servicio || 'Servicio';

  return (
    <div className="client-dashboard">
      <section className="client-dashboard-hero">
        <div>
          <span className="client-kicker">TU ESPACIO PERSONAL</span>
          <h2>Hola, {user.nombre}.</h2>
          <p>Encontrá profesionales y administrá tus próximas reservas.</p>
          <Link to="/buscar" className="client-main-action"><i className="fas fa-search" /> Buscar profesional</Link>
        </div>
        <div className="client-hero-visual"><i className="far fa-calendar-check" /><span>Próximos turnos</span><strong>{proximos.length}</strong><small>Todo organizado en un solo lugar</small></div>
      </section>

      <section className="client-quick-grid">
        <Link to="/buscar"><i className="fas fa-user-md" /><div><strong>Descubrir profesionales</strong><span>Buscá por nombre, negocio o rubro</span></div><b>→</b></Link>
        <Link to="/mis-turnos"><i className="far fa-calendar" /><div><strong>Mis reservas</strong><span>{misTurnos.length} turnos en tu historial</span></div><b>→</b></Link>
        <Link to="/lista-espera"><i className="far fa-clock" /><div><strong>Lista de espera</strong><span>Aprovechá horarios liberados</span></div><b>→</b></Link>
      </section>

      <section className="client-overview-grid">
        <article className="client-next-card">
          <header><div><span>PRÓXIMA RESERVA</span><h3>Tu siguiente turno</h3></div><Link to="/mis-turnos">Ver todos</Link></header>
          {!proximo ? (
            <div className="client-next-empty"><i className="fas fa-calendar-plus" /><div><strong>Tu agenda está libre</strong><span>Reservá un turno cuando lo necesites.</span></div><Link to="/buscar">Explorar profesionales</Link></div>
          ) : (
            <div className="client-next-appointment">
              <div className="client-date-block"><strong>{new Date(`${proximo.fecha}T12:00:00`).getDate()}</strong><span>{new Date(`${proximo.fecha}T12:00:00`).toLocaleDateString('es-AR',{month:'short'}).toUpperCase()}</span></div>
              <div><span>{nombreServicio(proximo)}</span><h3>{nombreProfesional(proximo)}</h3><p><i className="far fa-clock" /> {String(proximo.horaInicio).slice(0,5)} hs</p></div>
              <span className={`badge badge-${String(proximo.estado).toLowerCase()}`}>{proximo.estado}</span>
            </div>
          )}
        </article>
        <aside className="client-history-card"><span>HISTORIAL</span><strong>{finalizados}</strong><p>turnos completados</p><div><i className="fas fa-check" /> Tus reservas anteriores quedan disponibles en Mis turnos.</div></aside>
      </section>
    </div>
  );
}

function DashboardAdmin({ user }) {
  const [stats, setStats] = useState(null);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalProfesionales, setTotalProfesionales] = useState(0);
  const [usuariosRecientes, setUsuariosRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, usersData] = await Promise.all([
          reportes.getEstadisticas(),
          usuarios.getAll(),
        ]);
        setStats(statsData);
        const listaUsers = Array.isArray(usersData) ? usersData : usersData.usuarios || [];
        setTotalUsuarios(listaUsers.length);
        setTotalProfesionales(listaUsers.filter((u) => u.rol === 'Profesional').length);
        setUsuariosRecientes(listaUsers.slice(0, 5));
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="spinner"></div>;

  const totalTurnos = stats?.totalTurnos ?? 0;
  const cancelaciones = stats?.totalCancelaciones ?? stats?.cancelaciones ?? 0;
  const activos = usuariosRecientes.filter((u) => String(u.estado).toLowerCase() === 'activo').length;

  return (
    <div className="admin-dashboard">
      <section className="admin-dashboard-hero">
        <div>
          <span className="admin-kicker">CENTRO DE CONTROL</span>
          <h2>Resumen del sistema</h2>
          <p>Hola, {user.nombre}. Supervisá usuarios, actividad y rendimiento desde una única vista.</p>
          <div><Link to="/usuarios"><i className="fas fa-users" /> Gestionar usuarios</Link><Link to="/reportes">Ver analíticas <i className="fas fa-arrow-right" /></Link></div>
        </div>
        <aside><i className="fas fa-shield-alt" /><span>Estado de la plataforma</span><strong>Operativa</strong><small><i className="fas fa-circle" /> Servicios disponibles</small></aside>
      </section>

      <section className="admin-metrics-grid">
        <article><div><span>USUARIOS</span><strong>{totalUsuarios}</strong><small>Cuentas registradas</small></div><i className="fas fa-users" /></article>
        <article><div><span>PROFESIONALES</span><strong>{totalProfesionales}</strong><small>Prestadores activos</small></div><i className="fas fa-user-tie" /></article>
        <article><div><span>TURNOS</span><strong>{totalTurnos}</strong><small>Actividad del período</small></div><i className="far fa-calendar-check" /></article>
        <article><div><span>CANCELACIONES</span><strong>{cancelaciones}</strong><small>Requieren seguimiento</small></div><i className="fas fa-times" /></article>
      </section>

      <section className="admin-overview-grid">
        <article className="admin-recent-users"><header><div><span>ALTAS RECIENTES</span><h3>Últimos usuarios</h3></div><Link to="/usuarios">Ver gestión completa</Link></header><div>{usuariosRecientes.map((u)=><div key={u.idUsuario} className="admin-user-row"><div className="admin-user-avatar">{`${u.nombre?.[0]||''}${u.apellido?.[0]||''}`.toUpperCase()}</div><div><strong>{u.nombre} {u.apellido}</strong><span>{u.email}</span></div><b>{u.rol}</b><small className={String(u.estado).toLowerCase()}><i className="fas fa-circle" /> {u.estado}</small></div>)}</div></article>
        <aside className="admin-system-card"><span>CONTROL DE ACCESO</span><strong>{activos}/{usuariosRecientes.length}</strong><p>cuentas recientes activas</p><div><i className="fas fa-lock" /> Las sesiones y permisos se validan desde el servidor.</div><Link to="/usuarios">Revisar cuentas</Link></aside>
      </section>
    </div>
  );
}
