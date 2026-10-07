import React from 'react';

export default function PageHeader({ title, description, badge, actions, children }) {
  return (
    <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h1>
          {badge && <span className="header-badge">{badge}</span>}
        </div>
        {description && (
          <p className="page-description" style={{ color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0, fontSize: '0.9rem' }}>
            {description}
          </p>
        )}
      </div>
      {(actions || children) && (
        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}
