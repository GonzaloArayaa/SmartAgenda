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
        if (busqueda.trim()) params.append('buscar', busqueda.trim());
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
    <div className="discovery-page client-module-page">
      <section className="discovery-hero">
        <div>
          <span className="client-kicker">ENCONTRÁ TU PRÓXIMO TURNO</span>
          <h2>Profesionales para vos</h2>
          <p>Explorá opciones, compará especialidades y reservá en pocos pasos.</p>
        </div>
        <div className="discovery-count"><strong>{lista.length}</strong><span>profesionales disponibles</span></div>
      </section>

      <section className="discovery-search-panel">
        <div className="discovery-search-input"><i className="fas fa-search" /><input type="text" placeholder="Nombre, negocio o especialidad" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />{busqueda && <button onClick={() => setBusqueda('')} title="Limpiar"><i className="fas fa-times" /></button>}</div>
        <div className="discovery-filter"><i className="fas fa-sliders-h" /><select value={rubroFiltro} onChange={(e) => setRubroFiltro(e.target.value)}><option value="">Todos los rubros</option>{rubros.map((r) => <option key={r.idRubro} value={r.idRubro}>{r.nombre}</option>)}</select></div>
      </section>

      {loading ? (
        <div className="spinner"></div>
      ) : lista.length === 0 ? (
        <section className="client-empty-state"><div><i className="fas fa-search" /></div><h3>No encontramos coincidencias</h3><p>Probá con otro nombre o seleccioná una especialidad diferente.</p><button onClick={() => { setBusqueda(''); setRubroFiltro(''); }}>Limpiar búsqueda</button></section>
      ) : (
        <section className="discovery-results">
          <header><div><span>RESULTADOS</span><h3>Elegí dónde reservar</h3></div><small>Ordenados por disponibilidad</small></header>
          <div className="professional-catalog-grid">
          {lista.map((prof) => (
            <article key={prof.idProfesional} className="professional-discovery-card">
              <div className="professional-card-top"><div className="professional-avatar">{getInitials(prof.nombre, prof.apellido)}</div><span className="professional-available"><i className="fas fa-circle" /> Disponible</span></div>
              <div className="professional-card-body"><span>{prof.nombreRubro || prof.rubro || 'Atención general'}</span><h3>{prof.nombreNegocio || `${prof.nombre} ${prof.apellido}`}</h3><p>{prof.descripcion || 'Profesional disponible para recibir reservas.'}</p></div>
              <div className="professional-card-footer">
                <div><i className="fas fa-user-md" /><span>Profesional verificado</span></div>
                <Link to={`/reservar/${prof.idProfesional}`}>Ver horarios <i className="fas fa-arrow-right" /></Link>
              </div>
            </article>
          ))}
          </div>
        </section>
      )}
    </div>
  );
}
