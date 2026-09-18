import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profesionales, reportes } from '../services/api';

export default function Buscar() {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [rubroFiltro, setRubroFiltro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRubros() {
      try {
        const data = await reportes.getRubros();
        setRubros(Array.isArray(data) ? data : data.rubros || []);
      } catch {
        setRubros([]);
      }
    }
    fetchRubros();
  }, []);

  useEffect(() => {
    async function fetchProfesionales() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (busqueda.trim()) params.append('busqueda', busqueda.trim());
        if (rubroFiltro) params.append('idRubro', rubroFiltro);
        const data = await profesionales.getAll(params.toString());
        setLista(Array.isArray(data) ? data : data.profesionales || []);
      } catch {
        setLista([]);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchProfesionales, 300);
    return () => clearTimeout(timer);
  }, [busqueda, rubroFiltro]);

  function getInitials(nombre, apellido) {
    return ((nombre?.[0] || '') + (apellido?.[0] || '')).toUpperCase();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2><i className="fas fa-search"></i> Buscar Profesionales</h2>
          <p>Encontrá al profesional ideal y reservá tu turno.</p>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Buscar por nombre o negocio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="form-select"
          value={rubroFiltro}
          onChange={(e) => setRubroFiltro(e.target.value)}
        >
          <option value="">Todos los rubros</option>
          {rubros.map((r) => (
            <option key={r.idRubro} value={r.idRubro}>
              {r.nombre}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="spinner"></div>
      ) : lista.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-user-slash"></i>
          <h3>No se encontraron profesionales</h3>
          <p>Probá con otros términos de búsqueda o cambiá el rubro.</p>
        </div>
      ) : (
        <div className="prof-grid">
          {lista.map((prof) => (
            <Link
              key={prof.idProfesional}
              to={`/reservar/${prof.idProfesional}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="prof-card">
                <div className="prof-card-header">
                  <div className="prof-card-avatar">
                    {getInitials(prof.nombre, prof.apellido)}
                  </div>
                  <div>
                    <div className="prof-card-name">
                      {prof.nombreNegocio || `${prof.nombre} ${prof.apellido}`}
                    </div>
                    <div className="prof-card-rubro">
                      {prof.nombreRubro || prof.rubro || 'General'}
                    </div>
                  </div>
                </div>
                <p>{prof.descripcion || 'Profesional disponible para reservas.'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
