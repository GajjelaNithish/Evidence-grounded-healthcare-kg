import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconUser,
  IconCalendar,
  IconFileText,
  IconHeartbeat,
  IconActivity,
  IconClock,
  IconMessage2,
  IconArrowRight,
  IconShieldCheck
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { PageHeader, StatCard, Skeleton, EmptyState } from '../../components/ui';

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
      <div className="page-root">
        <EmptyState
          title="No clinical record linked"
          description="Your patient portal account is not connected to a clinical patient dossier. Please contact your physician or hospital administrator to link your medical records."
          icon={IconUser}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Skeleton width="40%" height="32px" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
        </div>
        <Skeleton height="180px" borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  const primaryCondition = timeline.find((e) => e && e.event_type === 'Condition Diagnosis');
  const encounters = timeline.filter((e) => e && (e.event_type === 'Clinical Encounter' || e.event_type === 'Hospital Admission'));
  const latestEncounter = encounters.length > 0 ? encounters[0] : null;

  const nameStr = user?.full_name || user?.username || `Patient ${patientId}`;
  const ageStr = analytics?.age && analytics.age !== 'N/A' ? `${analytics.age} yrs` : null;
  const genderStr = analytics?.gender && analytics.gender !== 'N/A' ? analytics.gender : null;
  const stateStr = analytics?.state && analytics.state !== 'N/A' ? analytics.state : null;

  return (
    <div className="page-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Patient Header */}
      <PageHeader
        title={`Welcome, ${nameStr}`}
        description="Access your personal medical record, review past clinical visits, and ask questions about your health."
        badge={`Patient #${patientId}`}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/patient/query" className="btn-primary" style={{ textDecoration: 'none' }}>
            <IconMessage2 size={16} /> Ask a Health Question
          </Link>
          <Link to="/patient/timeline" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <IconClock size={16} /> View Timeline
          </Link>
        </div>
      </PageHeader>

      {/* Quick Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <StatCard
          title="Clinical Encounters"
          value={encounters.length || analytics?.admission_count || 0}
          subtitle="Hospital & clinic visits"
          icon={IconCalendar}
          color="var(--accent-primary)"
        />
        <StatCard
          title="Active Conditions"
          value={analytics?.condition_count ?? (primaryCondition ? 1 : 0)}
          subtitle="Diagnosed medical conditions"
          icon={IconHeartbeat}
          color="var(--accent-danger)"
        />
        <StatCard
          title="Medical Documents"
          value={documents.length}
          subtitle="Discharge notes & labs on file"
          icon={IconFileText}
          color="var(--accent-secondary)"
        />
      </div>

      {/* Current Health Status Card */}
      <div
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Current Health Status
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          >
            <IconShieldCheck size={14} /> Record Verified
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--accent-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              shrink: 0
            }}
          >
            <IconHeartbeat size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {primaryCondition?.title || (analytics?.condition_count > 0 ? 'Medical Condition on File' : 'No active conditions recorded')}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
              {latestEncounter ? `Most recent clinical encounter on ${latestEncounter.date}` : 'No hospital encounters recorded'}
            </p>
          </div>
        </div>
      </div>

      {/* Latest Visit Details */}
      {latestEncounter && (
        <div
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Most Recent Visit
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {latestEncounter.date}
            </span>
          </div>

          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              {latestEncounter.title || 'Clinical Consultation'}
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {latestEncounter.details}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <Link
              to="/patient/timeline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--accent-primary)',
                fontSize: '0.85rem',
                fontWeight: 500,
                textDecoration: 'none'
              }}
            >
              View full medical timeline <IconArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
