import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportes } from '../services/api';
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

export default function Reportes() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'Administrador';
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user.idProfesional) params.append('idProfesional', user.idProfesional);
      if (fechaDesde) params.append('fechaDesde', fechaDesde);
      if (fechaHasta) params.append('fechaHasta', fechaHasta);
      const data = await reportes.getEstadisticas(params.toString());
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  function handleFiltrar() {
    fetchStats();
  }

  const estadosRaw = stats?.turnosPorEstado || {};
  const turnosPorEstado = Array.isArray(estadosRaw)
    ? estadosRaw.reduce((acc, item) => ({ ...acc, [String(item.estado).toLowerCase()]: Number(item.total || 0) }), {})
    : estadosRaw;
  const serviciosMasSolicitados = stats?.serviciosTop || stats?.serviciosMasSolicitados || [];

  const doughnutData = {
    labels: ['Pendiente', 'Confirmado', 'Cancelado', 'Finalizado'],
    datasets: [
      {
        data: [
          turnosPorEstado.Pendiente || turnosPorEstado.pendiente || 0,
          turnosPorEstado.Confirmado || turnosPorEstado.confirmado || 0,
          turnosPorEstado.Cancelado || turnosPorEstado.cancelado || 0,
          turnosPorEstado.Finalizado || turnosPorEstado.finalizado || 0,
        ],
        backgroundColor: ['#E8B35A', '#55A980', '#D66B71', '#667B9F'],
        borderColor: '#FFFDF9',
        borderWidth: 3,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#A0A0B8',
          font: { family: 'Inter', size: 12 },
          padding: 16,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#1A1A2E',
        titleColor: '#EAEAEA',
        bodyColor: '#A0A0B8',
        borderColor: '#2A2A4A',
        borderWidth: 1,
      },
    },
  };

  const barLabels = serviciosMasSolicitados.map((s) => s.nombre || s.servicio || 'Servicio');
  const barValues = serviciosMasSolicitados.map((s) => s.cantidad || s.total || 0);

  const barData = {
    labels: barLabels.length > 0 ? barLabels : ['Sin datos'],
    datasets: [
      {
        label: 'Cantidad de turnos',
        data: barValues.length > 0 ? barValues : [0],
        backgroundColor: '#E96C4D',
        borderColor: '#E96C4D',
        borderWidth: 0,
        borderRadius: 5,
        hoverBackgroundColor: '#D75B3E',
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1A1A2E',
        titleColor: '#EAEAEA',
        bodyColor: '#A0A0B8',
        borderColor: '#2A2A4A',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#A0A0B8', font: { family: 'Inter', size: 11 } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#A0A0B8', font: { family: 'Inter', size: 11 }, stepSize: 1 },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className={`reports-page pro-module-page ${isAdmin ? 'admin-reports-page' : ''}`}>
      <section className="module-hero reports-module-hero">
        <div>
          <span className="module-kicker">{isAdmin ? 'INTELIGENCIA DE PLATAFORMA' : 'ANÁLISIS DEL NEGOCIO'}</span>
          <h2>{isAdmin ? 'Analítica general' : 'Reportes'}</h2>
          <p>{isAdmin ? 'Supervisá la actividad global y detectá tendencias del sistema.' : 'Convertí la actividad de tu agenda en decisiones concretas.'}</p>
        </div>
        <div className="report-hero-note"><i className={`fas ${isAdmin ? 'fa-database' : 'fa-chart-line'}`} /><span>{isAdmin ? 'Alcance del reporte' : 'Información actualizada'}</span><strong>{isAdmin ? 'Toda la plataforma' : 'Según el período elegido'}</strong></div>
      </section>

      {isAdmin && <aside className="admin-report-scope"><i className="fas fa-shield-alt" /><div><strong>Vista administrativa global</strong><span>Las métricas incluyen la actividad de todos los profesionales y clientes registrados.</span></div></aside>}

      <section className="report-filter-bar">
        <div className="report-filter-title"><i className="fas fa-sliders-h" /><div><span>PERÍODO</span><strong>Filtrar resultados</strong></div></div>
        <div className="report-filter-fields">
          <div className="form-group">
            <label className="form-label">Desde</label>
            <input
              type="date"
              className="form-input"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Hasta</label>
            <input
              type="date"
              className="form-input"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>
        <button className="module-primary-btn" onClick={handleFiltrar}>
          <i className="fas fa-check"></i> Aplicar período
        </button>
      </section>

      {loading ? (
        <div className="spinner"></div>
      ) : (
        <>
          <section className="report-metrics-grid">
            <article><span>OCUPACIÓN</span><strong>{stats?.tasaOcupacion ?? 0}%</strong><small>{isAdmin ? 'Rendimiento global' : 'Uso efectivo de agenda'}</small><i className="fas fa-chart-pie" /></article>
            <article><span>TOTAL DE TURNOS</span><strong>{stats?.totalTurnos ?? 0}</strong><small>En el período seleccionado</small><i className="far fa-calendar-check" /></article>
            <article><span>VOLUMEN GENERADO</span><strong>${Number(stats?.ingresos ?? 0).toLocaleString('es-AR')}</strong><small>{isAdmin ? 'Actividad de la plataforma' : 'Confirmados y finalizados'}</small><i className="fas fa-dollar-sign" /></article>
            <article><span>CANCELACIONES</span><strong>{stats?.totalCancelaciones ?? stats?.cancelaciones ?? 0}</strong><small>Turnos que no se realizaron</small><i className="fas fa-times" /></article>
          </section>

          <section className="report-charts-grid">
            <article className="report-chart-card">
              <header><span>DISTRIBUCIÓN</span><h3>Turnos por estado</h3></header>
              <div className="report-chart-canvas report-doughnut">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </article>

            <article className="report-chart-card">
              <header><span>DEMANDA</span><h3>Servicios más solicitados</h3></header>
              <div className="report-chart-canvas">
                <Bar data={barData} options={barOptions} />
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
