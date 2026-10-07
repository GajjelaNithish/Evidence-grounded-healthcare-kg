import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  IconDashboard,
  IconUsers,
  IconUserCheck,
  IconFileText,
  IconActivity,
  IconClock,
  IconMessage2,
  IconUser,
  IconLogout,
  IconChevronRight,
  IconMenu2,
  IconX,
  IconStethoscope,
  IconBuildingHospital
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import UserProfileModal from './UserProfileModal';
import { Avatar, RoleBadge } from './ui';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 99,
            backdropFilter: 'blur(4px)'
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`layout-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          overflowY: 'auto',
          zIndex: 100,
          width: '240px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.3s ease'
        }}
      >
        <div>
          {/* Brand Header */}
          <div
            className="sidebar-brand"
            style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
              }}
            >
              <IconBuildingHospital size={20} />
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Clinical<span style={{ color: 'var(--accent-primary)' }}>KG</span>
            </span>
          </div>

          {/* Navigation List */}
          <nav className="sidebar-nav-list" style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {user?.role === 'admin' && (
              <>
                <NavLink to="/admin" end className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  <IconDashboard size={18} />
                  <span>Overview</span>
                </NavLink>
                <NavLink to="/admin/users" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  <IconUsers size={18} />
                  <span>Users</span>
                </NavLink>
                <NavLink to="/admin/assignments" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  <IconUserCheck size={18} />
                  <span>Assignments</span>
                </NavLink>
                <NavLink to="/admin/audit" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  <IconFileText size={18} />
                  <span>Audit Log</span>
                </NavLink>
                <NavLink to="/admin/evaluation" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  <IconActivity size={18} />
                  <span>Evaluation</span>
                </NavLink>
              </>
            )}

            {user?.role === 'doctor' && (
              <NavLink to="/doctor/patients" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <IconUsers size={18} />
                <span>Patients</span>
              </NavLink>
            )}

            {user?.role === 'patient' && (
              <>
                <NavLink to="/patient" end className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  <IconFileText size={18} />
                  <span>My Record</span>
                </NavLink>
                <NavLink to="/patient/timeline" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  <IconClock size={18} />
                  <span>Timeline</span>
                </NavLink>
                <NavLink to="/patient/query" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  <IconMessage2 size={18} />
                  <span>Ask a Question</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Sidebar Bottom Panel */}
        <div
          className="sidebar-bottom-panel"
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            background: 'rgba(0,0,0,0.15)'
          }}
        >
          <button
            type="button"
            className="sidebar-profile-btn"
            onClick={() => {
              setShowProfileModal(true);
              setMobileMenuOpen(false);
            }}
            title="View Profile & Account"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: 0,
              flexGrow: 1,
              textAlign: 'left'
            }}
          >
            <Avatar name={user?.full_name || user?.username} role={user?.role} size={34} />
            <div className="sidebar-user-text" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <div className="sidebar-user-name" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', truncate: 'true' }}>
                {user?.full_name || user?.username || 'User'}
              </div>
              <RoleBadge role={user?.role} />
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="sidebar-logout-btn"
            id="logout-btn"
            title="Logout"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconLogout size={18} />
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <main className="layout-main-area" style={{ marginLeft: '240px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header Bar */}
        <header
          className="app-top-header"
          style={{
            height: '60px',
            padding: '0 1.5rem',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 90
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'none', // Shown in CSS media queries
                padding: '0.25rem'
              }}
            >
              {mobileMenuOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
            </button>

            <nav className="breadcrumb-nav" aria-label="Breadcrumb navigation">
              <ol className="breadcrumb-list" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <li key={idx} className="breadcrumb-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      {idx > 0 && <IconChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
                      {crumb.to && !isLast ? (
                        <Link to={crumb.to} className="breadcrumb-link" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="breadcrumb-current" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          {/* User Account Controls */}
          <div className="header-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-header-profile"
              onClick={() => setShowProfileModal(true)}
              id="header-profile-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Avatar name={user?.full_name || user?.username} role={user?.role} size={22} />
              <span>{user?.username}</span>
              <RoleBadge role={user?.role} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="layout-content-wrapper" style={{ padding: '1.5rem', flexGrow: 1 }}>
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

