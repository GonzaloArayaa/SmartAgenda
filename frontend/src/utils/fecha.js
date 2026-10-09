// Fechas en la zona horaria del usuario.
// No usar toISOString() para obtener "hoy": convierte a UTC y en Argentina (UTC-3),
// desde las 21:00 devuelve el día siguiente.

/** Fecha local en formato AAAA-MM-DD (por defecto, hoy). */
export function fechaLocal(date = new Date()) {
  const anio = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Fecha local dentro de `dias` días (negativo para el pasado). */
export function fechaLocalEnDias(dias, desde = new Date()) {
  const date = new Date(desde);
  date.setDate(date.getDate() + dias);
  return fechaLocal(date);
}

/** '09:00:00' -> '09:00' */
export function horaCorta(hora) {
  return hora ? String(hora).slice(0, 5) : '';
}
