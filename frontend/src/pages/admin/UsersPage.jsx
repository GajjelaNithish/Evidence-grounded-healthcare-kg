import React, { useEffect, useState } from 'react';
import { UserPlus, UserCheck, Shield, AlertCircle, PlusCircle } from 'lucide-react';
import api from '../../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreatePatientProfile, setShowCreatePatientProfile] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active) return false;
    return true;
  });

  return (
    <div className="page-root">
      {/* Header Row */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">User Account & Profile Management</h1>
          <p className="page-subtitle">Admin-controlled user accounts and patient clinical record creation</p>
        </div>
        <div className="flex-align-gap">
          <button
            type="button"
            onClick={() => setShowCreatePatientProfile(true)}
            className="btn-secondary-action flex-align-gap"
          >
            <PlusCircle size={16} /> Create Patient Profile
          </button>
          <button
            type="button"
            onClick={() => setShowCreateUser(true)}
            className="btn-primary-action flex-align-gap"
          >
            <UserPlus size={16} /> Create User Account
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="admin-filters-bar">
        <div className="filter-select-group">
          <label className="filter-select-label">Filter by Role:</label>
          <select
            className="filter-select-dropdown"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="doctor">Doctors</option>
            <option value="patient">Patients</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label className="filter-select-label">Status:</label>
          <select
            className="filter-select-dropdown"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      <div className="section-divider" />

      {/* Users Table */}
      {loading ? (
        <div className="skeleton-table">
          <div className="skeleton skeleton-row-left" />
          <div className="skeleton skeleton-row-left" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state-container">
          <p className="empty-state-text">No user accounts found matching current filters.</p>
        </div>
      ) : (
        <div className="compact-table-container">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Clinical Patient ID</th>
                <th>Account Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.username}</td>
                  <td className="text-secondary">{u.email}</td>
                  <td>
                    <span className={`role-text-label role-${u.role}`}>{u.role.toUpperCase()}</span>
                  </td>
                  <td className="font-mono text-muted">{u.clinical_patient_id || '—'}</td>
                  <td>
                    <span className={u.is_active ? 'status-active-text' : 'status-inactive-text'}>
                      {u.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Account Modal */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreated={() => {
            setShowCreateUser(false);
            fetchUsers();
          }}
        />
      )}

      {/* Create Patient Profile Modal */}
      {showCreatePatientProfile && (
        <CreatePatientProfileModal
          onClose={() => setShowCreatePatientProfile(false)}
          onCreated={() => {
            setShowCreatePatientProfile(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'doctor',
    clinical_patient_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/admin/users', {
        ...form,
        clinical_patient_id: form.clinical_patient_id || null,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">Create User Account</h3>
        <p className="page-subtitle" style={{ marginTop: '-8px', marginBottom: '16px' }}>
          Create credentials for Doctor, Patient, or Admin role
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-field-block">
            <label className="login-field-label">Username</label>
            <input
              className="login-field-input"
              type="text"
              required
              placeholder="e.g. dr_smith"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div className="form-field-block">
            <label className="login-field-label">Email Address</label>
            <input
              className="login-field-input"
              type="email"
              required
              placeholder="e.g. dr_smith@hospital.org"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-field-block">
            <label className="login-field-label">Password</label>
            <input
              className="login-field-input"
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="form-field-block">
            <label className="login-field-label">Role</label>
            <select
              className="filter-select-dropdown full-width"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {form.role === 'patient' && (
            <div className="form-field-block">
              <label className="login-field-label">Clinical Patient ID (Optional Link)</label>
              <input
                className="login-field-input"
                type="text"
                placeholder="e.g. PAT-000001"
                value={form.clinical_patient_id}
                onChange={(e) => setForm({ ...form, clinical_patient_id: e.target.value })}
              />
            </div>
          )}

          {error && (
            <div className="login-inline-error modal-error flex-align-gap">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="modal-actions-row">
            <button type="button" className="btn-secondary-action" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-action" disabled={submitting}>
              {submitting ? 'Creating User…' : 'Create User Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatePatientProfileModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    create_user_account: true,
    username: '',
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/admin/patients', {
        name: form.name.trim(),
        age: form.age ? parseInt(form.age, 10) : undefined,
        gender: form.gender,
        create_user_account: form.create_user_account,
        username: form.create_user_account ? form.username.trim() : undefined,
        email: form.create_user_account ? form.email.trim() : undefined,
        password: form.create_user_account ? form.password : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create patient profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">Create Patient Record & Profile</h3>
        <p className="page-subtitle" style={{ marginTop: '-8px', marginBottom: '16px' }}>
          Generates a unique deterministic Patient ID (PAT-XXXXXX) and optional login account
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-field-block">
            <label className="login-field-label">Patient Full Name</label>
            <input
              className="login-field-input"
              type="text"
              required
              placeholder="e.g. Eleanor Vance"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-field-block">
              <label className="login-field-label">Age</label>
              <input
                className="login-field-input"
                type="number"
                placeholder="e.g. 52"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>

            <div className="form-field-block">
              <label className="login-field-label">Gender</label>
              <select
                className="filter-select-dropdown full-width"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-field-block" style={{ marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-sm)' }}>
              <input
                type="checkbox"
                checked={form.create_user_account}
                onChange={(e) => setForm({ ...form, create_user_account: e.target.checked })}
              />
              Create Patient Portal User Account Credentials
            </label>
          </div>

          {form.create_user_account && (
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', margin: '12px 0' }}>
              <div className="form-field-block">
                <label className="login-field-label">Patient Username</label>
                <input
                  className="login-field-input"
                  type="text"
                  required={form.create_user_account}
                  placeholder="e.g. eleanor_vance"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>

              <div className="form-field-block">
                <label className="login-field-label">Patient Email</label>
                <input
                  className="login-field-input"
                  type="email"
                  required={form.create_user_account}
                  placeholder="e.g. eleanor@example.org"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-field-block">
                <label className="login-field-label">Password</label>
                <input
                  className="login-field-input"
                  type="password"
                  required={form.create_user_account}
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="login-inline-error modal-error flex-align-gap">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="modal-actions-row">
            <button type="button" className="btn-secondary-action" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-action" disabled={submitting || !form.name.trim()}>
              {submitting ? 'Generating Record…' : 'Create Patient Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
