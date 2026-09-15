import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Clock, Search, FileText, Calendar, Activity, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentTimeline, setRecentTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const patientId = user?.clinical_patient_id;

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.get(`/kg/analytics/${patientId}`).catch(() => ({ data: null })),
      api.get(`/kg/timeline/${patientId}`).catch(() => ({ data: [] })),
    ]).then(([analyticsRes, timelineRes]) => {
      setAnalytics(analyticsRes.data);
      setRecentTimeline((timelineRes.data || []).slice(0, 5));
      setLoading(false);
    });
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-xl)' }}>
        <AlertCircle size={40} style={{ color: 'var(--accent-warning)', marginBottom: 'var(--space-md)' }} />
        <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
          No Clinical Record Linked
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', fontSize: 'var(--font-sm)' }}>
          Your account is currently not connected to a clinical patient record. Please contact your medical provider or clinic administrator to link your account.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '300px' }}>
        <div className="spinner spinner-lg" />
        <span>Loading your personal health summary...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Welcome, {user?.full_name || user?.username}</h1>
        <p>Your personal health overview and clinical record access (Patient #{patientId})</p>
      </div>

      {/* Health Metric Cards */}
      <div className="stat-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' }}>
            <HeartPulse size={22} />
          </div>
          <div>
            <div className="stat-value">{analytics?.condition_count ?? 0}</div>
            <div className="stat-label">Diagnosed Conditions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-secondary-glow)', color: 'var(--accent-secondary)' }}>
            <Activity size={22} />
          </div>
          <div>
            <div className="stat-value">{analytics?.treatment_count ?? 0}</div>
            <div className="stat-label">Treatments & Prescriptions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-warning-glow)', color: 'var(--accent-warning)' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div className="stat-value">{analytics?.admission_count ?? 0}</div>
            <div className="stat-label">Hospital Encounters</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-success-glow)', color: 'var(--accent-success)' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-value">{analytics?.total_length_of_stay_days ?? 0}</div>
            <div className="stat-label">Total Inpatient Days</div>
          </div>
        </div>
      </div>

      {/* Action / Exploration Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
        {/* Recent Timeline Preview */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: 'var(--font-base)', fontWeight: 700 }}>Recent Health Events</h2>
            <Link to="/patient/timeline" style={{ fontSize: 'var(--font-xs)', color: 'var(--accent-primary)', textDecoration: 'none' }}>
              Full Timeline &rarr;
            </Link>
          </div>

          {recentTimeline.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No recent health events recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {recentTimeline.map((item, idx) => (
                <div key={idx} style={{ padding: 'var(--space-sm)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                    <span>{item.event_type}</span>
                    <span>{item.date || 'N/A'}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--font-sm)', marginTop: '2px' }}>
                    {item.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ask Questions Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
              Have questions about your health records?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', lineHeight: 1.5, marginBottom: 'var(--space-md)' }}>
              Our evidence-grounded AI assistant can answer questions about your diagnosed conditions, prescribed medications, and hospital admissions directly from your verified medical record.
            </p>
          </div>

          <Link to="/patient/query" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            <Search size={16} /> Ask a Question Now <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
