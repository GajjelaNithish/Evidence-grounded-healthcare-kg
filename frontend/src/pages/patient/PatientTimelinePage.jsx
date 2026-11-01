import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { PageHeader, Skeleton, EmptyState } from '../../components/ui';
import { IconClock, IconAlertTriangle } from '@tabler/icons-react';

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
      <div className="page-root">
        <EmptyState
          title="No medical record linked"
          description="Your patient account is not connected to a clinical patient dossier."
          icon={IconClock}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-root" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Skeleton width="30%" height="32px" />
        <Skeleton height="80px" borderRadius="var(--radius-lg)" />
        <Skeleton height="80px" borderRadius="var(--radius-lg)" />
        <Skeleton height="80px" borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  // Group events by year
  const eventsByYear = timeline.reduce((acc, evt) => {
    if (!evt) return acc;
    const year = evt.date ? String(evt.date).split('-')[0] : 'Historical';
    if (!acc[year]) acc[year] = [];
    acc[year].push(evt);
    return acc;
  }, {});

  const sortedYears = Object.keys(eventsByYear).sort((a, b) => b.localeCompare(a));

  const getDotClass = (item) => {
    const type = item.event_type || '';
    if (type === 'Clinical Encounter') return 'dot-info';
    if (type === 'Hospital Admission') return 'dot-warning';
    if (type === 'Condition Diagnosis') return 'dot-danger';
    if (type === 'Treatment Course') return 'dot-success';
    if (type === 'Lab / Investigation') return 'dot-observation';
    return 'dot-muted';
  };

  const getBadgeClass = (event_type) => {
    if (event_type === 'Clinical Encounter') return 'badge-encounter';
    if (event_type === 'Hospital Admission') return 'badge-admission';
    if (event_type === 'Condition Diagnosis') return 'badge-condition';
    if (event_type === 'Treatment Course') return 'badge-treatment';
    if (event_type === 'Lab / Investigation') return 'badge-observation';
    return 'badge-default';
  };

  return (
    <div className="page-root">
      <PageHeader
        title="Personal Health Timeline"
        description="Chronological record of your diagnoses, treatments, lab tests, and hospital consultations."
        badge={`${timeline.length} Events`}
      />

      {timeline.length === 0 ? (
        <EmptyState
          title="No events recorded"
          description="There are no medical timeline events recorded in your dossier yet."
          icon={IconClock}
        />
      ) : (
        <div className="timeline-view-container">
          {/* Legend */}
          <div className="timeline-legend" style={{ marginBottom: '1.5rem' }}>
            <span className="legend-item"><span className="legend-dot dot-danger" /> Condition</span>
            <span className="legend-item"><span className="legend-dot dot-success" /> Treatment</span>
            <span className="legend-item"><span className="legend-dot dot-observation" style={{ backgroundColor: '#ec4899' }} /> Lab Test</span>
            <span className="legend-item"><span className="legend-dot dot-warning" /> Admission</span>
            <span className="legend-item"><span className="legend-dot dot-info" /> Encounter</span>
          </div>

          {sortedYears.map((year) => (
            <div key={year} className="timeline-year-group">
              <div className="timeline-year-heading">{year}</div>

              <div className="timeline-spine-wrapper">
                <div className="timeline-vertical-spine" />

                <div className="timeline-events-list">
                  {eventsByYear[year].map((evt, idx) => (
                    <div key={idx} className="timeline-event-item">
                      <div className={`timeline-spine-dot ${getDotClass(evt)}`} />

                      <div className="timeline-event-body">
                        <div className="timeline-event-date-row">
                          <span className="timeline-event-date">{evt.date || 'Undated'}</span>
                          {evt.event_type && (
                            <span className={`timeline-event-type-badge ${getBadgeClass(evt.event_type)}`}>
                              {evt.event_type}
                            </span>
                          )}
                        </div>

                        <div className="timeline-event-title">{evt.title || evt.event_type}</div>

                        <div className="timeline-event-details">
                          {evt.details || evt.event_type}
                        </div>

                        {evt.end_date && (
                          <div className="timeline-event-meta">
                            Concluded {evt.end_date} · Status: {evt.status || 'Recorded'}
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
