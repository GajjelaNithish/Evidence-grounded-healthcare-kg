import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { User, LogOut, ChevronRight, Shield, Stethoscope, FileText, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserProfileModal from './UserProfileModal';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  // Build Breadcrumbs from current pathname
  const getBreadcrumbs = () => {
    const path = location.pathname;

    if (path.startsWith('/admin')) {
      const items = [{ label: 'Admin', to: '/admin' }];
      if (path === '/admin') items.push({ label: 'Overview' });
      else if (path.includes('/users')) items.push({ label: 'User Management' });
      else if (path.includes('/assignments')) items.push({ label: 'Patient Assignments' });
      else if (path.includes('/audit')) items.push({ label: 'Audit Logs' });
      else if (path.includes('/evaluation')) items.push({ label: 'System Evaluation' });
      return items;
    }

    if (path.startsWith('/doctor')) {
      const items = [{ label: 'Doctor Portal', to: '/doctor/patients' }];
      if (path === '/doctor/patients') {
        items.push({ label: 'Assigned Patients' });
      } else if (path.includes('/doctor/patients/')) {
        const parts = path.split('/');
        const patientId = parts[3];
        items.push({ label: 'Patients', to: '/doctor/patients' });
        items.push({ label: patientId || 'Patient Detail' });
      }
      return items;
    }

    if (path.startsWith('/patient')) {
      const items = [{ label: 'Patient Portal', to: '/patient' }];
      if (path === '/patient') items.push({ label: 'My Clinical Record' });
      else if (path.includes('/timeline')) items.push({ label: 'Medical Timeline' });
      else if (path.includes('/query')) items.push({ label: 'Clinical Q&A' });
      return items;
    }

    return [{ label: 'Dashboard', to: '/' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="layout-root">
      {/* Sidebar Navigation */}
      <aside className="layout-sidebar" style={{ position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto', zIndex: 100, width: '220px' }}>
        <div className="sidebar-brand-title">ClinicalKG</div>

        <nav className="sidebar-nav-list">
          {user?.role === 'admin' && (
            <>
              <NavLink to="/admin" end className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                Overview
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                Users
              </NavLink>
              <NavLink to="/admin/assignments" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                Assignments
              </NavLink>
              <NavLink to="/admin/audit" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                Audit Log
              </NavLink>
              <NavLink to="/admin/evaluation" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                Evaluation
              </NavLink>
            </>
          )}

          {user?.role === 'doctor' && (
            <NavLink to="/doctor/patients" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              Patients
            </NavLink>
          )}

          {user?.role === 'patient' && (
            <>
              <NavLink to="/patient" end className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                My Record
              </NavLink>
              <NavLink to="/patient/timeline" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                Timeline
              </NavLink>
              <NavLink to="/patient/query" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                Ask a Question
              </NavLink>
            </>
          )}
        </nav>

        {/* Sidebar Bottom Panel with Profile & Logout */}
        <div className="sidebar-bottom-panel">
          <button
            type="button"
            className="sidebar-profile-btn"
            onClick={() => setShowProfileModal(true)}
            title="View Profile & Account"
          >
            <User size={16} />
            <div className="sidebar-user-text">
              <span className="sidebar-user-name">{user?.full_name || user?.username || 'User'}</span>
              <span className="sidebar-user-role">{user?.role?.toUpperCase()}</span>
            </div>
          </button>
          <button onClick={handleLogout} className="sidebar-logout-btn" id="logout-btn" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <main className="layout-main-area" style={{ marginLeft: '220px', height: '100vh', overflowY: 'auto' }}>
        {/* Top Header Bar with Breadcrumb Navigation & Profile Control */}
        <header className="app-top-header">
          <nav className="breadcrumb-nav" aria-label="Breadcrumb navigation">
            <ol className="breadcrumb-list">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <li key={idx} className="breadcrumb-item">
                    {idx > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
                    {crumb.to && !isLast ? (
                      <Link to={crumb.to} className="breadcrumb-link">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="breadcrumb-current">{crumb.label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* User Account Controls */}
          <div className="header-user-actions">
            <button
              type="button"
              className="btn-header-profile"
              onClick={() => setShowProfileModal(true)}
              id="header-profile-btn"
            >
              <User size={16} />
              <span>{user?.username}</span>
              <span className={`role-badge-pill role-${user?.role}`}>{user?.role}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="layout-content-wrapper">
          <Outlet />
        </div>
      </main>

      {/* Profile & Account Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
