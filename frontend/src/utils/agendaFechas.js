// Cálculos de fechas de la Agenda (vistas día, semana y mes). Todas las fechas son locales.

export function sumarDias(fecha, dias) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

// Suma meses sin salirse del mes destino: 31 de enero + 1 mes = 28 (o 29) de febrero.
export function sumarMeses(fecha, meses) {
  const destino = new Date(fecha.getFullYear(), fecha.getMonth() + meses, 1);
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  return new Date(destino.getFullYear(), destino.getMonth(), Math.min(fecha.getDate(), ultimoDia));
}

// Lunes de la semana que contiene a la fecha
export function lunesDe(fecha) {
  return sumarDias(fecha, -((fecha.getDay() + 6) % 7));
}

// Los 7 días de la semana (lunes a domingo) que contiene a la fecha
export function semanaDe(fecha) {
  const lunes = lunesDe(fecha);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

// Posición del día dentro de la semana (0 = lunes ... 6 = domingo)
export function indiceEnSemana(fecha) {
  return (fecha.getDay() + 6) % 7;
}

// Días que se dibujan en la vista mensual: semanas completas, de lunes a domingo
export function cuadriculaMes(fecha) {
  const primero = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  const inicio = lunesDe(primero);
  const fin = sumarDias(lunesDe(ultimo), 6);
  const cantidad = Math.round((fin - inicio) / 86400000) + 1;
  return Array.from({ length: cantidad }, (_, i) => sumarDias(inicio, i));
}

// Rango de fechas que hay que pedir al backend para mostrar la vista
export function rangoDeVista(vista, fecha) {
  if (vista === 'dia') return { desde: fecha, hasta: fecha };
  if (vista === 'mes') {
    const dias = cuadriculaMes(fecha);
    return { desde: dias[0], hasta: dias[dias.length - 1] };
  }
  const dias = semanaDe(fecha);
  return { desde: dias[0], hasta: dias[6] };
}

// Mueve la fecha seleccionada un día, una semana o un mes (dirección: -1 o 1)
export function moverFecha(vista, fecha, direccion) {
  if (vista === 'dia') return sumarDias(fecha, direccion);
  if (vista === 'mes') return sumarMeses(fecha, direccion);
  return sumarDias(fecha, 7 * direccion);
}

// '08:30:00' -> 510
export function minutosDeHora(hora) {
  const [h, m] = String(hora || '0:0').split(':');
  return Number(h) * 60 + Number(m);
}
