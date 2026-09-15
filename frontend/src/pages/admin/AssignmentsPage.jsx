import { useEffect, useState } from 'react';
import { UserCheck, Plus, Trash2 } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  const fetchData = async () => {
    try {
      const [assignRes, usersRes] = await Promise.all([
        api.get('/admin/assignments'),
        api.get('/admin/users'),
      ]);
      setAssignments(assignRes.data);
      setUsers(usersRes.data);
    } catch {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await api.delete(`/admin/assignments/${id}`);
      toast.success('Assignment removed');
      fetchData();
    } catch {
      toast.error('Failed to remove assignment');
    }
  };

  const doctors = users.filter((u) => u.role === 'doctor');

  return (
    <div>
      <div className="page-header">
        <h1>Doctor-Patient Assignments</h1>
        <p>Manage which doctors can access which patients</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-lg)' }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} id="create-assignment-btn">
          <Plus size={16} /> New Assignment
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
                <th>Doctor</th>
                <th>Patient ID</th>
                <th>Assigned At</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No assignments yet
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.doctor_username}</td>
                    <td>
                      <span className="badge badge-purple">{a.clinical_patient_id}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>
                      {new Date(a.assigned_at).toLocaleString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(a.id)}
                        title="Remove assignment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateAssignmentModal
          doctors={doctors}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchData(); }}
        />
      )}
    </div>
  );
}

function CreateAssignmentModal({ doctors, onClose, onCreated }) {
  const [doctorId, setDoctorId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/assignments', {
        doctor_id: doctorId,
        clinical_patient_id: patientId,
      });
      toast.success('Assignment created');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Assignment</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Doctor</label>
            <select className="select" value={doctorId} required
              onChange={(e) => setDoctorId(e.target.value)} id="assign-doctor">
              <option value="">Select a doctor...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.username} ({d.email})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Clinical Patient ID</label>
            <input className="input" required placeholder="e.g. P001"
              value={patientId} onChange={(e) => setPatientId(e.target.value)} id="assign-patient-id" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting} id="submit-assignment">
              {submitting ? <div className="spinner" /> : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
