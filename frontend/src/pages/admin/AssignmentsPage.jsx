import React, { useEffect, useState } from 'react';
import {
  IconUserCheck,
  IconUserPlus,
  IconTrash,
  IconCalendar,
  IconShield,
  IconAlertCircle,
  IconX
} from '@tabler/icons-react';
import api from '../../api';
import { PageHeader, DataTable, StatusBadge } from '../../components/ui';

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

  const columns = [
    {
      header: 'Assigned Clinician',
      key: 'doctor_username',
      render: (a) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          Dr. {a.doctor_username || `Doctor ${a.doctor_id}`}
        </span>
      )
    },
    {
      header: 'Patient Identifier',
      key: 'clinical_patient_id',
      render: (a) => (
        <span className="font-mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
          {a.clinical_patient_id}
        </span>
      )
    },
    {
      header: 'Assignment Status',
      key: 'status',
      render: (a) => <StatusBadge status={a.status || 'active'} />
    },
    {
      header: 'Clinical Reason',
      key: 'assignment_reason',
      render: (a) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {a.assignment_reason || 'Primary Care Assignment'}
        </span>
      )
    },
    {
      header: 'Assigned Date',
      key: 'assigned_at',
      render: (a) => (
        <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Active'}
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (a) => (
        <button
          type="button"
          onClick={() => handleDelete(a.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            color: '#f87171',
            cursor: 'pointer',
            fontSize: '0.82rem',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)'
          }}
          title="Revoke access"
        >
          <IconTrash size={14} /> Revoke
        </button>
      )
    }
  ];

  return (
    <div className="page-root">
      {/* Header */}
      <PageHeader
        title="Doctor-Patient Assignments"
        description="Admin-controlled RBAC access control assigning physicians to patient clinical records."
        badge={`${filteredAssignments.length} Assignments`}
      >
        <button
          type="button"
          onClick={() => setShowAssignModal(true)}
          className="btn-primary"
        >
          <IconUserPlus size={16} /> Assign Patient to Doctor
        </button>
      </PageHeader>

      {/* Filter Bar */}
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
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Filter by Doctor:</label>
          <select
            className="input-field"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
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

      {/* Assignments DataTable */}
      <DataTable
        columns={columns}
        data={filteredAssignments}
        loading={loading}
        emptyTitle="No doctor-patient assignments"
        emptyMessage="There are currently no active doctor-patient access assignments matching this view."
      />

      {/* Assign Patient Modal */}
      {showAssignModal && (
        <AssignModal
          doctors={doctors}
          patients={patients}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            setShowAssignModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function AssignModal({ doctors, patients, onClose, onAssigned }) {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || '');
  const [patientId, setPatientId] = useState(patients[0]?.patient_id || '');
  const [reason, setReason] = useState('Attending Physician Care');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!doctorId || !patientId) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/admin/assignments', {
        doctor_id: doctorId,
        clinical_patient_id: patientId,
        assignment_reason: reason.trim() || undefined,
      });
      onAssigned();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Assign Patient to Doctor</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <IconX size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-4px', marginBottom: '16px' }}>
          Grants an attending clinician access to the selected patient's longitudinal knowledge graph dossier.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Select Doctor *
            </label>
            <select
              className="input-field"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              required
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.username} ({d.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Patient Identifier *
            </label>
            {patients.length > 0 ? (
              <select
                className="input-field"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    Patient #{p.patient_id} {p.age ? `(Age ${p.age}, ${p.gender})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input-field"
                type="text"
                placeholder="e.g. 1 or PAT-000001"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              />
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Assignment Reason
            </label>
            <input
              className="input-field"
              type="text"
              placeholder="e.g. Inpatient Admission, Primary Consultation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              {submitting ? 'Assigning…' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
