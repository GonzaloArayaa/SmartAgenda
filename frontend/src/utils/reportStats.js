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
    serviciosTop: listValue(raw.serviciosTop ?? raw.serviciosMasSolicitados).map((item) => ({
      idServicio: item.idServicio,
      nombre: item.nombre || item.servicio || 'Servicio',
      total: numberValue(item.total ?? item.cantidad),
    })),
  };
}

export const emptyReportStats = normalizeReportStats();
