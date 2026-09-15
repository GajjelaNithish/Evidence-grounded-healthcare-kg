import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity, Users, UserCheck, FileText, ClipboardList,
  BarChart3, Search, Upload, Clock, HeartPulse,
  LogOut, Shield, Stethoscope, User
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleIcon = {
    admin: <Shield size={14} />,
    doctor: <Stethoscope size={14} />,
    patient: <User size={14} />,
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <Activity size={20} />
            </div>
            <div>
              <div className="brand-text">ClinicalKG</div>
              <div className="brand-sub">Knowledge Graph Portal</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {user?.role === 'admin' && <AdminNav />}
          {user?.role === 'doctor' && <DoctorNav />}
          {user?.role === 'patient' && <PatientNav />}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.full_name || user?.username}</div>
              <div className="user-role">
                {roleIcon[user?.role]} {user?.role}
              </div>
            </div>
            <button
              className="btn btn-icon btn-secondary"
              onClick={handleLogout}
              title="Sign Out"
              id="logout-btn"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function AdminNav() {
  return (
    <>
      <div className="nav-section">
        <div className="nav-section-title">Overview</div>
        <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BarChart3 size={18} /> Dashboard
        </NavLink>
      </div>
      <div className="nav-section">
        <div className="nav-section-title">Management</div>
        <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Users size={18} /> Users
        </NavLink>
        <NavLink to="/admin/assignments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <UserCheck size={18} /> Assignments
        </NavLink>
        <NavLink to="/admin/audit" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <ClipboardList size={18} /> Audit Logs
        </NavLink>
      </div>
    </>
  );
}

function DoctorNav() {
  return (
    <>
      <div className="nav-section">
        <div className="nav-section-title">Dashboard</div>
        <NavLink to="/doctor" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <HeartPulse size={18} /> My Patients
        </NavLink>
      </div>
      <div className="nav-section">
        <div className="nav-section-title">Patient Tools</div>
        <NavLink to="/doctor/query" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Search size={18} /> Clinical Q&A
        </NavLink>
        <NavLink to="/doctor/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Upload size={18} /> Upload Document
        </NavLink>
      </div>
    </>
  );
}

function PatientNav() {
  return (
    <>
      <div className="nav-section">
        <div className="nav-section-title">My Health</div>
        <NavLink to="/patient" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <HeartPulse size={18} /> Overview
        </NavLink>
        <NavLink to="/patient/timeline" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Clock size={18} /> Timeline
        </NavLink>
        <NavLink to="/patient/query" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Search size={18} /> Ask a Question
        </NavLink>
      </div>
    </>
  );
}
