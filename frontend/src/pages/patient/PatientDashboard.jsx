import React, { useEffect, useState } from 'react';
import { User, Calendar, FileText, Heart, Activity } from 'lucide-react';
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
          Your patient portal account is not connected to a patient record. Contact your administrator.
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
  const encounters = timeline.filter((e) => e.event_type === 'Clinical Encounter' || e.event_type === 'Hospital Admission');
  const latestEncounter = encounters.length > 0 ? encounters[0] : null;
  const recentVisits = encounters.slice(0, 4);

  const nameStr = user?.full_name || user?.username || `Patient ${patientId}`;
  const ageStr = analytics?.age && analytics.age !== 'N/A' ? `${analytics.age} yrs` : null;
  const genderStr = analytics?.gender && analytics.gender !== 'N/A' ? analytics.gender : null;
  const stateStr = analytics?.state && analytics.state !== 'N/A' ? analytics.state : null;

  return (
    <div className="page-root">
      {/* Patient Profile Header */}
      <header className="workspace-profile-header-card" style={{ marginBottom: '24px' }}>
        <div className="profile-header-main">
          <div className="profile-avatar-circle">
            <User size={24} />
          </div>
          <div className="profile-info-block">
            <div className="profile-title-row">
              <h1 className="profile-patient-name">{nameStr}</h1>
              <span className="profile-id-tag">{patientId}</span>
            </div>
            <div className="profile-meta-row">
              {genderStr && <span className="profile-meta-item">{genderStr}</span>}
              {ageStr && <span className="profile-meta-item">• {ageStr}</span>}
              {stateStr && <span className="profile-meta-item">• {stateStr}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* 1. Current Condition */}
      <section className="overview-section">
        <h2 className="section-title">Current Health Status</h2>
        <div className="section-divider" />

        <div className="clinical-state-card">
          <div className="state-card-left">
            <h3 className="state-condition-name">
              {primaryCondition?.title || (analytics?.condition_count > 0 ? 'Medical Condition on File' : 'No active condition recorded')}
            </h3>
            <p className="state-condition-sub">
              {latestEncounter ? `Last clinical visit on ${latestEncounter.date}` : 'No hospital encounters recorded'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Longitudinal Visits & Encounters */}
      <section className="overview-section">
        <h2 className="section-title">Clinical History & Encounters</h2>
        <div className="section-divider" />

        {recentVisits.length === 0 ? (
          <p className="empty-subtext">No hospital encounters recorded.</p>
        ) : (
          <div className="clinical-history-block">
            {latestEncounter && (
              <div className="encounter-group">
                <span className="encounter-group-badge badge-latest">MOST RECENT VISIT</span>
                <div className="encounter-card card-latest">
                  <div className="encounter-card-header">
                    <span className="encounter-date flex-align-gap"><Calendar size={14} /> {latestEncounter.date}</span>
                    {latestEncounter.status && <span className="qa-meta-pill pill-routing-hybrid">{latestEncounter.status}</span>}
                  </div>
                  <h4 className="encounter-title">{latestEncounter.title || 'Clinical Visit'}</h4>
                  <p className="encounter-details">{latestEncounter.details}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Summary */}
      <section className="overview-section">
        <h2 className="section-title">Records Summary</h2>
        <div className="section-divider" />

        <dl className="summary-definition-list">
          <div className="summary-def-row">
            <dt className="summary-def-label">Documents on file</dt>
            <dd className="summary-def-value">{documents.length}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Total hospital encounters</dt>
            <dd className="summary-def-value">{encounters.length || analytics?.admission_count || 0}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
