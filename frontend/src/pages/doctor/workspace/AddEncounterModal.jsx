import React, { useState } from 'react';
import { Calendar, Stethoscope, Pill, FileText, AlertCircle, PlusCircle } from 'lucide-react';
import api from '../../../api';

export default function AddEncounterModal({ patientId, onClose, onEncounterCreated }) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    patient_id: patientId,
    visit_date: todayStr,
    reason_for_visit: '',
    condition: '',
    diagnosis: '',
    treatment: '',
    medication: '',
    clinical_notes: '',
    admission_date: '',
    discharge_date: '',
    outcome: 'Discharged / Improved',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.visit_date) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/encounters', {
        ...form,
        reason_for_visit: form.reason_for_visit.trim() || undefined,
        condition: form.condition.trim() || undefined,
        diagnosis: form.diagnosis.trim() || undefined,
        treatment: form.treatment.trim() || undefined,
        medication: form.medication.trim() || undefined,
        clinical_notes: form.clinical_notes.trim() || undefined,
        admission_date: form.admission_date || undefined,
        discharge_date: form.discharge_date || undefined,
        outcome: form.outcome.trim() || undefined,
      });

      if (onEncounterCreated) onEncounterCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record clinical encounter.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-large">
        <div className="modal-header-row">
          <h3 className="modal-title flex-align-gap">
            <PlusCircle size={20} className="text-primary" /> Add Clinical Visit
          </h3>
          <span className="qa-subtitle-badge">Patient {patientId}</span>
        </div>
        <p className="page-subtitle" style={{ marginTop: '-8px', marginBottom: '16px' }}>
          Record a new temporal clinical encounter to append to the patient's longitudinal record.
        </p>

        <form onSubmit={handleSubmit} className="modal-form-grid">
          {/* Visit Date & Reason */}
          <div className="form-row-two-col">
            <div className="form-field-block">
              <label className="login-field-label">Visit Date *</label>
              <input
                className="login-field-input"
                type="date"
                required
                value={form.visit_date}
                onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
              />
            </div>

            <div className="form-field-block">
              <label className="login-field-label">Reason for Visit</label>
              <input
                className="login-field-input"
                type="text"
                placeholder="e.g. Routine Follow-up, Acute Chest Pain, Shortness of Breath"
                value={form.reason_for_visit}
                onChange={(e) => setForm({ ...form, reason_for_visit: e.target.value })}
              />
            </div>
          </div>

          {/* Condition & Diagnosis */}
          <div className="form-row-two-col">
            <div className="form-field-block">
              <label className="login-field-label">Condition</label>
              <input
                className="login-field-input"
                type="text"
                placeholder="e.g. Hypertension, Type 2 Diabetes"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              />
            </div>

            <div className="form-field-block">
              <label className="login-field-label">Diagnosis</label>
              <input
                className="login-field-input"
                type="text"
                placeholder="e.g. Essential Hypertension (I10)"
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              />
            </div>
          </div>

          {/* Treatment & Medication */}
          <div className="form-row-two-col">
            <div className="form-field-block">
              <label className="login-field-label">Treatment Procedure</label>
              <input
                className="login-field-input"
                type="text"
                placeholder="e.g. Antihypertensive Therapy, X-Ray Examination"
                value={form.treatment}
                onChange={(e) => setForm({ ...form, treatment: e.target.value })}
              />
            </div>

            <div className="form-field-block">
              <label className="login-field-label">Prescribed Medication</label>
              <input
                className="login-field-input"
                type="text"
                placeholder="e.g. Lisinopril 10mg Daily, Metformin 500mg"
                value={form.medication}
                onChange={(e) => setForm({ ...form, medication: e.target.value })}
              />
            </div>
          </div>

          {/* Optional Admission Dates & Outcome */}
          <div className="form-row-three-col">
            <div className="form-field-block">
              <label className="login-field-label">Admission Date (Optional)</label>
              <input
                className="login-field-input"
                type="date"
                value={form.admission_date}
                onChange={(e) => setForm({ ...form, admission_date: e.target.value })}
              />
            </div>

            <div className="form-field-block">
              <label className="login-field-label">Discharge Date (Optional)</label>
              <input
                className="login-field-input"
                type="date"
                value={form.discharge_date}
                onChange={(e) => setForm({ ...form, discharge_date: e.target.value })}
              />
            </div>

            <div className="form-field-block">
              <label className="login-field-label">Outcome</label>
              <input
                className="login-field-input"
                type="text"
                placeholder="e.g. Discharged / Improved"
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
              />
            </div>
          </div>

          {/* Clinical Notes */}
          <div className="form-field-block">
            <label className="login-field-label">Clinical Progress Notes</label>
            <textarea
              className="qa-textarea"
              rows={3}
              placeholder="Enter clinical observations, vitals, exam findings..."
              value={form.clinical_notes}
              onChange={(e) => setForm({ ...form, clinical_notes: e.target.value })}
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
            <button type="submit" className="btn-primary-action" disabled={submitting || !form.visit_date}>
              {submitting ? 'Recording Encounter…' : 'Save Clinical Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
