// Textos para mostrar tiempo libre: 90 -> '1 h 30 min', 120 -> '2 h', 45 -> '45 min'
export function duracionTexto(minutos) {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
