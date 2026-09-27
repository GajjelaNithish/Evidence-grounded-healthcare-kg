import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Timeline({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="empty-state-container">
        <p className="empty-state-text">
          No timeline events found. Upload clinical documents to populate this patient's history.
        </p>
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
    if (text.includes('diagnos')) return 'dot-danger';
    return 'dot-muted';
  };

  return (
    <div className="timeline-view-container">
      {Object.entries(eventsByYear).map(([year, events]) => (
        <div key={year} className="timeline-year-group">
          <div className="timeline-year-heading">{year}</div>

          <div className="timeline-spine-wrapper">
            <div className="timeline-vertical-spine" />

            <div className="timeline-events-list">
              {events.map((evt, idx) => {
                const isReadmitted =
                  evt.details?.toLowerCase().includes('readmission: yes') ||
                  evt.status?.toLowerCase().includes('readmitted');

                return (
                  <div key={idx} className="timeline-event-item">
                    <div className={`timeline-spine-dot ${getDotClass(evt)}`} />

                    <div className="timeline-event-body">
                      <div className="timeline-event-date">{evt.date || 'Undated'}</div>

                      <div className="timeline-event-title">{evt.title || evt.event_type}</div>

                      <div className="timeline-event-details">
                        <span>{evt.details || evt.event_type}</span>
                        {isReadmitted && (
                          <span className="timeline-readmit-warning">
                            <AlertTriangle size={12} /> Readmitted
                          </span>
                        )}
                      </div>

                      {evt.end_date && (
                        <div className="timeline-event-meta">
                          Concluded on {evt.end_date} · Status: {evt.status || 'Recorded'}
                        </div>
                      )}
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
