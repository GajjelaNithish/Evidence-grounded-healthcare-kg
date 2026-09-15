import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
        <span style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-md)' }}>
          Authenticating session...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to the default portal for the user's role
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (user?.role === 'doctor') return <Navigate to="/doctor" replace />;
    if (user?.role === 'patient') return <Navigate to="/patient" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
