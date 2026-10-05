import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Timeline({ timeline = [] }) {
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

  if (safeTimeline.length === 0) {
    return (
      <div className="empty-state-container">
        <p className="empty-state-text">
          No timeline events found. Upload clinical documents or record encounters to populate this patient's history.
        </p>
      </div>
    );
  }

  // Group events by year, sorted newest-first
  const eventsByYear = safeTimeline.reduce((acc, evt) => {
    if (!evt) return acc;
    const year = evt.date ? String(evt.date).split('-')[0] : 'Historical';
    if (!acc[year]) acc[year] = [];
    acc[year].push(evt);
    return acc;
  }, {});

  const sortedYears = Object.keys(eventsByYear).sort((a, b) => b.localeCompare(a));

  const getDotClass = (item) => {
    const type = item.event_type || '';
    if (type === 'Clinical Encounter')  return 'dot-info';
    if (type === 'Hospital Admission')  return 'dot-warning';
    if (type === 'Condition Diagnosis') return 'dot-danger';
    if (type === 'Treatment Course')    return 'dot-success';
    const text = `${item.status || ''} ${item.details || ''}`.toLowerCase();
    if (text.includes('recovered'))     return 'dot-success';
    if (text.includes('stable'))        return 'dot-warning';
    if (text.includes('diagnos'))       return 'dot-danger';
    return 'dot-muted';
  };

  const getBadgeClass = (event_type) => {
    if (event_type === 'Clinical Encounter')  return 'badge-encounter';
    if (event_type === 'Hospital Admission')  return 'badge-admission';
    if (event_type === 'Condition Diagnosis') return 'badge-condition';
    if (event_type === 'Treatment Course')    return 'badge-treatment';
    return 'badge-default';
  };

  return (
    <div className="timeline-view-container">
      {/* Legend */}
      <div className="timeline-legend">
        <span className="legend-item"><span className="legend-dot dot-danger" /> Condition</span>
        <span className="legend-item"><span className="legend-dot dot-success" /> Treatment</span>
        <span className="legend-item"><span className="legend-dot dot-warning" /> Admission</span>
        <span className="legend-item"><span className="legend-dot dot-info" /> Encounter</span>
      </div>

      {sortedYears.map((year) => (
        <div key={year} className="timeline-year-group">
          <div className="timeline-year-heading">{year}</div>

          <div className="timeline-spine-wrapper">
            <div className="timeline-vertical-spine" />

            <div className="timeline-events-list">
              {eventsByYear[year].map((evt, idx) => {
                const isReadmitted =
                  evt.details?.toLowerCase().includes('readmission: yes') ||
                  evt.status?.toLowerCase().includes('readmitted');

                return (
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
                        <span>{evt.details || evt.event_type}</span>
                        {isReadmitted && (
                          <span className="timeline-readmit-warning">
                            <AlertTriangle size={12} /> Readmitted
                          </span>
                        )}
                      </div>

                      {evt.end_date ? (
                        <div className="timeline-event-meta">
                          Concluded {evt.end_date} · Status: {evt.status || 'Recorded'}
                        </div>
                      ) : evt.status ? (
                        <div className="timeline-event-meta">Status: {evt.status}</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
