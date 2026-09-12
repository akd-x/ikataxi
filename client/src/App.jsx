import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import RiderDashboard from './pages/RiderDashboard';
import DriverDashboard from './pages/DriverDashboard';

function RequireAuth({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Chargement…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'driver' ? '/driver' : '/rider'} replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Chargement…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'driver' ? '/driver' : '/rider'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/rider"
        element={
          <RequireAuth role="rider">
            <RiderDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/driver"
        element={
          <RequireAuth role="driver">
            <DriverDashboard />
          </RequireAuth>
        }
      />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  );
}
