import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Search } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1>User Management</h1>
        <p>Create and manage system users</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} />
          <input
            className="input"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="user-search"
          />
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} id="create-user-btn">
          <UserPlus size={16} /> New User
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Patient ID</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${roleBadge(u.role)}`}>{u.role}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 'var(--font-xs)' }}>
                      {u.clinical_patient_id || '—'}
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchUsers(); }}
        />
      )}
    </div>
  );
}

function roleBadge(role) {
  if (role === 'admin') return 'badge-red';
  if (role === 'doctor') return 'badge-blue';
  return 'badge-purple';
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'doctor', clinical_patient_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/users', {
        ...form,
        clinical_patient_id: form.clinical_patient_id || null,
      });
      toast.success('User created successfully');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create New User</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Username</label>
            <input className="input" required value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} id="new-user-username" />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} id="new-user-email" />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input className="input" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} id="new-user-password" />
          </div>
          <div className="form-group">
            <label className="label">Role</label>
            <select className="select" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })} id="new-user-role">
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {form.role === 'patient' && (
            <div className="form-group">
              <label className="label">Clinical Patient ID</label>
              <input className="input" placeholder="e.g. P001" value={form.clinical_patient_id}
                onChange={(e) => setForm({ ...form, clinical_patient_id: e.target.value })} id="new-user-patient-id" />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting} id="submit-create-user">
              {submitting ? <div className="spinner" /> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
