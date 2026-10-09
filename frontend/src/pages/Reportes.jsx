import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportes } from '../services/api';
import { emptyReportStats, normalizeReportStats } from '../utils/reportStats';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function currentMonthRange() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const lastDay = String(new Date(year, date.getMonth() + 1, 0).getDate()).padStart(2, '0');
  return { fechaDesde: `${year}-${month}-01`, fechaHasta: `${year}-${month}-${lastDay}` };
}

function shortDate(value) {
  if (!value) return '';
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export default function Reportes() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'Administrador';
  const initialRange = useMemo(() => currentMonthRange(), []);
  const [fechaDesde, setFechaDesde] = useState(initialRange.fechaDesde);
  const [fechaHasta, setFechaHasta] = useState(initialRange.fechaHasta);
  const [appliedRange, setAppliedRange] = useState(initialRange);
  const [stats, setStats] = useState(emptyReportStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadStats() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams(appliedRange);
        if (user.idProfesional) params.set('idProfesional', user.idProfesional);
        const data = await reportes.getEstadisticas(params.toString());
        if (active) setStats(normalizeReportStats(data));
      } catch (requestError) {
        if (active) {
          setStats(emptyReportStats);
          setError(requestError.message || 'No pudimos cargar las estadísticas.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadStats();
    return () => { active = false; };
  }, [appliedRange, user.idProfesional]);

  function handleFiltrar() {
    if (!fechaDesde || !fechaHasta) {
      setError('Seleccioná las dos fechas del período.');
      return;
    }
    if (fechaDesde > fechaHasta) {
      setError('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    setAppliedRange({ fechaDesde, fechaHasta });
  }

  const statusValues = ['pendiente', 'confirmado', 'cancelado', 'finalizado', 'vencido'].map(
    (status) => stats.turnosPorEstado[status] || 0,
  );
  const hasStatusData = statusValues.some((value) => value > 0);
  const hasServices = stats.serviciosTop.length > 0;
  const hasDailyActivity = stats.turnosPorDia.length > 0;

  const doughnutData = {
    labels: ['Pendiente', 'Confirmado', 'Cancelado', 'Finalizado', 'Vencido'],
    datasets: [{
      data: statusValues,
      backgroundColor: ['#E8B35A', '#55A980', '#D66B71', '#667B9F', '#A1A8B7'],
      borderColor: '#FFFDF9',
      borderWidth: 3,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1A1A2E', titleColor: '#EAEAEA', bodyColor: '#A0A0B8', borderColor: '#2A2A4A', borderWidth: 1 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#7B8494', font: { family: 'Inter', size: 11 } } },
      y: { grid: { color: 'rgba(102,123,159,.12)' }, ticks: { color: '#7B8494', stepSize: 1 }, beginAtZero: true },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      ...chartOptions.plugins,
      legend: { position: 'bottom', labels: { color: '#7B8494', padding: 16, usePointStyle: true } },
    },
  };

  const servicesData = {
    labels: stats.serviciosTop.map((service) => service.nombre),
    datasets: [{ label: 'Turnos', data: stats.serviciosTop.map((service) => service.total), backgroundColor: '#E96C4D', borderRadius: 5 }],
  };
  const dailyData = {
    labels: stats.turnosPorDia.map((item) => shortDate(item.fecha)),
    datasets: [{ label: 'Turnos', data: stats.turnosPorDia.map((item) => item.total), backgroundColor: '#667B9F', borderRadius: 5 }],
  };

  const periodLabel = stats.periodo.fechaDesde
    ? `${shortDate(stats.periodo.fechaDesde)} — ${shortDate(stats.periodo.fechaHasta)}`
    : `${shortDate(appliedRange.fechaDesde)} — ${shortDate(appliedRange.fechaHasta)}`;

  return (
    <div className={`reports-page pro-module-page ${isAdmin ? 'admin-reports-page' : ''}`}>
      <section className="module-hero reports-module-hero">
        <div>
          <span className="module-kicker">{isAdmin ? 'INTELIGENCIA DE PLATAFORMA' : 'ANÁLISIS DEL NEGOCIO'}</span>
          <h2>{isAdmin ? 'Analítica general' : 'Reportes'}</h2>
          <p>{isAdmin ? 'Supervisá la actividad global y detectá tendencias del sistema.' : 'Convertí la actividad de tu agenda en decisiones concretas.'}</p>
        </div>
        <div className="report-hero-note"><i className={`fas ${isAdmin ? 'fa-database' : 'fa-chart-line'}`} /><span>Período analizado</span><strong>{periodLabel}</strong></div>
      </section>

      {isAdmin && <aside className="admin-report-scope"><i className="fas fa-shield-alt" /><div><strong>Vista administrativa global</strong><span>Las métricas incluyen la actividad de todos los profesionales y clientes registrados.</span></div></aside>}

      <section className="report-filter-bar">
        <div className="report-filter-title"><i className="fas fa-sliders-h" /><div><span>PERÍODO</span><strong>Filtrar resultados</strong></div></div>
        <div className="report-filter-fields">
          <div className="form-group"><label className="form-label">Desde</label><input type="date" className="form-input" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} /></div>
          <div className="form-group"><label className="form-label">Hasta</label><input type="date" className="form-input" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} /></div>
        </div>
        <button className="module-primary-btn" onClick={handleFiltrar} disabled={loading}><i className="fas fa-check" /> {loading ? 'Actualizando…' : 'Aplicar período'}</button>
      </section>

      {error && <div className="report-feedback report-feedback-error" role="alert"><i className="fas fa-exclamation-circle" /><div><strong>No se pudieron mostrar las métricas</strong><span>{error}</span></div><button type="button" onClick={() => setAppliedRange({ fechaDesde, fechaHasta })}>Reintentar</button></div>}

      {loading ? <div className="report-loading"><div className="spinner" /><span>Calculando estadísticas del período…</span></div> : !error && (
        <>
          <section className="report-metrics-grid">
            <article><span>OCUPACIÓN</span><strong>{stats.tasaOcupacion}%</strong><small>{isAdmin ? 'Rendimiento global' : 'Uso efectivo de agenda'}</small><i className="fas fa-chart-pie" /></article>
            <article><span>TOTAL DE TURNOS</span><strong>{stats.totalTurnos}</strong><small>En el período seleccionado</small><i className="far fa-calendar-check" /></article>
            <article><span>VOLUMEN GENERADO</span><strong>${stats.ingresos.toLocaleString('es-AR')}</strong><small>Confirmados y finalizados</small><i className="fas fa-dollar-sign" /></article>
            <article><span>CANCELACIONES</span><strong>{stats.totalCancelaciones}</strong><small>Turnos que no se realizaron</small><i className="fas fa-times" /></article>
          </section>

          {stats.totalTurnos === 0 ? (
            <div className="report-feedback report-feedback-empty"><i className="far fa-calendar" /><div><strong>No hay actividad en este período</strong><span>Probá con un rango de fechas diferente.</span></div></div>
          ) : (
            <section className="report-charts-grid">
              <article className="report-chart-card"><header><span>DISTRIBUCIÓN</span><h3>Turnos por estado</h3></header><div className="report-chart-canvas report-doughnut">{hasStatusData ? <Doughnut data={doughnutData} options={doughnutOptions} /> : <div className="report-chart-empty">Sin estados para mostrar</div>}</div></article>
              <article className="report-chart-card"><header><span>DEMANDA</span><h3>Servicios más solicitados</h3></header><div className="report-chart-canvas">{hasServices ? <Bar data={servicesData} options={chartOptions} /> : <div className="report-chart-empty">Sin servicios para mostrar</div>}</div></article>
              <article className="report-chart-card report-chart-wide"><header><span>EVOLUCIÓN</span><h3>Actividad diaria</h3></header><div className="report-chart-canvas">{hasDailyActivity ? <Bar data={dailyData} options={chartOptions} /> : <div className="report-chart-empty">Sin actividad diaria para mostrar</div>}</div></article>
            </section>
          )}
        </>
      )}
    </div>
  );
}
