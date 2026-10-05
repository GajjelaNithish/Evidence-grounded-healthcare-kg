import React from 'react';
import { PlusCircle, Calendar, Stethoscope, Pill, Activity, ChevronRight, FileText } from 'lucide-react';

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
    <div className="overview-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl, 32px)' }}>
      {/* 1. Header Action Row: Current Clinical State + Add Visit */}
      <section className="overview-section">
        <div className="section-header-row">
          <h2 className="section-title">Current Clinical State</h2>
          <button
            type="button"
            className="btn-primary-action flex-align-gap"
            onClick={onOpenAddEncounter}
          >
            <PlusCircle size={16} /> Add Clinical Visit
          </button>
        </div>
        <div className="section-divider" />

        <div className="clinical-state-card">
          <div className="state-card-left">
            <h3 className="state-condition-name">
              {primaryCondition?.title || (summary?.condition_count > 0 ? 'Active Condition on Record' : 'No active condition recorded')}
            </h3>
            <p className="state-condition-sub">
              {latestEncounter ? `Latest encounter recorded on ${latestEncounter.date}` : 'No recent encounters recorded'}
            </p>
          </div>

          <div className="state-card-stats">
            <div className="state-stat-box">
              <span className="stat-label">Total Visits</span>
              <span className="stat-value">{encounters.length || summary?.admission_count || 0}</span>
            </div>
            <div className="state-stat-box">
              <span className="stat-label">Conditions</span>
              <span className="stat-value">{summary?.condition_count ?? 0}</span>
            </div>
            <div className="state-stat-box">
              <span className="stat-label">Treatments</span>
              <span className="stat-value">{summary?.treatment_count ?? 0}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Clinical History: Categorized Longitudinal Encounters */}
      <section className="overview-section">
        <h2 className="section-title">Longitudinal Clinical History</h2>
        <div className="section-divider" />

        {encounters.length === 0 ? (
          <div className="empty-state-card">
            <Activity size={24} className="empty-icon" />
            <p className="empty-state-text">No clinical visits recorded yet for this patient.</p>
            <button type="button" className="btn-secondary-action flex-align-gap" onClick={onOpenAddEncounter}>
              <PlusCircle size={14} /> Record First Visit
            </button>
          </div>
        ) : (
          <div className="clinical-history-block">
            {/* A. Latest Encounter */}
            {latestEncounter && (
              <div className="encounter-group">
                <span className="encounter-group-badge badge-latest">LATEST ENCOUNTER</span>
                <div className="encounter-card card-latest">
                  <div className="encounter-card-header">
                    <div className="encounter-date flex-align-gap">
                      <Calendar size={15} /> <strong>{latestEncounter.date}</strong>
                    </div>
                    {latestEncounter.status && (
                      <span className="qa-meta-pill pill-routing-hybrid">{latestEncounter.status}</span>
                    )}
                  </div>
                  <div className="encounter-card-body">
                    <h4 className="encounter-title">{latestEncounter.title || 'Clinical Encounter'}</h4>
                    <p className="encounter-details">{latestEncounter.details}</p>
                  </div>
                </div>
              </div>
            )}

            {/* B. Previous Encounters */}
            {previousEncounters.length > 0 && (
              <div className="encounter-group" style={{ marginTop: '20px' }}>
                <span className="encounter-group-badge badge-previous">PREVIOUS ENCOUNTERS</span>
                <div className="previous-encounters-grid">
                  {previousEncounters.map((enc, idx) => (
                    <div key={idx} className="encounter-card card-previous">
                      <div className="encounter-card-header">
                        <span className="encounter-date">{enc.date}</span>
                      </div>
                      <h4 className="encounter-title-sm">{enc.title || enc.details}</h4>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* C. Older Encounters */}
            {olderEncounters.length > 0 && (
              <div className="encounter-group" style={{ marginTop: '20px' }}>
                <span className="encounter-group-badge badge-older">OLDER HISTORICAL ENCOUNTERS ({olderEncounters.length})</span>
                <div className="older-encounters-list">
                  {olderEncounters.map((enc, idx) => (
                    <div key={idx} className="older-encounter-row">
                      <span className="font-mono text-muted">{enc.date}</span>
                      <span>{enc.title || enc.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Record Summary Overview */}
      <section className="overview-section">
        <h2 className="section-title">Record Summary</h2>
        <div className="section-divider" />

        <dl className="summary-definition-list">
          <div className="summary-def-row">
            <dt className="summary-def-label">Patient ID</dt>
            <dd className="summary-def-value font-mono">{patientId}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Documents on File</dt>
            <dd className="summary-def-value">{documents?.length ?? 0}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Total Treatment Cost</dt>
            <dd className="summary-def-value">₹{(summary?.total_treatment_cost_inr || 0).toLocaleString()}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Region / State</dt>
            <dd className="summary-def-value">{summary?.state || 'N/A'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
