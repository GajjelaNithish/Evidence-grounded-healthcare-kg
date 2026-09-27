import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function PatientTimelinePage() {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const patientId = user?.clinical_patient_id;

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    api
      .get(`/kg/timeline/${patientId}`)
      .then((res) => setTimeline(res.data || []))
      .catch((err) => console.error('Failed to load patient timeline', err))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="empty-state-container">
        <h2 className="empty-state-heading">No medical record linked</h2>
        <p className="empty-state-text">
          Your account is not linked to a clinical patient record.
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

  // Group events by year
  const eventsByYear = timeline.reduce((acc, evt) => {
    const year = evt.date ? evt.date.split('-')[0] : 'Historical';
    if (!acc[year]) acc[year] = [];
    acc[year].push(evt);
    return acc;
  }, {});

  const getDotClass = (item) => {
    const text = `${item.status || ''} ${item.details || ''} ${item.title || ''}`.toLowerCase();
    if (text.includes('recovered')) return 'dot-success';
    if (text.includes('stable')) return 'dot-warning';
    return 'dot-muted';
  };

  return (
    <div className="page-root">
      <div className="page-header-row">
        <h1 className="page-title">Health timeline</h1>
      </div>

      <div className="section-divider" />

      {timeline.length === 0 ? (
        <div className="empty-state-container">
          <p className="empty-state-text">No health events recorded in your timeline.</p>
        </div>
      ) : (
        <div className="timeline-view-container">
          {Object.entries(eventsByYear).map(([year, events]) => (
            <div key={year} className="timeline-year-group">
              <div className="timeline-year-heading">{year}</div>

              <div className="timeline-spine-wrapper">
                <div className="timeline-vertical-spine" />

                <div className="timeline-events-list">
                  {events.map((evt, idx) => (
                    <div key={idx} className="timeline-event-item">
                      <div className={`timeline-spine-dot ${getDotClass(evt)}`} />

                      <div className="timeline-event-body">
                        <div className="timeline-event-date">{evt.date || 'Undated'}</div>

                        <div className="timeline-event-title">{evt.title || evt.event_type}</div>

                        <div className="timeline-event-details">
                          {evt.details || evt.event_type}
                        </div>

                        {evt.end_date && (
                          <div className="timeline-event-meta">
                            Completed on {evt.end_date} · Status: {evt.status || 'Recorded'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
