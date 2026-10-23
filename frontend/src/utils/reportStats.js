const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const listValue = (value) => (Array.isArray(value) ? value : []);

export function normalizeReportStats(raw = {}) {
  const stateSource = raw.turnosPorEstado;
  const turnosPorEstado = Array.isArray(stateSource)
    ? stateSource.reduce((acc, item) => {
        acc[String(item.estado || '').toLowerCase()] = numberValue(item.total);
        return acc;
      }, {})
    : Object.entries(stateSource || {}).reduce((acc, [key, value]) => {
        acc[String(key).toLowerCase()] = numberValue(value);
        return acc;
      }, {});

  return {
    periodo: {
      fechaDesde: raw.periodo?.fechaDesde || '',
      fechaHasta: raw.periodo?.fechaHasta || '',
    },
    totalTurnos: numberValue(raw.totalTurnos),
    turnosHoy: numberValue(raw.turnosHoy),
    totalConfirmados: numberValue(raw.totalConfirmados),
    totalFinalizados: numberValue(raw.totalFinalizados),
    totalCancelaciones: numberValue(raw.totalCancelaciones ?? raw.cancelaciones),
    tasaOcupacion: numberValue(raw.tasaOcupacion),
    ingresos: numberValue(raw.ingresos ?? raw.ingresosMes),
    turnosPorEstado,
    turnosPorDia: listValue(raw.turnosPorDia).map((item) => ({
      fecha: String(item.fecha || ''),
      total: numberValue(item.total),
    })),
    turnosPorHora: listValue(raw.turnosPorHora)
      .map((item) => ({ hora: numberValue(item.hora), total: numberValue(item.total) }))
      .filter((item) => item.hora >= 0 && item.hora <= 23),
    serviciosTop: listValue(raw.serviciosTop ?? raw.serviciosMasSolicitados).map((item) => ({
      idServicio: item.idServicio,
      nombre: item.nombre || item.servicio || 'Servicio',
      total: numberValue(item.total ?? item.cantidad),
    })),
  };
}

export const emptyReportStats = normalizeReportStats();

export const horaLabel = (hora) => `${String(hora).padStart(2, '0')}:00`;
export const franjaLabel = (hora) => `${horaLabel(hora)} a ${horaLabel((hora + 1) % 24)}`;

// Serie continua desde la primera hasta la última hora con turnos (las horas sin turnos valen 0).
export function buildHourSeries(turnosPorHora = []) {
  if (turnosPorHora.length === 0) return [];
  const porHora = new Map(turnosPorHora.map((item) => [item.hora, item.total]));
  const horas = turnosPorHora.map((item) => item.hora);
  const serie = [];
  for (let hora = Math.min(...horas); hora <= Math.max(...horas); hora += 1) {
    serie.push({ hora, total: porHora.get(hora) || 0 });
  }
  return serie;
}

// Las franjas más demandadas, de mayor a menor cantidad de turnos.
export function topHorasPico(turnosPorHora = [], cantidad = 3) {
  return [...turnosPorHora]
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total || a.hora - b.hora)
    .slice(0, cantidad);
}
