// Prueba de la lógica de fechas de la Agenda. Se corre con: node src/utils/agendaFechas.test.mjs
import assert from 'node:assert/strict';
import * as F from './agendaFechas.js';
const d = (a, m, dia) => new Date(a, m - 1, dia);
const s = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// meses: no se pasa de fin de mes y vuelve a su lugar
assert.equal(s(F.sumarMeses(d(2026, 1, 31), 1)), '2026-02-28');
assert.equal(s(F.sumarMeses(d(2028, 1, 31), 1)), '2028-02-29');
assert.equal(s(F.sumarMeses(d(2026, 3, 31), -1)), '2026-02-28');
assert.equal(s(F.sumarMeses(d(2026, 12, 15), 1)), '2027-01-15');
assert.equal(s(F.sumarMeses(d(2026, 1, 15), -1)), '2025-12-15');
// semana: lunes a domingo (23/10/2026 es viernes; el domingo 25 pertenece a la misma semana)
assert.deepEqual(F.semanaDe(d(2026, 10, 23)).map(s), ['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25']);
assert.deepEqual(F.semanaDe(d(2026, 10, 25)).map(s)[0], '2026-10-19');
assert.deepEqual(F.semanaDe(d(2026, 10, 26)).map(s)[0], '2026-10-26');
assert.equal(F.indiceEnSemana(d(2026, 10, 25)), 6);
assert.equal(F.indiceEnSemana(d(2026, 10, 26)), 0);
// cuadrícula del mes: octubre 2026 empieza jueves 1 y termina sábado 31 -> del 28/9 al 1/11
let g = F.cuadriculaMes(d(2026, 10, 23));
assert.equal(s(g[0]), '2026-09-28'); assert.equal(s(g[g.length - 1]), '2026-11-01'); assert.equal(g.length, 35);
// febrero 2027 empieza lunes y termina domingo: exactamente 4 semanas
g = F.cuadriculaMes(d(2027, 2, 10)); assert.equal(g.length, 28); assert.equal(s(g[0]), '2027-02-01'); assert.equal(s(g[27]), '2027-02-28');
// un mes que necesita 6 filas (agosto 2026: empieza sábado)
g = F.cuadriculaMes(d(2026, 8, 5)); assert.equal(g.length, 42); assert.equal(s(g[0]), '2026-07-27'); assert.equal(s(g[41]), '2026-09-06');
// siempre múltiplo de 7 y arranca lunes
for (let m = 1; m <= 12; m++) { const c = F.cuadriculaMes(d(2026, m, 1)); assert.equal(c.length % 7, 0); assert.equal(c[0].getDay(), 1); }
// rangos y navegación
let r = F.rangoDeVista('dia', d(2026, 10, 23)); assert.equal(s(r.desde), '2026-10-23'); assert.equal(s(r.hasta), '2026-10-23');
r = F.rangoDeVista('semana', d(2026, 10, 23)); assert.equal(s(r.desde), '2026-10-19'); assert.equal(s(r.hasta), '2026-10-25');
r = F.rangoDeVista('mes', d(2026, 10, 23)); assert.equal(s(r.desde), '2026-09-28'); assert.equal(s(r.hasta), '2026-11-01');
assert.equal(s(F.moverFecha('dia', d(2026, 10, 31), 1)), '2026-11-01');
assert.equal(s(F.moverFecha('semana', d(2026, 10, 23), -1)), '2026-10-16');
assert.equal(s(F.moverFecha('mes', d(2026, 10, 31), 1)), '2026-11-30');
// cambio de horario de verano en otra zona no corre los días
assert.equal(s(F.sumarDias(d(2026, 3, 28), 2)), '2026-03-30');
// ida y vuelta de varias semanas conserva el día de la semana
let x = d(2026, 10, 23); for (let i = 0; i < 30; i++) x = F.moverFecha('semana', x, 1); for (let i = 0; i < 30; i++) x = F.moverFecha('semana', x, -1); assert.equal(s(x), '2026-10-23');
assert.equal(F.minutosDeHora('08:30:00'), 510); assert.equal(F.minutosDeHora('17:05'), 1025); assert.equal(F.minutosDeHora(null), 0);
console.log('fechas: todos los casos OK');
