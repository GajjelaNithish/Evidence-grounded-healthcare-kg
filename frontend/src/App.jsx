import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import LoginPage from './pages/LoginPage';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import AssignmentsPage from './pages/admin/AssignmentsPage';
import AuditPage from './pages/admin/AuditPage';

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientDetailView from './pages/doctor/PatientDetailView';
import DoctorQueryPage from './pages/doctor/DoctorQueryPage';
import DoctorUploadPage from './pages/doctor/DoctorUploadPage';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientTimelinePage from './pages/patient/PatientTimelinePage';
import PatientQueryPage from './pages/patient/PatientQueryPage';

function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
        <span style={{ color: 'var(--text-secondary)' }}>Loading ClinicalKG...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'doctor') return <Navigate to="/doctor" replace />;
  if (user?.role === 'patient') return <Navigate to="/patient" replace />;

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Admin Portal */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<AppLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/assignments" element={<AssignmentsPage />} />
                <Route path="/admin/audit" element={<AuditPage />} />
              </Route>
            </Route>

            {/* Doctor Portal */}
            <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
              <Route element={<AppLayout />}>
                <Route path="/doctor" element={<DoctorDashboard />} />
                <Route path="/doctor/patients/:patientId" element={<PatientDetailView />} />
                <Route path="/doctor/query" element={<DoctorQueryPage />} />
                <Route path="/doctor/upload" element={<DoctorUploadPage />} />
              </Route>
            </Route>

            {/* Patient Portal */}
            <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
              <Route element={<AppLayout />}>
                <Route path="/patient" element={<PatientDashboard />} />
                <Route path="/patient/timeline" element={<PatientTimelinePage />} />
                <Route path="/patient/query" element={<PatientQueryPage />} />
              </Route>
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
