import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usuarios } from '../services/api';

const GRUPOS = [
  { rol: 'Cliente', plural: 'Clientes', icono: 'fa-user' },
  { rol: 'Profesional', plural: 'Profesionales', icono: 'fa-briefcase' },
  { rol: 'Administrador', plural: 'Administradores', icono: 'fa-user-shield' },
];

const estaActivo = (u) => String(u.estado).toLowerCase() === 'activo';
const iniciales = (u) => `${u.nombre?.[0] || ''}${u.apellido?.[0] || ''}`.toUpperCase();
const cuentas = (n) => `${n} ${n === 1 ? 'cuenta' : 'cuentas'}`;

export default function Usuarios() {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [grupoAbierto, setGrupoAbierto] = useState(null);
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const tarjetas = useRef({});
  const posicionesPrevias = useRef(null);

  const aLista = (data) => (Array.isArray(data) ? data : data.usuarios || []);

  useEffect(() => {
    let activo = true;
    usuarios.getAll()
      .then((data) => { if (activo) setLista(aLista(data)); })
      .catch(() => { if (activo) setLista([]); })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, []);

  async function recargarUsuarios() {
    try {
      setLista(aLista(await usuarios.getAll()));
    } catch {
      setLista([]);
    }
  }

  // Escape cierra el panel abierto
  useEffect(() => {
    if (!grupoAbierto) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') setGrupoAbierto(null); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [grupoAbierto]);

  // La tarjeta elegida sube al primer lugar: se anima el desplazamiento de cada tarjeta
  useLayoutEffect(() => {
    const antes = posicionesPrevias.current;
    posicionesPrevias.current = null;
    if (!antes || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    Object.entries(tarjetas.current).forEach(([rol, el]) => {
      if (!el || antes[rol] === undefined) return;
      const delta = antes[rol] - el.getBoundingClientRect().top;
      if (delta) {
        el.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: 'none' }],
          { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
      }
    });
  }, [grupoAbierto]);

  function elegirGrupo(rol) {
    posicionesPrevias.current = Object.fromEntries(
      Object.entries(tarjetas.current)
        .filter(([, el]) => el)
        .map(([clave, el]) => [clave, el.getBoundingClientRect().top])
    );
    setEstadoFiltro('todos');
    setGrupoAbierto(rol === grupoAbierto ? null : rol);
  }

  async function toggleEstado(u) {
    const nuevoEstado = estaActivo(u) ? 'inactivo' : 'activo';
    const confirma = window.confirm(
      `¿${nuevoEstado === 'activo' ? 'Activar' : 'Desactivar'} al usuario "${u.nombre} ${u.apellido}"?`
    );
    if (!confirma) return;

    try {
      await usuarios.update({
        idUsuario: u.idUsuario,
        estado: nuevoEstado,
      });
      recargarUsuarios();
    } catch (err) {
      alert(err.message || 'Error al actualizar el usuario.');
    }
  }

  if (loading) return <div className="spinner"></div>;

  const texto = busqueda.trim().toLowerCase();
  const coincide = (u) => !texto || `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(texto);
  const visiblesDe = (rol) => lista.filter((u) => u.rol === rol && coincide(u));

  const activos = lista.filter(estaActivo).length;
  const profesionales = lista.filter((u) => u.rol === 'Profesional').length;

  const grupo = GRUPOS.find((g) => g.rol === grupoAbierto);
  const delGrupo = grupo ? visiblesDe(grupo.rol) : [];
  const filas = delGrupo.filter((u) => estadoFiltro === 'todos' || (estadoFiltro === 'activo') === estaActivo(u));

  return (
    <div className="users-admin-page admin-module-page">
      <section className="admin-section-hero">
        <div>
          <span className="admin-kicker">ADMINISTRACIÓN DE ACCESOS</span>
          <h2>Usuarios</h2>
          <p>Elegí un grupo para ver y administrar sus cuentas.</p>
        </div>
        <div className="admin-user-summary"><div><strong>{lista.length}</strong><span>totales</span></div><div><strong>{activos}</strong><span>activos</span></div><div><strong>{profesionales}</strong><span>profesionales</span></div></div>
      </section>

      <section className="admin-user-toolbar users-toolbar-single">
        <div className="admin-user-search"><i className="fas fa-search" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o email en todos los grupos" aria-label="Buscar usuarios" />{busqueda && <button onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda"><i className="fas fa-times" /></button>}</div>
      </section>

      <section className={`users-groups${grupo ? ' has-open' : ''}`}>
        {GRUPOS.map((g) => {
          const visibles = visiblesDe(g.rol);
          const cantidadActivos = visibles.filter(estaActivo).length;
          const abierto = g.rol === grupoAbierto;
          return (
            <button
              key={g.rol}
              ref={(el) => { tarjetas.current[g.rol] = el; }}
              type="button"
              className={`users-group-card${abierto ? ' is-open' : ''}`}
              aria-expanded={abierto}
              aria-controls="users-panel"
              onClick={() => elegirGrupo(g.rol)}
            >
              <span className="users-group-icon"><i className={`fas ${g.icono}`} /></span>
              <span className="users-group-text">
                <strong>{g.plural}</strong>
                <small>{cantidadActivos} {cantidadActivos === 1 ? 'activo' : 'activos'}{texto ? ' · coincidencias' : ''}</small>
              </span>
              <span className="users-group-count">{visibles.length}</span>
            </button>
          );
        })}

        {grupo ? (
          <section key={grupo.rol} id="users-panel" className="users-panel" aria-labelledby="users-panel-titulo">
            <header>
              <div>
                <span>GRUPO SELECCIONADO</span>
                <h3 id="users-panel-titulo">{grupo.plural} · {cuentas(delGrupo.length)}</h3>
              </div>
              <button type="button" className="users-panel-close" onClick={() => setGrupoAbierto(null)} aria-label="Cerrar panel"><i className="fas fa-times" /></button>
            </header>
            <div className="users-panel-filter">
              <div className="admin-role-filter"><i className="fas fa-filter" /><select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} aria-label="Filtrar por estado"><option value="todos">Estado: todos</option><option value="activo">Solo activos</option><option value="inactivo">Solo inactivos</option></select></div>
              <small>Mostrando {filas.length} de {delGrupo.length}</small>
            </div>
            {filas.length === 0 ? (
              <div className="users-panel-empty"><i className="fas fa-user-slash" /><p>{texto ? 'No hay coincidencias con la búsqueda en este grupo.' : 'No hay cuentas con ese estado.'}</p></div>
            ) : (
              <div className="users-panel-list">
                {filas.map((u) => {
                  const activo = estaActivo(u);
                  const esActual = u.idUsuario === user.idUsuario;
                  return (
                    <article key={u.idUsuario} className="users-row">
                      <div className={`admin-directory-avatar role-${String(u.rol).toLowerCase()}`}>{iniciales(u)}</div>
                      <div className="admin-directory-person"><strong>{u.nombre} {u.apellido}</strong><span>{u.email}</span></div>
                      <div className="admin-directory-state"><span className={activo ? 'is-active' : 'is-inactive'}><i className="fas fa-circle" /> {activo ? 'Activo' : 'Inactivo'}</span></div>
                      <button disabled={esActual} className={activo ? 'deactivate' : 'activate'} onClick={() => toggleEstado(u)} title={esActual ? 'Esta es tu cuenta' : activo ? 'Desactivar usuario' : 'Activar usuario'}><i className={`fas ${activo ? 'fa-user-slash' : 'fa-user-check'}`} /> {esActual ? 'Tu cuenta' : activo ? 'Desactivar' : 'Activar'}</button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <p className="users-groups-hint"><i className="fas fa-arrow-left" /> Elegí un grupo para ver sus cuentas</p>
        )}
      </section>
    </div>
  );
}
