import React from 'react';
import {
  IconPlus,
  IconCalendar,
  IconHeartbeat,
  IconPill,
  IconActivity,
  IconChevronRight,
  IconFileText,
  IconStethoscope
} from '@tabler/icons-react';
import { StatCard, EmptyState } from '../../../components/ui';

export default function Overview({ patientId, summary, timeline = [], documents = [], onNavigateTab, onOpenAddEncounter }) {
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const safeDocuments = Array.isArray(documents) ? documents : [];

  // Extract encounters and events sorted chronologically
  const encounters = safeTimeline.filter((e) => e && (e.event_type === 'Clinical Encounter' || e.event_type === 'Hospital Admission'));
  
  const latestEncounter = encounters.length > 0 ? encounters[0] : null;
  const previousEncounters = encounters.length > 1 ? encounters.slice(1, 4) : [];
  const olderEncounters = encounters.length > 4 ? encounters.slice(4) : [];

  const primaryCondition = safeTimeline.find((e) => e && e.event_type === 'Condition Diagnosis');

  return (
    <div className="overview-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Header Action Row: Current Clinical State */}
      <section className="overview-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Current Health State
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Primary active diagnosis and longitudinal summary metrics
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={onOpenAddEncounter}
          >
            <IconPlus size={16} /> Record Clinical Visit
          </button>
        </div>

        {/* State Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', minWidth: '280px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--accent-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                shrink: 0
              }}
            >
              <IconHeartbeat size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                Primary Diagnosis
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 4px 0' }}>
                {primaryCondition?.title || (summary?.condition_count > 0 ? 'Active Condition on Record' : 'No active conditions recorded')}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                {latestEncounter ? `Latest encounter recorded on ${latestEncounter.date}` : 'No recent encounters recorded'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1.25rem',
                textAlign: 'center',
                minWidth: '100px'
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Visits
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '2px', display: 'block' }}>
                {encounters.length || summary?.admission_count || 0}
              </span>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1.25rem',
                textAlign: 'center',
                minWidth: '100px'
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Conditions
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-danger)', marginTop: '2px', display: 'block' }}>
                {summary?.condition_count ?? 0}
              </span>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1.25rem',
                textAlign: 'center',
                minWidth: '100px'
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Treatments
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-success)', marginTop: '2px', display: 'block' }}>
                {summary?.treatment_count ?? 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Clinical History: Categorized Longitudinal Encounters */}
      <section className="overview-section">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Longitudinal Clinical History
        </h2>

        {encounters.length === 0 ? (
          <EmptyState
            title="No clinical visits recorded"
            description="No doctor encounters or hospital admissions have been recorded for this patient yet."
            icon={IconActivity}
            action={
              <button type="button" className="btn-primary" onClick={onOpenAddEncounter}>
                <IconPlus size={16} /> Record First Visit
              </button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* A. Latest Encounter */}
            {latestEncounter && (
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--accent-primary)',
                    display: 'block',
                    marginBottom: '6px'
                  }}
                >
                  Most Recent Clinical Encounter
                </span>

                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem 1.5rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      <IconCalendar size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span>{latestEncounter.date}</span>
                    </div>
                    {latestEncounter.status && (
                      <span
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 500
                        }}
                      >
                        {latestEncounter.status}
                      </span>
                    )}
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                    {latestEncounter.title || 'Clinical Encounter'}
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {latestEncounter.details}
                  </p>
                </div>
              </div>
            )}

            {/* B. Previous Encounters Grid */}
            {previousEncounters.length > 0 && (
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '8px'
                  }}
                >
                  Prior Encounters
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {previousEncounters.map((enc, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem 1.25rem'
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconCalendar size={13} /> {enc.date}
                      </div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                        {enc.title || enc.details}
                      </h4>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Record Summary Overview */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem'
        }}
      >
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
          Record Provenance & Summary
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Patient ID</span>
            <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-primary)', marginTop: '2px', display: 'block' }}>
              {patientId}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Clinical Documents</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
              {safeDocuments.length} files on record
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Total Length of Stay</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
              {summary?.total_length_of_stay_days || 0} days
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Demographic Region</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
              {summary?.state || 'N/A'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
