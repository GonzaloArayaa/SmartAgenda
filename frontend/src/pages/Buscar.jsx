import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { profesionales, reportes } from '../services/api';
import { fechaLocal, etiquetaDia } from '../utils/fecha';

// Cómo se muestra si el profesional tiene lugar para reservar
function indicadorDisponibilidad(prof, fechaFiltro) {
  if (fechaFiltro && prof.lugarEnFecha) {
    return { clase: 'is-hoy', icono: 'fa-circle', texto: `Lugar ${etiquetaDia(fechaFiltro)} desde ${prof.lugarEnFecha.hora}` };
  }
  if (prof.disponibleHoy && prof.proximoLugar) {
    return { clase: 'is-hoy', icono: 'fa-circle', texto: `Disponible hoy desde ${prof.proximoLugar.hora}` };
  }
  if (prof.proximoLugar) {
    return { clase: 'is-pronto', icono: 'fa-clock', texto: `Próximo lugar: ${etiquetaDia(prof.proximoLugar.fecha)} ${prof.proximoLugar.hora}` };
  }
  return { clase: 'is-sin-lugar', icono: 'fa-calendar-times', texto: 'Sin lugares en los próximos días' };
}

export default function Buscar() {
  const [lista, setLista] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [rubroFiltro, setRubroFiltro] = useState('');
  const [localidadFiltro, setLocalidadFiltro] = useState('');
  // Disponibilidad: '' (cualquier día), 'hoy' o 'fecha' (un día a elegir)
  const [disponibilidad, setDisponibilidad] = useState('');
  const [fechaElegida, setFechaElegida] = useState('');
  const [loading, setLoading] = useState(true);

  const hoy = fechaLocal();
  const fechaFiltro = disponibilidad === 'hoy' ? hoy : disponibilidad === 'fecha' ? fechaElegida : '';

  useEffect(() => {
    let active = true;
    reportes.getRubros()
      .then((data) => { if (active) setRubros(Array.isArray(data) ? data : data.rubros || []); })
      .catch(() => { if (active) setRubros([]); });
    profesionales.getLocalidades()
      .then((data) => { if (active) setLocalidades(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setLocalidades([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchProfesionales() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (busqueda.trim()) params.append('buscar', busqueda.trim());
        if (rubroFiltro) params.append('idRubro', rubroFiltro);
        if (localidadFiltro) params.append('localidad', localidadFiltro);
        if (fechaFiltro) params.append('fecha', fechaFiltro);
        const data = await profesionales.getAll(params.toString());
        if (active) setLista(Array.isArray(data) ? data : data.profesionales || []);
      } catch {
        if (active) setLista([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    const timer = setTimeout(fetchProfesionales, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [busqueda, rubroFiltro, localidadFiltro, fechaFiltro]);

  const hayFiltros = Boolean(busqueda.trim() || rubroFiltro || localidadFiltro || disponibilidad);

  function limpiarFiltros() {
    setBusqueda('');
    setRubroFiltro('');
    setLocalidadFiltro('');
    setDisponibilidad('');
    setFechaElegida('');
  }

  return (
    <div className="discovery-page client-module-page">
      <section className="discovery-hero">
        <div>
          <span className="client-kicker">ENCONTRÁ TU PRÓXIMO TURNO</span>
          <h2>Profesionales para vos</h2>
          <p>Explorá opciones, compará especialidades y reservá en pocos pasos.</p>
        </div>
        <div className="discovery-count"><strong>{lista.length}</strong><span>{lista.length === 1 ? 'profesional encontrado' : 'profesionales encontrados'}</span></div>
      </section>

      <section className="discovery-search-panel">
        <div className="discovery-search-input"><i className="fas fa-search" /><input type="text" placeholder="Nombre, negocio, especialidad o localidad" aria-label="Buscar profesionales" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />{busqueda && <button onClick={() => setBusqueda('')} title="Limpiar"><i className="fas fa-times" /></button>}</div>
        <div className="discovery-filter"><i className="fas fa-sliders-h" /><select aria-label="Rubro" value={rubroFiltro} onChange={(e) => setRubroFiltro(e.target.value)}><option value="">Todos los rubros</option>{rubros.map((r) => <option key={r.idRubro} value={r.idRubro}>{r.nombre}</option>)}</select></div>
        <div className="discovery-filter"><i className="fas fa-map-marker-alt" /><select aria-label="Localidad" value={localidadFiltro} onChange={(e) => setLocalidadFiltro(e.target.value)}><option value="">Todas las localidades</option>{localidades.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
        <div className="discovery-filter"><i className="far fa-calendar-check" /><select aria-label="Disponibilidad" value={disponibilidad} onChange={(e) => setDisponibilidad(e.target.value)}><option value="">Cualquier día</option><option value="hoy">Con lugar hoy</option><option value="fecha">Con lugar el día…</option></select></div>
        {disponibilidad === 'fecha' && (
          <div className="discovery-filter discovery-filter-date"><i className="far fa-calendar" /><input type="date" aria-label="Fecha elegida" min={hoy} value={fechaElegida} onChange={(e) => setFechaElegida(e.target.value)} /></div>
        )}
      </section>
      {disponibilidad === 'fecha' && !fechaElegida && <p className="discovery-hint"><i className="fas fa-info-circle" /> Elegí una fecha para ver solo los profesionales con lugar ese día.</p>}

      {loading ? (
        <div className="spinner"></div>
      ) : lista.length === 0 ? (
        <section className="client-empty-state"><div><i className="fas fa-search" /></div><h3>No encontramos coincidencias</h3><p>{fechaFiltro ? 'Ningún profesional tiene lugar ese día con los filtros elegidos. Probá con otra fecha o quitá algún filtro.' : 'Probá con otro nombre, otra localidad o seleccioná una especialidad diferente.'}</p>{hayFiltros && <button onClick={limpiarFiltros}>Limpiar búsqueda</button>}</section>
      ) : (
        <section className="discovery-results">
          <header><div><span>RESULTADOS</span><h3>Elegí dónde reservar</h3></div><small>Ordenados por disponibilidad</small></header>
          <div className="professional-catalog-grid">
          {lista.map((prof) => {
            const indicador = indicadorDisponibilidad(prof, fechaFiltro);
            return (
              <article key={prof.idProfesional} className="professional-discovery-card">
                <div className="professional-card-top"><Avatar className="professional-avatar" idUsuario={prof.idUsuario} fotoVersion={prof.fotoVersion} nombre={prof.nombre} apellido={prof.apellido} /><span className={`professional-available ${indicador.clase}`}><i className={`fas ${indicador.icono}`} /> {indicador.texto}</span></div>
                <div className="professional-card-body"><span>{prof.nombreRubro || prof.rubro || 'Atención general'}</span><h3>{prof.nombreNegocio || `${prof.nombre} ${prof.apellido}`}</h3>{prof.localidad && <small className="professional-location"><i className="fas fa-map-marker-alt" /> {prof.localidad}</small>}<p>{prof.descripcion || 'Profesional disponible para recibir reservas.'}</p></div>
                <div className="professional-card-footer">
                  <div><i className="fas fa-user-md" /><span>Profesional verificado</span></div>
                  <Link to={`/reservar/${prof.idProfesional}`}>Ver horarios <i className="fas fa-arrow-right" /></Link>
                </div>
              </article>
            );
          })}
          </div>
        </section>
      )}
    </div>
  );
}
