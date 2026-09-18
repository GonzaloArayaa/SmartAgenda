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

  const turnosPorEstado = stats?.turnosPorEstado || {};
  const serviciosMasSolicitados = stats?.serviciosMasSolicitados || [];

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
        backgroundColor: ['#FFB300', '#00C853', '#FF5252', '#448AFF'],
        borderColor: ['#FFB300', '#00C853', '#FF5252', '#448AFF'],
        borderWidth: 1,
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
        backgroundColor: 'rgba(108, 99, 255, 0.6)',
        borderColor: '#6C63FF',
        borderWidth: 1,
        borderRadius: 8,
        hoverBackgroundColor: 'rgba(108, 99, 255, 0.9)',
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
    <div>
      <div className="page-header">
        <div>
          <h2><i className="fas fa-chart-bar"></i> Reportes y Estadísticas</h2>
          <p>Analizá el rendimiento de tu negocio.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="section-title">
          <i className="fas fa-filter"></i> Filtrar por Fecha
        </h3>
        <div className="form-row">
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
        <button className="btn btn-primary" onClick={handleFiltrar}>
          <i className="fas fa-search"></i> Filtrar
        </button>
      </div>

      {loading ? (
        <div className="spinner"></div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-info">
                <h3>Tasa Ocupación</h3>
                <p>{stats?.tasaOcupacion ?? 0}%</p>
              </div>
              <div className="stat-card-icon green">
                <i className="fas fa-chart-pie"></i>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <h3>Total Turnos</h3>
                <p>{stats?.totalTurnos ?? 0}</p>
              </div>
              <div className="stat-card-icon purple">
                <i className="fas fa-calendar-check"></i>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <h3>Cancelaciones</h3>
                <p>{stats?.cancelaciones ?? 0}</p>
              </div>
              <div className="stat-card-icon red">
                <i className="fas fa-times-circle"></i>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="card">
              <h3 className="section-title">
                <i className="fas fa-chart-pie"></i> Turnos por Estado
              </h3>
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>

            <div className="card">
              <h3 className="section-title">
                <i className="fas fa-chart-bar"></i> Servicios Más Solicitados
              </h3>
              <div style={{ height: '300px' }}>
                <Bar data={barData} options={barOptions} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
