import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'var(--accent-primary)' }) {
  return (
    <div className="stat-card" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s ease, border-color 0.2s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>{title}</span>
        {Icon && (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: `rgba(59, 130, 246, 0.1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color
          }}>
            <Icon size={20} />
          </div>
        )}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {value}
      </div>
      {(subtitle || trend) && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {trend && (
            <span style={{ color: trend > 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600 }}>
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
