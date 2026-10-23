import { buildHourSeries, franjaLabel } from './reportStats';

const ESTADOS = [
  ['pendiente', 'Pendiente'],
  ['confirmado', 'Confirmado'],
  ['cancelado', 'Cancelado'],
  ['finalizado', 'Finalizado'],
  ['vencido', 'Vencido'],
];

const NAVY = [24, 34, 56];
const ORANGE = [233, 108, 77];

const fechaCorta = (iso) => {
  if (!iso) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};
const dinero = (valor) => `$${Number(valor).toLocaleString('es-AR')}`;
const porcentaje = (parte, total) => (total === 0 ? '0%' : `${Math.round((parte * 1000) / total) / 10}%`);

export function nombreArchivo(stats, extension) {
  return `reporte-smartagenda_${stats.periodo.fechaDesde}_${stats.periodo.fechaHasta}.${extension}`;
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filasEstado(stats) {
  return ESTADOS.map(([clave, nombre]) => [nombre, stats.turnosPorEstado[clave] || 0]);
}

// meta: { alcance, generadoPor, generadoEn }
export async function exportarPdf(stats, meta) {
  const [{ jsPDF }, tablaModulo] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  // Según el empaquetador, la función viene directa o dentro de otro `default`.
  const porDefecto = tablaModulo.default;
  const autoTable = typeof porDefecto === 'function' ? porDefecto : porDefecto.default;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const margen = 40;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, ancho, 92, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, 92, ancho, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('SmartAgenda PRO', margen, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Reporte de turnos', margen, 64);
  doc.setFontSize(9);
  doc.text(`Generado el ${meta.generadoEn}`, ancho - margen, 42, { align: 'right' });
  doc.text(`por ${meta.generadoPor}`, ancho - margen, 56, { align: 'right' });

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Período: ${fechaCorta(stats.periodo.fechaDesde)} al ${fechaCorta(stats.periodo.fechaHasta)}`, margen, 124);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(91, 107, 130);
  doc.text(`Alcance: ${meta.alcance}`, margen, 140);

  const alto = doc.internal.pageSize.getHeight();
  const encabezadoSeccion = (titulo, y) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(titulo, margen, y);
  };
  // Dibuja el título y la tabla. Si la sección no entra entera en lo que queda de la hoja, pasa a la siguiente.
  let y = 168;
  const seccion = (titulo, tabla, derecha = []) => {
    const estimado = 40 + 22 * (tabla.body.length + 1);
    if (y + estimado > alto - 50 && estimado < alto - 120) {
      doc.addPage();
      y = 56;
    }
    encabezadoSeccion(titulo, y);
    autoTable(doc, {
      theme: 'grid',
      startY: y + 8,
      margin: { left: margen, right: margen },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5, lineColor: [201, 209, 222] },
      alternateRowStyles: { fillColor: [247, 248, 251] },
      didParseCell: (data) => {
        if (data.section === 'head' && derecha.includes(data.column.index)) data.cell.styles.halign = 'right';
      },
      ...tabla,
      columnStyles: Object.fromEntries(
        [...new Set([...derecha, ...Object.keys(tabla.columnStyles || {}).map(Number)])].map((i) => [
          i,
          { ...(derecha.includes(i) ? { halign: 'right' } : {}), ...(tabla.columnStyles?.[i] || {}) },
        ]),
      ),
    });
    y = doc.lastAutoTable.finalY + 26;
  };

  seccion('Resumen', {
    head: [['Indicador', 'Valor']],
    body: [
      ['Total de turnos', stats.totalTurnos],
      ['Tasa de ocupación', `${stats.tasaOcupacion}%`],
      ['Confirmados', stats.totalConfirmados],
      ['Finalizados', stats.totalFinalizados],
      ['Cancelaciones', stats.totalCancelaciones],
      ['Ingresos (confirmados y finalizados)', dinero(stats.ingresos)],
    ],
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  }, [1]);

  seccion('Turnos por estado', {
    head: [['Estado', 'Turnos', '% del total']],
    body: filasEstado(stats).map(([nombre, total]) => [nombre, total, porcentaje(total, stats.totalTurnos)]),
  }, [1, 2]);

  seccion('Servicios más solicitados', {
    head: [['Servicio', 'Turnos', '% del total']],
    body: stats.serviciosTop.length
      ? stats.serviciosTop.map((s) => [s.nombre, s.total, porcentaje(s.total, stats.totalTurnos)])
      : [['Sin servicios en el período', '', '']],
  }, [1, 2]);

  const serieHoras = buildHourSeries(stats.turnosPorHora);
  const maxHora = Math.max(0, ...serieHoras.map((h) => h.total));
  seccion('Horas pico', {
    head: [['Franja horaria', 'Turnos', 'Demanda']],
    body: serieHoras.length ? serieHoras.map((h) => [franjaLabel(h.hora), h.total, '']) : [['Sin turnos en el período', '', '']],
    columnStyles: { 1: { cellWidth: 70 }, 2: { cellWidth: 200 } },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 2 || !serieHoras.length) return;
      const hora = serieHoras[data.row.index];
      if (!hora || maxHora === 0) return;
      const largo = ((data.cell.width - 12) * hora.total) / maxHora;
      doc.setFillColor(...(hora.total === maxHora ? ORANGE : [102, 123, 159]));
      doc.rect(data.cell.x + 6, data.cell.y + 5, Math.max(largo, hora.total ? 2 : 0), data.cell.height - 10, 'F');
    },
  }, [1]);

  seccion('Actividad diaria', {
    head: [['Fecha', 'Turnos']],
    body: stats.turnosPorDia.length
      ? stats.turnosPorDia.map((d) => [fechaCorta(d.fecha), d.total])
      : [['Sin actividad en el período', '']],
  }, [1]);

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(138, 151, 171);
    doc.text(`SmartAgenda PRO - Reporte de turnos - Página ${i} de ${paginas}`, ancho / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
  }

  const nombre = nombreArchivo(stats, 'pdf');
  descargar(doc.output('blob'), nombre);
  return nombre;
}

export async function exportarExcel(stats, meta) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'SmartAgenda PRO';
  libro.created = new Date();

  const encabezado = (hoja, fila) => {
    const row = hoja.getRow(fila);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF182238' } };
    row.alignment = { vertical: 'middle' };
  };
  const tabla = (nombre, columnas, filas, anchos) => {
    const hoja = libro.addWorksheet(nombre);
    hoja.columns = columnas.map((titulo, i) => ({ header: titulo, width: anchos[i] }));
    filas.forEach((fila) => hoja.addRow(fila));
    encabezado(hoja, 1);
    hoja.views = [{ state: 'frozen', ySplit: 1 }];
    return hoja;
  };

  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [{ width: 38 }, { width: 24 }];
  resumen.addRow(['SmartAgenda PRO - Reporte de turnos']).font = { bold: true, size: 14, color: { argb: 'FF182238' } };
  resumen.addRow(['Período', `${fechaCorta(stats.periodo.fechaDesde)} al ${fechaCorta(stats.periodo.fechaHasta)}`]);
  resumen.addRow(['Alcance', meta.alcance]);
  resumen.addRow(['Generado', `${meta.generadoEn} por ${meta.generadoPor}`]);
  resumen.addRow([]);
  resumen.addRow(['Indicador', 'Valor']);
  encabezado(resumen, 6);
  resumen.addRow(['Total de turnos', stats.totalTurnos]);
  resumen.addRow(['Tasa de ocupación', stats.tasaOcupacion / 100]).getCell(2).numFmt = '0.0%';
  resumen.addRow(['Confirmados', stats.totalConfirmados]);
  resumen.addRow(['Finalizados', stats.totalFinalizados]);
  resumen.addRow(['Cancelaciones', stats.totalCancelaciones]);
  resumen.addRow(['Ingresos (confirmados y finalizados)', stats.ingresos]).getCell(2).numFmt = '"$"#,##0';
  resumen.getColumn(2).alignment = { horizontal: 'right' };

  tabla('Por estado', ['Estado', 'Turnos', '% del total'],
    filasEstado(stats).map(([nombre, total]) => [nombre, total, stats.totalTurnos ? total / stats.totalTurnos : 0]), [22, 12, 14])
    .getColumn(3).numFmt = '0.0%';

  tabla('Servicios', ['Servicio', 'Turnos', '% del total'],
    stats.serviciosTop.map((s) => [s.nombre, s.total, stats.totalTurnos ? s.total / stats.totalTurnos : 0]), [34, 12, 14])
    .getColumn(3).numFmt = '0.0%';

  tabla('Horas pico', ['Franja horaria', 'Turnos'],
    buildHourSeries(stats.turnosPorHora).map((h) => [franjaLabel(h.hora), h.total]), [22, 12]);

  tabla('Actividad diaria', ['Fecha', 'Turnos'],
    stats.turnosPorDia.map((d) => [fechaCorta(d.fecha), d.total]), [16, 12]);

  const buffer = await libro.xlsx.writeBuffer();
  const nombre = nombreArchivo(stats, 'xlsx');
  descargar(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombre);
  return nombre;
}
