import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Servicios from './pages/Servicios';
import Disponibilidad from './pages/Disponibilidad';
import Agenda from './pages/Agenda';
import Buscar from './pages/Buscar';
import Reservar from './pages/Reservar';
import MisTurnos from './pages/MisTurnos';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import Perfil from './pages/Perfil';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/dashboard" />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <Header />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      <Route path="/dashboard" element={
        <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
      } />
      <Route path="/servicios" element={
        <ProtectedRoute roles={['Profesional']}><AppLayout><Servicios /></AppLayout></ProtectedRoute>
      } />
      <Route path="/disponibilidad" element={
        <ProtectedRoute roles={['Profesional']}><AppLayout><Disponibilidad /></AppLayout></ProtectedRoute>
      } />
      <Route path="/agenda" element={
        <ProtectedRoute roles={['Profesional']}><AppLayout><Agenda /></AppLayout></ProtectedRoute>
      } />
      <Route path="/buscar" element={
        <ProtectedRoute roles={['Cliente']}><AppLayout><Buscar /></AppLayout></ProtectedRoute>
      } />
      <Route path="/reservar/:idProfesional" element={
        <ProtectedRoute roles={['Cliente']}><AppLayout><Reservar /></AppLayout></ProtectedRoute>
      } />
      <Route path="/mis-turnos" element={
        <ProtectedRoute roles={['Cliente']}><AppLayout><MisTurnos /></AppLayout></ProtectedRoute>
      } />
      <Route path="/reportes" element={
        <ProtectedRoute roles={['Profesional', 'Administrador']}><AppLayout><Reportes /></AppLayout></ProtectedRoute>
      } />
      <Route path="/usuarios" element={
        <ProtectedRoute roles={['Administrador']}><AppLayout><Usuarios /></AppLayout></ProtectedRoute>
      } />
      <Route path="/perfil" element={
        <ProtectedRoute><AppLayout><Perfil /></AppLayout></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  );
}
