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

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** 'hoy', 'mañana' o 'Lun 26/10' para una fecha AAAA-MM-DD */
export function etiquetaDia(fecha) {
  if (fecha === fechaLocal()) return 'hoy';
  if (fecha === fechaLocalEnDias(1)) return 'mañana';
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return `${DIAS_CORTOS[new Date(anio, mes - 1, dia).getDay()]} ${dia}/${mes}`;
}
