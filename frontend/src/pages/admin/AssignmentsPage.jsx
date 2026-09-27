import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState('ALL');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignRes, usersRes] = await Promise.all([
        api.get('/admin/assignments').catch(() => ({ data: [] })),
        api.get('/admin/users').catch(() => ({ data: [] })),
      ]);
      setAssignments(assignRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Failed to load assignments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/assignments/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to remove assignment', err);
    }
  };

  const doctors = users.filter((u) => u.role === 'doctor');

  const filteredAssignments = selectedDoctorId === 'ALL'
    ? assignments
    : assignments.filter((a) => String(a.doctor_id) === String(selectedDoctorId));

  return (
    <div className="page-root">
      {/* Header */}
      <div className="page-header-row">
        <h1 className="page-title">Doctor assignments</h1>
        <button
          type="button"
          onClick={() => setShowAssignModal(true)}
          className="btn-secondary-action"
        >
          + Assign patient
        </button>
      </div>

      {/* Filter by Doctor */}
      <div className="admin-filters-bar">
        <div className="filter-select-group">
          <label className="filter-select-label">Doctor:</label>
          <select
            className="filter-select-dropdown"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
          >
            <option value="ALL">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name || d.username}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="section-divider" />

      {/* Assignments List */}
      {loading ? (
        <div className="skeleton-table">
          <div className="skeleton skeleton-row-left" />
          <div className="skeleton skeleton-row-left" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="empty-state-container">
          <p className="empty-state-text">No doctor-patient assignments recorded.</p>
        </div>
      ) : (
        <div className="compact-table-container">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Patient ID</th>
                <th>Assigned date</th>
                <th className="table-action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">{a.doctor_username || `Doctor ${a.doctor_id}`}</td>
                  <td className="font-mono">Patient {a.clinical_patient_id}</td>
                  <td className="text-muted font-mono">
                    {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : 'Active'}
                  </td>
                  <td className="table-action-col">
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      className="btn-text-danger"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignPatientModal
          doctors={doctors}
          defaultDoctorId={selectedDoctorId !== 'ALL' ? selectedDoctorId : ''}
          onClose={() => setShowAssignModal(false)}
          onCreated={() => {
            setShowAssignModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function AssignPatientModal({ doctors, defaultDoctorId, onClose, onCreated }) {
  const [doctorId, setDoctorId] = useState(defaultDoctorId || (doctors[0]?.id ? String(doctors[0].id) : ''));
  const [patientId, setPatientId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!doctorId || !patientId.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/admin/assignments', {
        doctor_id: parseInt(doctorId, 10) || doctorId,
        clinical_patient_id: patientId.trim(),
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">Assign patient to doctor</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-field-block">
            <label className="login-field-label">Doctor</label>
            <select
              className="filter-select-dropdown full-width"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              required
            >
              <option value="">Select a doctor...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name || d.username} ({d.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field-block">
            <label className="login-field-label">Clinical Patient ID</label>
            <input
              className="login-field-input"
              type="text"
              required
              placeholder="e.g. 42"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
          </div>

          {error && <div className="login-inline-error modal-error">{error}</div>}

          <div className="modal-actions-row">
            <button type="button" className="btn-secondary-action" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-action" disabled={submitting || !patientId.trim()}>
              {submitting ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
