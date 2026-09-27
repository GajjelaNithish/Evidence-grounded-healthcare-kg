import React from 'react';

export default function Overview({ summary, timeline, documents }) {
  const lastAdmission = timeline.find((e) => e.event_type === 'Hospital Admission');
  const primaryCondition = timeline.find((e) => e.event_type === 'Condition Diagnosis');
  const primaryTreatment = timeline.find((e) => e.event_type === 'Treatment Course');
  const recentEvents = timeline.slice(0, 4);

  const isReadmitted = lastAdmission?.details?.toLowerCase().includes('readmission: yes') ||
                       lastAdmission?.status?.toLowerCase().includes('readmitted');

  const outcome = lastAdmission?.title?.includes('(')
    ? lastAdmission.title.substring(lastAdmission.title.indexOf('(') + 1, lastAdmission.title.indexOf(')'))
    : lastAdmission?.status || 'Discharged';

  return (
    <div className="overview-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl, 32px)' }}>
      {/* 1. Current Clinical State */}
      <section className="overview-section" style={{ borderBottom: 'var(--divider)', paddingBottom: 'var(--space-lg)' }}>
        <h2 className="section-title">Current clinical state</h2>
        <div className="section-divider" />

        <div className="clinical-state-content">
          <div className="clinical-state-name" style={{ fontSize: 'var(--font-xl, 20px)', fontWeight: 'var(--weight-bold, 700)', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {primaryCondition?.title || (summary?.condition_count > 0 ? 'Recorded condition' : 'No active condition recorded')}
          </div>

          <div className="clinical-state-meta" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            {lastAdmission ? (
              <span>
                Admitted {lastAdmission.date}
                {lastAdmission.end_date ? ` · Discharged ${lastAdmission.end_date}` : ''}
                {outcome ? ` · ${outcome}` : ''}
              </span>
            ) : (
              <span>No hospital encounters on file</span>
            )}
          </div>

          {primaryTreatment && (
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Treatment: {primaryTreatment.title}
            </div>
          )}

          {isReadmitted && (
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--accent-warning)', marginTop: '6px', fontWeight: 'var(--weight-medium)' }}>
              ⚠ Readmitted
            </div>
          )}
        </div>
      </section>

      {/* 2. Recent Activity */}
      <section className="overview-section" style={{ borderBottom: 'var(--divider)', paddingBottom: 'var(--space-lg)' }}>
        <h2 className="section-title">Recent activity</h2>
        <div className="section-divider" />

        {recentEvents.length === 0 ? (
          <p className="empty-subtext">No recent activity recorded.</p>
        ) : (
          <div className="activity-list">
            {recentEvents.map((evt, idx) => (
              <div key={idx} className="activity-row" style={{ display: 'flex', gap: '16px', padding: '8px 0' }}>
                <span className="activity-date" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '90px' }}>
                  {evt.date || 'Undated'}
                </span>
                <span className="activity-desc" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                  {evt.event_type} — {evt.title || evt.details}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Record Summary */}
      <section className="overview-section" style={{ paddingBottom: 'var(--space-lg)' }}>
        <h2 className="section-title">Record summary</h2>
        <div className="section-divider" />

        <dl className="summary-definition-list">
          <div className="summary-def-row">
            <dt className="summary-def-label">Conditions</dt>
            <dd className="summary-def-value">{summary?.condition_count ?? 0}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Treatments</dt>
            <dd className="summary-def-value">{summary?.treatment_count ?? 0}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Admissions</dt>
            <dd className="summary-def-value">{summary?.admission_count ?? 0}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Documents</dt>
            <dd className="summary-def-value">{documents?.length ?? 0}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Total cost</dt>
            <dd className="summary-def-value">₹{(summary?.total_treatment_cost_inr || 0).toLocaleString()}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Region</dt>
            <dd className="summary-def-value">{summary?.state || 'N/A'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
