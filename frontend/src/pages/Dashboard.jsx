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
  const ingresosMes = stats?.ingresosMes ?? 0;
  const cancelaciones = stats?.cancelaciones ?? 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Bienvenido, {user.nombre}. Aquí está el resumen de tu día.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-info">
            <h3>Turnos Hoy</h3>
            <p>{turnosHoy.length}</p>
          </div>
          <div className="stat-card-icon purple">
            <i className="fas fa-calendar-day"></i>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h3>Tasa Ocupación</h3>
            <p>{tasaOcupacion}%</p>
          </div>
          <div className="stat-card-icon green">
            <i className="fas fa-chart-pie"></i>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h3>Ingresos del Mes</h3>
            <p>${Number(ingresosMes).toLocaleString('es-AR')}</p>
          </div>
          <div className="stat-card-icon amber">
            <i className="fas fa-dollar-sign"></i>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h3>Cancelaciones</h3>
            <p>{cancelaciones}</p>
          </div>
          <div className="stat-card-icon red">
            <i className="fas fa-times-circle"></i>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">
          <i className="fas fa-clock"></i> Turnos de Hoy
        </h3>
        {turnosHoy.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-check"></i>
            <h3>Sin turnos para hoy</h3>
            <p>No tenés turnos agendados para hoy.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Hora</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {turnosHoy.map((t) => (
                  <tr key={t.idTurno}>
                    <td>{t.nombreCliente || t.cliente || 'Cliente'}</td>
                    <td>{t.nombreServicio || t.servicio || '-'}</td>
                    <td>{t.horaInicio}</td>
                    <td>
                      <span className={`badge badge-${(t.estado || '').toLowerCase()}`}>
                        {t.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
    (t) => t.fecha >= hoy && t.estado !== 'Cancelado' && t.estado !== 'Finalizado'
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Hola {user.nombre}, gestioná tus turnos desde aquí.</p>
        </div>
        <Link to="/buscar" className="btn btn-primary">
          <i className="fas fa-search"></i> Buscar Profesionales
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-info">
            <h3>Próximos Turnos</h3>
            <p>{proximos.length}</p>
          </div>
          <div className="stat-card-icon purple">
            <i className="fas fa-calendar-alt"></i>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h3>Turnos Totales</h3>
            <p>{misTurnos.length}</p>
          </div>
          <div className="stat-card-icon blue">
            <i className="fas fa-history"></i>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">
          <i className="fas fa-clock"></i> Próximos Turnos
        </h3>
        {proximos.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-plus"></i>
            <h3>No tenés turnos próximos</h3>
            <p>Buscá un profesional y reservá tu primer turno.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Profesional</th>
                  <th>Servicio</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {proximos.slice(0, 5).map((t) => (
                  <tr key={t.idTurno}>
                    <td>{t.nombreProfesional || t.profesional || 'Profesional'}</td>
                    <td>{t.nombreServicio || t.servicio || '-'}</td>
                    <td>{t.fecha}</td>
                    <td>{t.horaInicio}</td>
                    <td>
                      <span className={`badge badge-${(t.estado || '').toLowerCase()}`}>
                        {t.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardAdmin({ user }) {
  const [stats, setStats] = useState(null);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalProfesionales, setTotalProfesionales] = useState(0);
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
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="spinner"></div>;

  const turnosHoy = stats?.turnosHoy ?? 0;
  const cancelaciones = stats?.cancelaciones ?? 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Panel de Administración</h2>
          <p>Vista general del sistema, {user.nombre}.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-info">
            <h3>Usuarios</h3>
            <p>{totalUsuarios}</p>
          </div>
          <div className="stat-card-icon purple">
            <i className="fas fa-users"></i>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h3>Profesionales</h3>
            <p>{totalProfesionales}</p>
          </div>
          <div className="stat-card-icon green">
            <i className="fas fa-user-tie"></i>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h3>Turnos Hoy</h3>
            <p>{turnosHoy}</p>
          </div>
          <div className="stat-card-icon amber">
            <i className="fas fa-calendar-day"></i>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h3>Cancelaciones</h3>
            <p>{cancelaciones}</p>
          </div>
          <div className="stat-card-icon red">
            <i className="fas fa-ban"></i>
          </div>
        </div>
      </div>
    </div>
  );
}
