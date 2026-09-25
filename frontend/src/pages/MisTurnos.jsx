import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { turnos } from '../services/api';

const FILTROS = [{ key:'todos', label:'Todos' },{ key:'pendiente', label:'Pendientes' },{ key:'confirmado', label:'Confirmados' },{ key:'cancelado', label:'Cancelados' },{ key:'finalizado', label:'Finalizados' }];

export default function MisTurnos() {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [loading, setLoading] = useState(true);

  async function fetchTurnos() {
    setLoading(true);
    try {
      const data = await turnos.getAll();
      const arr = Array.isArray(data) ? data : data.turnos || [];
      setLista(arr);
    } catch {
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTurnos();
  }, []);

  async function handleCancelar(turno) {
    const motivo = window.prompt('Motivo de la cancelación:');
    if (motivo === null) return;

    try {
      await turnos.update({
        idTurno: turno.idTurno,
        accion: 'cancelar',
        motivo,
      });
      fetchTurnos();
    } catch (err) {
      alert(err.message || 'Error al cancelar el turno.');
    }
  }

  const filtrados = filtro === 'todos'
    ? lista
    : lista.filter((t) => String(t.estado).toLowerCase() === filtro);
  const hoy = new Date().toISOString().split('T')[0];
  const proximos = lista.filter((t) => t.fecha >= hoy && !['cancelado','finalizado'].includes(String(t.estado).toLowerCase())).length;
  const nombreProfesional = (t) => t.nombreNegocio || (t.profesional_nombre ? `${t.profesional_nombre} ${t.profesional_apellido || ''}` : t.nombreProfesional || t.profesional || 'Profesional');
  const nombreServicio = (t) => t.servicio_nombre || t.nombreServicio || t.servicio || 'Servicio';

  if (loading) return <div className="spinner"></div>;

  return (
    <div className="appointments-page client-module-page">
      <section className="client-section-hero">
        <div>
          <span className="client-kicker">TUS RESERVAS</span>
          <h2>Mis turnos</h2>
          <p>Consultá el estado de cada reserva y administrá tus próximas visitas.</p>
        </div>
        <div className="appointments-hero-count"><strong>{proximos}</strong><span>próximos</span></div>
      </section>

      <div className="appointments-filter-tabs">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            className={filtro === f.key ? 'active' : ''}
            onClick={() => setFiltro(f.key)}
          >
            {f.label}<span>{f.key === 'todos' ? lista.length : lista.filter(t => String(t.estado).toLowerCase() === f.key).length}</span>
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <section className="client-empty-state"><div><i className="far fa-calendar" /></div><h3>No hay turnos en esta vista</h3><p>{filtro === 'todos' ? 'Todavía no tenés reservas. Encontrá un profesional para comenzar.' : 'No tenés reservas con este estado.'}</p>{filtro === 'todos' && <Link to="/buscar">Buscar profesionales</Link>}</section>
      ) : (
        <section className="appointment-card-list">
          {filtrados.map((t) => {
            const estado = String(t.estado).toLowerCase();
            const fecha = new Date(`${t.fecha}T12:00:00`);
            return <article key={t.idTurno} className={`client-appointment-card status-${estado}`}>
              <div className="client-appointment-date"><strong>{fecha.getDate()}</strong><span>{fecha.toLocaleDateString('es-AR',{month:'short'}).toUpperCase()}</span><small>{fecha.getFullYear()}</small></div>
              <div className="client-appointment-main"><span>{nombreServicio(t)}</span><h3>{nombreProfesional(t)}</h3><p><i className="far fa-clock" /> {String(t.horaInicio).slice(0,5)} hs</p></div>
              <div className="client-appointment-status"><span className={`badge badge-${estado}`}>{t.estado}</span><small>Reserva #{t.idTurno}</small></div>
              <div className="client-appointment-action">{['pendiente','confirmado'].includes(estado) ? <button onClick={() => handleCancelar(t)}><i className="fas fa-times" /> Cancelar</button> : <span>{estado === 'finalizado' ? <><i className="fas fa-check" /> Completado</> : 'Sin acciones'}</span>}</div>
            </article>;
          })}
        </section>
      )}
    </div>
  );
}
