import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import api from '../../api';

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/kg/patients');
      const basePatients = res.data || [];

      // Enrich patients with real clinical analytics & timeline
      const enriched = await Promise.all(
        basePatients.map(async (p) => {
          const pid = p.patient_id;
          try {
            const [analyticsRes, timelineRes] = await Promise.all([
              api.get(`/kg/analytics/${pid}`).catch(() => null),
              api.get(`/kg/timeline/${pid}`).catch(() => null),
            ]);
            const analytics = analyticsRes?.data || {};
            const timeline = timelineRes?.data || [];

            const conditionEvent = timeline.find((e) => e.event_type === 'Condition Diagnosis');
            const admissionEvent = timeline.find((e) => e.event_type === 'Hospital Admission');

            const primaryCondition = conditionEvent?.title || p.primary_condition || 'Condition record pending';
            const lastAdmissionDate = admissionEvent?.date || p.last_admission || 'No admission recorded';
            const isReadmitted = admissionEvent?.details?.includes('Readmission: Yes') || Boolean(p.readmission);

            return {
              ...p,
              age: analytics.age ?? 'N/A',
              gender: analytics.gender ?? 'N/A',
              state: analytics.state ?? 'N/A',
              primaryCondition,
              lastAdmissionDate,
              isReadmitted,
            };
          } catch {
            return p;
          }
        })
      );
      setPatients(enriched);
    } catch (err) {
      console.error('Failed to load patients', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = patients.filter((p) => {
    const query = search.toLowerCase();
    const pid = String(p.patient_id || '').toLowerCase();
    const condition = String(p.primaryCondition || '').toLowerCase();
    return pid.includes(query) || condition.includes(query);
  });

  return (
    <div className="page-root">
      {/* Heading row with right-aligned search */}
      <div className="page-header-row">
        <h1 className="page-title">Patients</h1>
        <div className="page-search-wrapper">
          <input
            id="patient-search-input"
            className="search-input"
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="divider-line" />

      {/* Patient rows */}
      {loading ? (
        <div className="patient-list-rows">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="patient-row-skeleton">
              <div className="skeleton skeleton-row-left" />
              <div className="skeleton skeleton-row-right" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state-container">
          <p className="empty-state-text">
            {search ? 'No matching patients found.' : 'No patients assigned to you yet. Contact your administrator.'}
          </p>
        </div>
      ) : (
        <div className="patient-list-rows">
          {filtered.map((patient) => {
            const pid = patient.patient_id;

            return (
              <div
                key={pid}
                className="patient-row-item"
                onClick={() => navigate(`/doctor/patients/${encodeURIComponent(pid)}`)}
                id={`patient-row-${pid}`}
              >
                <div className="patient-row-left">
                  <div style={{ fontSize: 'var(--font-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                    Patient {pid}
                  </div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {patient.age !== 'N/A' ? `${patient.age} · ${patient.gender} · ${patient.state}` : `PID: ${pid}`}
                  </div>
                </div>

                <div className="patient-row-right" style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--font-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--accent-primary)' }}>
                    {patient.primaryCondition}
                  </div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Admitted: {patient.lastAdmissionDate}
                  </div>
                  {patient.isReadmitted && (
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--accent-warning)', marginTop: '2px' }}>
                      ⚠ Readmitted
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
