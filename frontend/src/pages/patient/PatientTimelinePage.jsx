import { useEffect, useState } from 'react';
import { Clock, HeartPulse, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function PatientTimelinePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const toast = useToast();

  const patientId = user?.clinical_patient_id;

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }
    fetchTimeline();
  }, [patientId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/kg/timeline/${patientId}`);
      setEvents(res.data || []);
    } catch {
      toast.error('Failed to load your medical timeline.');
    } finally {
      setLoading(false);
    }
  };

  if (!patientId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <AlertCircle size={36} style={{ color: 'var(--accent-warning)', marginBottom: 'var(--space-sm)' }} />
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>No Medical Record Associated</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
          Your account is not linked to a clinical patient ID.
        </p>
      </div>
    );
  }

  const filtered = events.filter((e) => {
    if (filter === 'ALL') return true;
    return e.event_type === filter;
  });

  const getEventBadge = (type) => {
    switch (type) {
      case 'Condition Diagnosis': return 'badge-amber';
      case 'Treatment Course': return 'badge-blue';
      case 'Hospital Admission': return 'badge-purple';
      default: return 'badge-blue';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1>My Medical Timeline</h1>
          <p>Chronological record of diagnoses, treatments, and admissions for Patient #{patientId}</p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          {['ALL', 'Condition Diagnosis', 'Treatment Course', 'Hospital Admission'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f === 'ALL' ? 'All Events' : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-container" style={{ minHeight: '300px' }}>
          <div className="spinner spinner-lg" />
          <span>Retrieving timeline history...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }} />
          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>No Timeline Events Recorded</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            There are currently no events matching this filter in your clinical record.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filtered.map((item, idx) => (
            <div key={idx} className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
                    <span className={`badge ${getEventBadge(item.event_type)}`}>
                      {item.event_type}
                    </span>
                    <span className="badge badge-green">{item.status || 'Recorded'}</span>
                  </div>
                  <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-xs)' }}>
                    {item.details}
                  </p>
                </div>

                <div style={{ textAlign: 'right', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                  <div><strong>Date:</strong> {item.date || 'N/A'}</div>
                  {item.end_date && <div><strong>End:</strong> {item.end_date}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
