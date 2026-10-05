import React, { useEffect, useState } from 'react';
import { UserCheck, UserPlus, Trash2, Calendar, Shield, AlertCircle } from 'lucide-react';
import api from '../../api';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState('ALL');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignRes, usersRes, patientsRes] = await Promise.all([
        api.get('/admin/assignments').catch(() => ({ data: [] })),
        api.get('/admin/users').catch(() => ({ data: [] })),
        api.get('/admin/patients').catch(() => ({ data: [] })),
      ]);
      setAssignments(assignRes.data || []);
      setUsers(usersRes.data || []);
      setPatients(patientsRes.data || []);
    } catch (err) {
      console.error('Failed to load assignment data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this doctor-patient assignment?')) return;
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
        <div>
          <h1 className="page-title">Doctor-Patient Assignments</h1>
          <p className="page-subtitle">Admin-controlled RBAC assignment workflow for patient data access</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAssignModal(true)}
          className="btn-primary-action flex-align-gap"
        >
          <UserPlus size={16} /> Assign Patient
        </button>
      </div>

      {/* Filter Bar */}
      <div className="admin-filters-bar">
        <div className="filter-select-group">
          <label className="filter-select-label">Filter by Doctor:</label>
          <select
            className="filter-select-dropdown"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
          >
            <option value="ALL">All Doctors ({doctors.length})</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.username} ({d.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="section-divider" />

      {/* Assignments Table */}
      {loading ? (
        <div className="skeleton-table">
          <div className="skeleton skeleton-row-left" />
          <div className="skeleton skeleton-row-left" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="empty-state-container">
          <UserCheck size={32} className="text-muted" style={{ marginBottom: '8px' }} />
          <p className="empty-state-text">No active doctor-patient assignments found.</p>
        </div>
      ) : (
        <div className="compact-table-container">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Patient ID</th>
                <th>Status</th>
                <th>Assignment Reason</th>
                <th>Assigned Date</th>
                <th className="table-action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">Dr. {a.doctor_username || `Doctor ${a.doctor_id}`}</td>
                  <td>
                    <span className="font-mono text-primary font-weight-bold">{a.clinical_patient_id}</span>
                  </td>
                  <td>
                    <span className={`qa-meta-pill ${a.status === 'active' ? 'status-active-text' : 'status-inactive-text'}`}>
                      {a.status || 'active'}
                    </span>
                  </td>
                  <td className="text-secondary">{a.assignment_reason || 'Primary Care Assignment'}</td>
                  <td className="text-muted font-mono">
                    {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Active'}
                  </td>
                  <td className="table-action-col">
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      className="btn-text-danger flex-align-gap"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Patient Modal */}
      {showAssignModal && (
        <AssignPatientModal
          doctors={doctors}
          patients={patients}
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

function AssignPatientModal({ doctors, patients, defaultDoctorId, onClose, onCreated }) {
  const [doctorId, setDoctorId] = useState(defaultDoctorId || (doctors[0]?.id ? String(doctors[0].id) : ''));
  const [patientId, setPatientId] = useState(patients[0]?.patient_id || '');
  const [status, setStatus] = useState('active');
  const [reason, setReason] = useState('Primary Care Assignment');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!doctorId || !patientId.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/admin/assignments', {
        doctor_id: doctorId,
        clinical_patient_id: patientId.trim(),
        status,
        assignment_reason: reason.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create doctor-patient assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">Assign Patient to Doctor</h3>
        <p className="page-subtitle" style={{ marginTop: '-8px', marginBottom: '16px' }}>
          Grant RBAC authorization for a doctor to access a specific patient's records
        </p>

        <form onSubmit={handleSubmit}>
          {/* Doctor Select */}
          <div className="form-field-block">
            <label className="login-field-label">1. Select Doctor</label>
            <select
              className="filter-select-dropdown full-width"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              required
            >
              <option value="">Choose a doctor...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.username} ({d.email})
                </option>
              ))}
            </select>
          </div>

          {/* Patient Select or Input */}
          <div className="form-field-block">
            <label className="login-field-label">2. Select Patient</label>
            {patients.length > 0 ? (
              <select
                className="filter-select-dropdown full-width"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                <option value="">Choose a patient...</option>
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.patient_id} — {p.name || `Patient #${p.patient_id}`} ({p.gender || 'N/A'}, Age {p.age || 'N/A'})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="login-field-input"
                type="text"
                required
                placeholder="e.g. PAT-000001"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              />
            )}
          </div>

          {/* Status */}
          <div className="form-field-block">
            <label className="login-field-label">3. Assignment Status</label>
            <select
              className="filter-select-dropdown full-width"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active Access Granted</option>
              <option value="inactive">Inactive / Suspended</option>
            </select>
          </div>

          {/* Reason */}
          <div className="form-field-block">
            <label className="login-field-label">4. Clinical Assignment Reason (Optional)</label>
            <input
              className="login-field-input"
              type="text"
              placeholder="e.g. Primary Care, Specialist Consultation, Inpatient Ward"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && (
            <div className="login-inline-error modal-error flex-align-gap">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="modal-actions-row">
            <button type="button" className="btn-secondary-action" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-action" disabled={submitting || !doctorId || !patientId.trim()}>
              {submitting ? 'Storing Assignment…' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
