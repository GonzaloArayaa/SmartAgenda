const API_URL = '/api';

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
  if (res.status === 401 && endpoint !== 'auth/check') {
    window.dispatchEvent(new Event('smartagenda:sesion-vencida'));
  }
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

export const auth = {
  login: (email, contrasena) => request('auth/login', { method: 'POST', body: { email, contrasena } }),
  register: (data) => request('auth/register', { method: 'POST', body: data }),
  logout: () => request('auth/logout', { method: 'POST' }),
  check: () => request('auth/check'),
};

export const perfil = {
  get: () => request('perfil'),
  update: (data) => request('perfil', { method: 'PUT', body: data }),
};

export const profesionales = {
  getAll: (params = '') => request(`profesionales?${params}`),
  getOne: (id) => request(`profesionales?id=${id}`),
  getByUsuario: (idUsuario) => request(`profesionales?idUsuario=${idUsuario}`),
  create: (data) => request('profesionales', { method: 'POST', body: data }),
  update: (data) => request('profesionales', { method: 'PUT', body: data }),
};

export const servicios = {
  getAll: () => request('servicios'), getByProfesional: (id) => request(`servicios?idProfesional=${id}`), getOne: (id) => request(`servicios?id=${id}`), create: (data) => request('servicios', { method: 'POST', body: data }), update: (data) => request('servicios', { method: 'PUT', body: data }), delete: (id) => request(`servicios?id=${id}`, { method: 'DELETE' }),
};

export const disponibilidad = {
  getByProfesional: (id) => request(`disponibilidad?idProfesional=${id}`), create: (data) => request('disponibilidad', { method: 'POST', body: data }), update: (data) => request('disponibilidad', { method: 'PUT', body: data }), delete: (id) => request(`disponibilidad?id=${id}`, { method: 'DELETE' }),
};

export const turnos = {
  getAll: (params = '') => request(`turnos?${params}`),
  getClients: (search = '', includeInactive = false) =>
    request(`turnos/clientes?buscar=${encodeURIComponent(search)}&incluirInactivos=${includeInactive}`),
  getHistoryServices: () => request('turnos/servicios'),
  create: (data) => request('turnos', { method: 'POST', body: data }),
  update: (data) => request('turnos', { method: 'PUT', body: data }),
};

export const recomendaciones = {
  get: (idProfesional, idServicio, fecha, excluirIdTurno) => {
    const params = new URLSearchParams({ idProfesional, idServicio, fecha });
    if (excluirIdTurno) params.set('excluirIdTurno', excluirIdTurno);
    return request(`recomendaciones?${params}`);
  },
};

export const reportes = {
  getEstadisticas: (params = '') => request(`reportes?tipo=general&${params}`),
  getRubros: () => request('reportes?tipo=rubros'),
};

export const usuarios = {
  getAll: () => request('usuarios'),
  update: (data) => request('usuarios', { method: 'PUT', body: data }),
};

export const listaEspera = {
  getAll: () => request('lista-espera'),
  create: (data) => request('lista-espera', { method: 'POST', body: data }),
  update: (data) => request('lista-espera', { method: 'PUT', body: data }),
};
