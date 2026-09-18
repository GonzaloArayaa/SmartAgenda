import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usuarios } from '../services/api';

export default function Usuarios() {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const nuevoEstado = u.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const confirma = window.confirm(
      `¿${nuevoEstado === 'Activo' ? 'Activar' : 'Desactivar'} al usuario "${u.nombre} ${u.apellido}"?`
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h2><i className="fas fa-users-cog"></i> Gestión de Usuarios</h2>
          <p>Administrá los usuarios registrados en el sistema.</p>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-users"></i>
          <h3>No hay usuarios</h3>
          <p>No se encontraron usuarios en el sistema.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.idUsuario}>
                  <td>{u.idUsuario}</td>
                  <td>{u.nombre} {u.apellido}</td>
                  <td>{u.email}</td>
                  <td>
                    <span style={{
                      color: u.rol === 'Administrador'
                        ? 'var(--accent)'
                        : u.rol === 'Profesional'
                          ? 'var(--primary-light)'
                          : 'var(--text-secondary)',
                      fontWeight: '600',
                    }}>
                      {u.rol}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${(u.estado || 'activo').toLowerCase()}`}>
                      {u.estado || 'Activo'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.estado === 'Activo' ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => toggleEstado(u)}
                    >
                      <i className={`fas ${u.estado === 'Activo' ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                      {u.estado === 'Activo' ? ' Desactivar' : ' Activar'}
                    </button>
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
