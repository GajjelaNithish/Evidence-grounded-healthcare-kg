import React from 'react';
import { User, Shield, Stethoscope, FileText, X, LogOut, CheckCircle2, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserProfileModal({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen || !user) return null;

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  const getRoleIcon = () => {
    if (user.role === 'admin') return <Shield size={18} className="role-icon admin" />;
    if (user.role === 'doctor') return <Stethoscope size={18} className="role-icon doctor" />;
    return <FileText size={18} className="role-icon patient" />;
  };

  const patientData = user.patient_profile_data;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="modal-container profile-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-title-block flex-align-gap">
            <User size={20} className="text-accent" />
            <h2 id="profile-modal-title" className="modal-title">User Account & Profile</h2>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body profile-modal-body">
          {/* Main User Info Header */}
          <div className="profile-badge-header">
            <div className="profile-avatar-large">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="profile-header-meta">
              <h3 className="profile-user-name">{user.full_name || user.username}</h3>
              <div className="profile-tags-row flex-align-gap">
                <span className={`role-badge role-${user.role}`}>
                  {getRoleIcon()}
                  {user.role.toUpperCase()}
                </span>
                <span className="status-badge active flex-align-gap">
                  <CheckCircle2 size={12} /> Active
                </span>
              </div>
            </div>
          </div>

          <div className="divider-line" style={{ margin: '16px 0' }} />

          {/* User Account Credentials Block */}
          <div className="profile-detail-section">
            <h4 className="profile-section-heading">Account Information</h4>
            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span className="detail-label">Username</span>
                <span className="detail-value">{user.username}</span>
              </div>
              <div className="profile-detail-item">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">{user.email || 'N/A'}</span>
              </div>
              <div className="profile-detail-item">
                <span className="detail-label">User ID</span>
                <span className="detail-value text-muted font-mono">{user.id ? String(user.id).slice(0, 18) + '...' : 'N/A'}</span>
              </div>
              <div className="profile-detail-item">
                <span className="detail-label">System Role</span>
                <span className="detail-value capitalize">{user.role}</span>
              </div>
            </div>
          </div>

          {/* Role-Specific Information */}
          <div className="profile-detail-section" style={{ marginTop: '16px' }}>
            <h4 className="profile-section-heading">Role Permissions & Clinical Scope</h4>

            {user.role === 'admin' && (
              <div className="role-scope-box admin-scope">
                <p className="scope-desc">
                  <strong>System Administrator:</strong> Full platform access including user creation, doctor-patient assignments, audit logging, system metrics, and evaluation tools.
                </p>
              </div>
            )}

            {user.role === 'doctor' && (
              <div className="role-scope-box doctor-scope">
                <p className="scope-desc">
                  <strong>Attending Clinician:</strong> Access restricted to assigned patient dossiers, longitudinal timelines, clinical note uploads, and temporal Q&A evidence retrieval.
                </p>
              </div>
            )}

            {user.role === 'patient' && (
              <div className="role-scope-box patient-scope">
                <div className="profile-details-grid">
                  <div className="profile-detail-item">
                    <span className="detail-label">Linked Patient ID</span>
                    <span className="detail-value font-mono text-accent">{user.clinical_patient_id || patientData?.patient_id || 'PAT-000001'}</span>
                  </div>
                  {patientData?.name && (
                    <div className="profile-detail-item">
                      <span className="detail-label">Clinical Name</span>
                      <span className="detail-value">{patientData.name}</span>
                    </div>
                  )}
                  {patientData?.age && (
                    <div className="profile-detail-item">
                      <span className="detail-label">Age</span>
                      <span className="detail-value">{patientData.age} years</span>
                    </div>
                  )}
                  {patientData?.gender && (
                    <div className="profile-detail-item">
                      <span className="detail-label">Gender</span>
                      <span className="detail-value">{patientData.gender}</span>
                    </div>
                  )}
                  {patientData?.address && (
                    <div className="profile-detail-item">
                      <span className="detail-label">Location</span>
                      <span className="detail-value">{patientData.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer profile-modal-footer">
          <button
            type="button"
            className="btn-danger-outline flex-align-gap"
            onClick={handleLogout}
            id="profile-logout-btn"
          >
            <LogOut size={16} /> Logout
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
