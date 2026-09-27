import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
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
        <h1 className="page-title">Users</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="btn-secondary-action"
        >
          Create user
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters-bar">
        <div className="filter-select-group">
          <label className="filter-select-label">Role:</label>
          <select
            className="filter-select-dropdown"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="doctor">Doctor</option>
            <option value="patient">Patient</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label className="filter-select-label">Status:</label>
          <select
            className="filter-select-dropdown"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="section-divider" />

      {/* Users Table */}
      {loading ? (
        <div className="skeleton-table">
          <div className="skeleton skeleton-row-left" />
          <div className="skeleton skeleton-row-left" />
          <div className="skeleton skeleton-row-left" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state-container">
          <p className="empty-state-text">No users found matching filter criteria.</p>
        </div>
      ) : (
        <div className="compact-table-container">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Patient ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.username}</td>
                  <td className="text-secondary">{u.email}</td>
                  <td>
                    <span className={`role-text-label role-${u.role}`}>{u.role}</span>
                  </td>
                  <td className="font-mono text-muted">{u.clinical_patient_id || '—'}</td>
                  <td>
                    <span className={u.is_active ? 'status-active-text' : 'status-inactive-text'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
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
      setError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">Create user</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-field-block">
            <label className="login-field-label">Username</label>
            <input
              className="login-field-input"
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div className="form-field-block">
            <label className="login-field-label">Email</label>
            <input
              className="login-field-input"
              type="email"
              required
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
              <option value="admin">Admin</option>
            </select>
          </div>

          {form.role === 'patient' && (
            <div className="form-field-block">
              <label className="login-field-label">Clinical Patient ID</label>
              <input
                className="login-field-input"
                type="text"
                placeholder="e.g. 42"
                value={form.clinical_patient_id}
                onChange={(e) => setForm({ ...form, clinical_patient_id: e.target.value })}
              />
            </div>
          )}

          {error && <div className="login-inline-error modal-error">{error}</div>}

          <div className="modal-actions-row">
            <button type="button" className="btn-secondary-action" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-action" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
