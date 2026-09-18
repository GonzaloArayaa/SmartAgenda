import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { turnos } from '../services/api';

const FILTROS = ['Todos', 'Pendiente', 'Confirmado', 'Cancelado', 'Finalizado'];

export default function MisTurnos() {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [filtro, setFiltro] = useState('Todos');
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
        estado: 'Cancelado',
        motivoCancelacion: motivo,
      });
      fetchTurnos();
    } catch (err) {
      alert(err.message || 'Error al cancelar el turno.');
    }
  }

  const filtrados = filtro === 'Todos'
    ? lista
    : lista.filter((t) => t.estado === filtro);

  if (loading) return <div className="spinner"></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2><i className="fas fa-calendar-check"></i> Mis Turnos</h2>
          <p>Consultá y gestioná todos tus turnos reservados.</p>
        </div>
      </div>

      <div className="filter-tabs">
        {FILTROS.map((f) => (
          <button
            key={f}
            className={`filter-tab ${filtro === f ? 'active' : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox"></i>
          <h3>No hay turnos</h3>
          <p>
            {filtro === 'Todos'
              ? 'Todavía no tenés turnos. ¡Buscá un profesional y reservá!'
              : `No tenés turnos con estado "${filtro}".`}
          </p>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((t) => (
                <tr key={t.idTurno}>
                  <td>{t.nombreProfesional || t.profesional || '-'}</td>
                  <td>{t.nombreServicio || t.servicio || '-'}</td>
                  <td>{t.fecha}</td>
                  <td>{t.horaInicio}</td>
                  <td>
                    <span className={`badge badge-${(t.estado || '').toLowerCase()}`}>
                      {t.estado}
                    </span>
                  </td>
                  <td>
                    {(t.estado === 'Pendiente' || t.estado === 'Confirmado') && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancelar(t)}
                      >
                        <i className="fas fa-times"></i> Cancelar
                      </button>
                    )}
                    {t.estado === 'Cancelado' && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        —
                      </span>
                    )}
                    {t.estado === 'Finalizado' && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Completado
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
