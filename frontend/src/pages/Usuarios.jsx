import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usuarios } from '../services/api';

export default function Usuarios() {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [rolFiltro, setRolFiltro] = useState('todos');

  async function fetchUsuarios() {
    setLoading(true);
    try {
      const data = await usuarios.getAll();
      setLista(Array.isArray(data) ? data : data.usuarios || []);
    } catch {
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsuarios();
  }, []);

  async function toggleEstado(u) {
    const estaActivo = String(u.estado).toLowerCase() === 'activo';
    const nuevoEstado = estaActivo ? 'inactivo' : 'activo';
    const confirma = window.confirm(
      `¿${nuevoEstado === 'activo' ? 'Activar' : 'Desactivar'} al usuario "${u.nombre} ${u.apellido}"?`
    );
    if (!confirma) return;

    try {
      await usuarios.update({
        idUsuario: u.idUsuario,
        estado: nuevoEstado,
      });
      fetchUsuarios();
    } catch (err) {
      alert(err.message || 'Error al actualizar el usuario.');
    }
  }

  if (loading) return <div className="spinner"></div>;

  const filtrados = lista.filter((u) => {
    const coincideTexto = `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase());
    return coincideTexto && (rolFiltro === 'todos' || u.rol === rolFiltro);
  });
  const activos = lista.filter((u) => String(u.estado).toLowerCase() === 'activo').length;
  const profesionales = lista.filter((u) => u.rol === 'Profesional').length;
  const iniciales = (u) => `${u.nombre?.[0] || ''}${u.apellido?.[0] || ''}`.toUpperCase();

  return (
    <div className="users-admin-page admin-module-page">
      <section className="admin-section-hero">
        <div>
          <span className="admin-kicker">ADMINISTRACIÓN DE ACCESOS</span>
          <h2>Usuarios</h2>
          <p>Consultá cuentas, roles y estados de acceso de toda la plataforma.</p>
        </div>
        <div className="admin-user-summary"><div><strong>{lista.length}</strong><span>totales</span></div><div><strong>{activos}</strong><span>activos</span></div><div><strong>{profesionales}</strong><span>profesionales</span></div></div>
      </section>

      <section className="admin-user-toolbar">
        <div className="admin-user-search"><i className="fas fa-search" /><input value={busqueda} onChange={(e)=>setBusqueda(e.target.value)} placeholder="Buscar por nombre o email" />{busqueda&&<button onClick={()=>setBusqueda('')}><i className="fas fa-times" /></button>}</div>
        <div className="admin-role-filter"><i className="fas fa-filter" /><select value={rolFiltro} onChange={(e)=>setRolFiltro(e.target.value)}><option value="todos">Todos los roles</option><option value="Administrador">Administradores</option><option value="Profesional">Profesionales</option><option value="Cliente">Clientes</option></select></div>
      </section>

      {filtrados.length === 0 ? (
        <section className="admin-empty-state"><i className="fas fa-user-slash" /><h3>No hay coincidencias</h3><p>Cambiá los filtros o la búsqueda para ver otras cuentas.</p></section>
      ) : (
        <section className="admin-users-panel"><header><div><span>DIRECTORIO</span><h3>Cuentas registradas</h3></div><small>{filtrados.length} resultados</small></header><div className="admin-users-list">
          {filtrados.map((u) => { const estaActivo=String(u.estado).toLowerCase()==='activo'; const esActual=u.idUsuario===user.idUsuario; return <article key={u.idUsuario} className="admin-user-card">
            <div className={`admin-directory-avatar role-${String(u.rol).toLowerCase()}`}>{iniciales(u)}</div>
            <div className="admin-directory-person"><strong>{u.nombre} {u.apellido}</strong><span>{u.email}</span></div>
            <div className="admin-directory-role"><span>ROL</span><strong>{u.rol}</strong></div>
            <div className="admin-directory-state"><span className={estaActivo?'is-active':'is-inactive'}><i className="fas fa-circle" /> {estaActivo?'Activo':'Inactivo'}</span></div>
            <button disabled={esActual} className={estaActivo?'deactivate':'activate'} onClick={()=>toggleEstado(u)} title={esActual?'Esta es tu cuenta':estaActivo?'Desactivar usuario':'Activar usuario'}><i className={`fas ${estaActivo?'fa-user-slash':'fa-user-check'}`} /> {esActual?'Tu cuenta':estaActivo?'Desactivar':'Activar'}</button>
          </article>; })}
        </div></section>
      )}
    </div>
  );
}
