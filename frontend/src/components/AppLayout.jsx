import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  return (
    <div className="layout-root">
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

        <div className="sidebar-bottom-panel">
          <div className="sidebar-user-label">{user?.full_name || user?.username || 'User'}</div>
          <button onClick={handleLogout} className="sidebar-logout-btn" id="logout-btn">
            Logout
          </button>
        </div>
      </aside>

      <main className="layout-main-area" style={{ marginLeft: '220px', height: '100vh', overflowY: 'auto' }}>
        <div className="layout-content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
