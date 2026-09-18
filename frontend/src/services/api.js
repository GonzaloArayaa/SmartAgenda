const API_URL = 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const config = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(`${API_URL}/${endpoint}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

export const auth = {
  login: (email, contrasena) => request('auth.php?action=login', { method: 'POST', body: { email, contrasena } }),
  register: (data) => request('auth.php?action=register', { method: 'POST', body: data }),
  logout: () => request('auth.php?action=logout'),
  check: () => request('auth.php?action=check'),
};

export const profesionales = {
  getAll: (params = '') => request(`profesionales.php?${params}`),
  getOne: (id) => request(`profesionales.php?id=${id}`),
  getByUsuario: (idUsuario) => request(`profesionales.php?idUsuario=${idUsuario}`),
  create: (data) => request('profesionales.php', { method: 'POST', body: data }),
  update: (data) => request('profesionales.php', { method: 'PUT', body: data }),
};

export const servicios = {
  getAll: () => request('servicios.php'),
  getByProfesional: (id) => request(`servicios.php?idProfesional=${id}`),
  getOne: (id) => request(`servicios.php?id=${id}`),
  create: (data) => request('servicios.php', { method: 'POST', body: data }),
  update: (data) => request('servicios.php', { method: 'PUT', body: data }),
  delete: (id) => request(`servicios.php?id=${id}`, { method: 'DELETE' }),
};

export const disponibilidad = {
  getByProfesional: (id) => request(`disponibilidad.php?idProfesional=${id}`),
  create: (data) => request('disponibilidad.php', { method: 'POST', body: data }),
  update: (data) => request('disponibilidad.php', { method: 'PUT', body: data }),
  delete: (id) => request(`disponibilidad.php?id=${id}`, { method: 'DELETE' }),
};

export const turnos = {
  getAll: (params = '') => request(`turnos.php?${params}`),
  create: (data) => request('turnos.php', { method: 'POST', body: data }),
  update: (data) => request('turnos.php', { method: 'PUT', body: data }),
};

export const recomendaciones = {
  get: (idProfesional, idServicio, fecha) =>
    request(`recomendaciones.php?idProfesional=${idProfesional}&idServicio=${idServicio}&fecha=${fecha}`),
};

export const reportes = {
  getEstadisticas: (params = '') => request(`reportes.php?tipo=general&${params}`),
  getRubros: () => request('reportes.php?tipo=rubros'),
};

export const usuarios = {
  getAll: () => request('usuarios.php'),
  update: (data) => request('usuarios.php', { method: 'PUT', body: data }),
};
