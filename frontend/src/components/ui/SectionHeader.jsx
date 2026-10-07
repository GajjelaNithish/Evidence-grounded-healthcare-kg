import React from 'react';

export default function SectionHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {Icon && <Icon size={20} style={{ color: 'var(--accent-primary)' }} />}
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="section-actions">{actions}</div>}
    </div>
  );
}
