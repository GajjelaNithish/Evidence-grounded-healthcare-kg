import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconSearch,
  IconX,
  IconUser,
  IconCalendar,
  IconAlertTriangle,
  IconChevronRight,
  IconHeartbeat,
  IconStethoscope
} from '@tabler/icons-react';
import api from '../../api';
import { PageHeader, Skeleton, EmptyState, StatusBadge } from '../../components/ui';

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

            const conditionEvent = timeline.find((e) => e && e.event_type === 'Condition Diagnosis');
            const admissionEvent = timeline.find((e) => e && e.event_type === 'Hospital Admission');

            const primaryCondition = conditionEvent?.title || p.primary_condition || 'Clinical record pending';
            const lastAdmissionDate = admissionEvent?.date || p.last_admission || 'No admission recorded';
            const isReadmitted = admissionEvent?.details?.includes('Readmission: Yes') || Boolean(p.readmission);

            return {
              ...p,
              age: analytics.age ?? 'N/A',
              gender: analytics.gender ?? 'N/A',
              state: analytics.state ?? 'N/A',
              conditionCount: analytics.condition_count ?? 0,
              treatmentCount: analytics.treatment_count ?? 0,
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
    const state = String(p.state || '').toLowerCase();
    return pid.includes(query) || condition.includes(query) || state.includes(query);
  });

  return (
    <div className="page-root">
      {/* Page Header */}
      <PageHeader
        title="Assigned Patients"
        description="Active patient records, longitudinal clinical timelines, and evidence-grounded medical dossiers."
        badge={!loading ? `${filtered.length} Patients` : null}
      >
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <IconSearch
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            id="patient-search-input"
            className="input-field"
            type="text"
            placeholder="Search by ID, condition, state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', paddingRight: search ? '32px' : '12px' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </PageHeader>

      {/* Patient Cards Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Skeleton width="48px" height="48px" borderRadius="50%" />
                <div style={{ flex: 1 }}>
                  <Skeleton width="60%" height="20px" style={{ marginBottom: '6px' }} />
                  <Skeleton width="40%" height="14px" />
                </div>
              </div>
              <Skeleton width="100%" height="32px" borderRadius="var(--radius-md)" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width="30%" height="16px" />
                <Skeleton width="30%" height="16px" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matching patients' : 'No patients assigned'}
          description={
            search
              ? `No patient records match the query "${search}". Try searching by a different term.`
              : 'You do not have any patient dossiers assigned to your account yet. Contact an administrator for assignment.'
          }
          icon={IconUser}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filtered.map((patient) => {
            const pid = patient.patient_id;

            return (
              <div
                key={pid}
                className="patient-card-saas"
                onClick={() => navigate(`/doctor/patients/${encodeURIComponent(pid)}`)}
                id={`patient-row-${pid}`}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.35rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(0, 0, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Header: Avatar, Name, PID pill & Navigation Arrow */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-primary)',
                        fontWeight: 700,
                        fontSize: '0.95rem'
                      }}
                    >
                      P{pid.toString().slice(-2)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        Patient #{pid}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {patient.age !== 'N/A' && <span>{patient.age} yrs</span>}
                        {patient.gender !== 'N/A' && <span>• {patient.gender}</span>}
                        {patient.state !== 'N/A' && <span>• {patient.state}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {patient.isReadmitted && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        <IconAlertTriangle size={12} /> Readmission
                      </span>
                    )}
                    <IconChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Primary Diagnosis Box */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                  }}
                >
                  <IconHeartbeat size={18} style={{ color: 'var(--accent-danger)', shrink: 0 }} />
                  <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Primary Condition
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {patient.primaryCondition}
                    </span>
                  </div>
                </div>

                {/* Footer Metrics */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <IconCalendar size={14} />
                    <span>Admitted: {patient.lastAdmissionDate}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <span>{patient.conditionCount || 0} Conds</span>
                    <span>•</span>
                    <span>{patient.treatmentCount || 0} Treatments</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
