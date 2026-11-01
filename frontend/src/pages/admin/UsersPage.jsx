import React, { useEffect, useState } from 'react';
import {
  IconUserPlus,
  IconUserCheck,
  IconShield,
  IconAlertCircle,
  IconPlus,
  IconUsers,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import api from '../../api';
import { PageHeader, DataTable, RoleBadge, StatusBadge } from '../../components/ui';

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

  const columns = [
    {
      header: 'Username',
      key: 'username',
      render: (u) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {u.username}
        </span>
      )
    },
    {
      header: 'Email Address',
      key: 'email',
      render: (u) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {u.email || '—'}
        </span>
      )
    },
    {
      header: 'System Role',
      key: 'role',
      render: (u) => <RoleBadge role={u.role} />
    },
    {
      header: 'Linked Patient ID',
      key: 'clinical_patient_id',
      render: (u) => (
        <span className="font-mono" style={{ color: u.clinical_patient_id ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
          {u.clinical_patient_id || '—'}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (u) => <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
    }
  ];

  return (
    <div className="page-root">
      {/* Header */}
      <PageHeader
        title="User & Patient Accounts"
        description="Admin-controlled authentication credentials, system roles, and clinical patient record linkages."
        badge={`${filtered.length} Users`}
      >
        <button
          type="button"
          onClick={() => setShowCreatePatientProfile(true)}
          className="btn-secondary"
        >
          <IconPlus size={16} /> Create Patient Record
        </button>
        <button
          type="button"
          onClick={() => setShowCreateUser(false || true)}
          className="btn-primary"
        >
          <IconUserPlus size={16} /> Create User Account
        </button>
      </PageHeader>

      {/* Filter Row */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
          padding: '0.75rem 1rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Role:</label>
          <select
            className="input-field"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="doctor">Doctors</option>
            <option value="patient">Patients</option>
            <option value="admin">Administrators</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status:</label>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyTitle="No users found"
        emptyMessage="No user accounts match the current filter criteria."
      />

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Create User Account</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <IconX size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-4px', marginBottom: '16px' }}>
          Provision credentials for Doctor, Patient, or Administrator roles.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Username *
            </label>
            <input
              className="input-field"
              type="text"
              required
              placeholder="e.g. dr_smith"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Email Address *
            </label>
            <input
              className="input-field"
              type="email"
              required
              placeholder="e.g. dr_smith@hospital.org"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Password *
            </label>
            <input
              className="input-field"
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Role *
            </label>
            <select
              className="input-field"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {form.role === 'patient' && (
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Linked Clinical Patient ID (e.g. 1 or PAT-000001)
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="Patient ID in Knowledge Graph"
                value={form.clinical_patient_id}
                onChange={(e) => setForm({ ...form, clinical_patient_id: e.target.value })}
              />
            </div>
          )}

          {error && (
            <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconAlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating User…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatePatientProfileModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    patient_id: '',
    age: '',
    gender: 'Male',
    state: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_id.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/admin/patients', {
        patient_id: form.patient_id.trim(),
        age: form.age ? parseInt(form.age, 10) : undefined,
        gender: form.gender || undefined,
        state: form.state.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create patient record in Knowledge Graph');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Create Patient Clinical Record</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <IconX size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-4px', marginBottom: '16px' }}>
          Adds a canonical Patient entity into the Neo4j Knowledge Graph.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Patient ID *
            </label>
            <input
              className="input-field"
              type="text"
              required
              placeholder="e.g. PAT-000004 or 4"
              value={form.patient_id}
              onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Age
              </label>
              <input
                className="input-field"
                type="number"
                placeholder="e.g. 52"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Gender
              </label>
              <select
                className="input-field"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              State / Region
            </label>
            <input
              className="input-field"
              type="text"
              placeholder="e.g. Maharashtra, Karnataka"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>

          {error && (
            <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconAlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating Patient…' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
