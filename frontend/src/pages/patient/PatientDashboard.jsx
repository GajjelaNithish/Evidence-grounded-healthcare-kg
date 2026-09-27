import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const patientId = user?.clinical_patient_id;

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.get(`/kg/analytics/${patientId}`).catch(() => ({ data: null })),
      api.get(`/kg/timeline/${patientId}`).catch(() => ({ data: [] })),
      api.get(`/documents/patient/${patientId}`).catch(() => ({ data: [] })),
    ]).then(([analyticsRes, timelineRes, docsRes]) => {
      setAnalytics(analyticsRes.data);
      setTimeline(timelineRes.data || []);
      setDocuments(docsRes.data || []);
      setLoading(false);
    });
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="empty-state-container">
        <h2 className="empty-state-heading">No clinical record linked</h2>
        <p className="empty-state-text">
          Your account is not connected to a patient record. Contact your healthcare administrator.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-root">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-paragraph" />
      </div>
    );
  }

  const primaryCondition = timeline.find((e) => e.event_type === 'Condition Diagnosis');
  const recentVisits = timeline.filter((e) => e.event_type === 'Hospital Admission').slice(0, 4);

  return (
    <div className="page-root">
      <div className="page-header-row">
        <h1 className="page-title">Your health record</h1>
      </div>

      <div className="section-divider" />

      {/* 1. Current Condition */}
      <section className="overview-section">
        <h2 className="section-title">Current condition</h2>
        <div className="section-divider" />

        <div className="clinical-state-content">
          <div className="clinical-state-name">
            {primaryCondition?.title || (analytics?.condition_count > 0 ? 'Medical condition on file' : 'No active condition recorded')}
          </div>
          <div className="clinical-state-meta">
            {primaryCondition?.details || 'Record active'}
          </div>
        </div>
      </section>

      {/* 2. Recent Visits */}
      <section className="overview-section">
        <h2 className="section-title">Recent visits</h2>
        <div className="section-divider" />

        {recentVisits.length === 0 ? (
          <p className="empty-subtext">No hospital visits recorded.</p>
        ) : (
          <div className="activity-list">
            {recentVisits.map((visit, idx) => (
              <div key={idx} className="activity-row">
                <span className="activity-date">{visit.date}</span>
                <span className="activity-desc">
                  {visit.title || 'Hospital admission'} · {visit.details || visit.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Summary Records */}
      <section className="overview-section">
        <h2 className="section-title">Summary</h2>
        <div className="section-divider" />

        <dl className="summary-definition-list">
          <div className="summary-def-row">
            <dt className="summary-def-label">Documents on file</dt>
            <dd className="summary-def-value">{documents.length}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Total hospital admissions</dt>
            <dd className="summary-def-value">{analytics?.admission_count ?? 0}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
