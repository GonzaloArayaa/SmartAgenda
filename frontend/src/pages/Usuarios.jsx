import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { usuarios, reportes } from '../services/api';

const GRUPOS = [
  { rol: 'Cliente', plural: 'Clientes', icono: 'fa-user' },
  { rol: 'Profesional', plural: 'Profesionales', icono: 'fa-briefcase' },
  { rol: 'Administrador', plural: 'Administradores', icono: 'fa-user-shield' },
];

const estaActivo = (u) => String(u.estado).toLowerCase() === 'activo';
const cuentas = (n) => `${n} ${n === 1 ? 'cuenta' : 'cuentas'}`;

// Diálogo para cambiar el rol de una cuenta. Hace de confirmación: no se cambia nada hasta apretar "Confirmar cambio".
function CambiarRolModal({ usuario, onClose, onDone }) {
  const roles = GRUPOS.map((g) => g.rol).filter((rol) => rol !== usuario.rol);
  const [rol, setRol] = useState(roles[0]);
  const [rubros, setRubros] = useState([]);
  const [datos, setDatos] = useState({ nombreNegocio: '', localidad: '', idRubro: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  // Quien nunca fue profesional necesita los datos de un negocio para pasar a ese rol
  const pideNegocio = rol === 'Profesional' && !usuario.tienePerfilProfesional;

  useEffect(() => {
    if (!pideNegocio || rubros.length > 0) return undefined;
    let activo = true;
    reportes.getRubros().then((data) => { if (activo) setRubros(Array.isArray(data) ? data : []); }).catch(() => {});
    return () => { activo = false; };
  }, [pideNegocio, rubros.length]);

  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onClose]);

  const cambiar = (campo) => (e) => setDatos((prev) => ({ ...prev, [campo]: e.target.value }));

  async function confirmar(event) {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const respuesta = await usuarios.cambiarRol({ idUsuario: usuario.idUsuario, rol, ...(pideNegocio ? datos : {}) });
      onDone(respuesta.message);
    } catch (err) {
      setError(err.message || 'No se pudo cambiar el rol.');
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay module-modal-overlay" onClick={onClose}>
      <form className="modal module-modal role-modal" role="dialog" aria-modal="true" aria-labelledby="role-modal-titulo" onClick={(e) => e.stopPropagation()} onSubmit={confirmar}>
        <div className="modal-header">
          <div><span>ADMINISTRACIÓN DE ACCESOS</span><h3 id="role-modal-titulo">Cambiar rol</h3></div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar"><i className="fas fa-times" /></button>
        </div>
        <div className="role-modal-body">
          <p className="role-modal-person"><strong>{usuario.nombre} {usuario.apellido}</strong><span>{usuario.email}</span></p>
          <div className="role-modal-change">
            <span className="role-modal-current">{usuario.rol}</span><i className="fas fa-arrow-right" aria-hidden="true" />
            <select value={rol} onChange={(e) => { setRol(e.target.value); setError(''); }} aria-label="Nuevo rol" autoFocus>{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          </div>
          {pideNegocio && (
            <div className="role-modal-fields">
              <p><i className="fas fa-store" /> Esta persona todavía no tiene un negocio. Completá sus datos para pasarla a Profesional.</p>
              <label>Nombre del negocio<input value={datos.nombreNegocio} onChange={cambiar('nombreNegocio')} maxLength={100} required /></label>
              <label>Rubro<select value={datos.idRubro} onChange={cambiar('idRubro')} required><option value="">Seleccioná un rubro</option>{rubros.map((r) => <option key={r.idRubro} value={r.idRubro}>{r.nombre}</option>)}</select></label>
              <label>Localidad<input value={datos.localidad} onChange={cambiar('localidad')} maxLength={100} placeholder="Ej.: Godoy Cruz" required /></label>
            </div>
          )}
          <p className="role-modal-warning"><i className="fas fa-exclamation-triangle" /> Se cerrará la sesión de {usuario.nombre} si está conectado/a, y tendrá que volver a ingresar. No se puede cambiar el rol de quien tenga turnos próximos.</p>
          {error && <p className="appointment-feedback error" role="alert">{error}</p>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancelar</button>
          <button type="submit" className="module-primary-btn" disabled={guardando}>{guardando ? 'Guardando…' : 'Confirmar cambio'}</button>
        </div>
      </form>
    </div>
  );
}

export default function Usuarios() {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [grupoAbierto, setGrupoAbierto] = useState(null);
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [usuarioRol, setUsuarioRol] = useState(null); // cuenta a la que se le está cambiando el rol
  const [aviso, setAviso] = useState('');
  const disparador = useRef(null); // botón que abrió el diálogo, para devolverle el foco al cerrarlo
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
    if (!grupoAbierto || usuarioRol) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') setGrupoAbierto(null); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [grupoAbierto, usuarioRol]);

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

  function abrirCambioRol(u) {
    disparador.current = document.activeElement;
    setUsuarioRol(u);
  }

  function cerrarCambioRol() {
    setUsuarioRol(null);
    disparador.current?.focus();
  }

  function rolCambiado(mensaje) {
    setUsuarioRol(null);
    setAviso(mensaje);
    recargarUsuarios();
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

      {aviso && <p className="appointment-feedback success agenda-aviso" role="status"><i className="fas fa-check-circle" /> {aviso}<button type="button" onClick={() => setAviso('')} aria-label="Cerrar aviso"><i className="fas fa-times" /></button></p>}

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
                      <Avatar className={`admin-directory-avatar role-${String(u.rol).toLowerCase()}`} idUsuario={u.idUsuario} fotoVersion={u.fotoVersion} nombre={u.nombre} apellido={u.apellido} />
                      <div className="admin-directory-person"><strong>{u.nombre} {u.apellido}</strong><span>{u.email}</span></div>
                      <div className="admin-directory-state"><span className={activo ? 'is-active' : 'is-inactive'}><i className="fas fa-circle" /> {activo ? 'Activo' : 'Inactivo'}</span></div>
                      <button type="button" disabled={esActual} className="change-role" onClick={() => abrirCambioRol(u)} title={esActual ? 'No podés cambiar tu propio rol' : 'Cambiar el rol de esta cuenta'}><i className="fas fa-user-tag" /> Cambiar rol</button>
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

      {usuarioRol && <CambiarRolModal usuario={usuarioRol} onClose={cerrarCambioRol} onDone={rolCambiado} />}
    </div>
  );
}
