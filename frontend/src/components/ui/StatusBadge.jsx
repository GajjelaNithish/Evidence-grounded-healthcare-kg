import React from 'react';

const statusMap = {
  active: { label: 'Active', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  inactive: { label: 'Inactive', bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' },
  pending: { label: 'Pending', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  completed: { label: 'Completed', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  success: { label: 'Success', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  failed: { label: 'Failed', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  error: { label: 'Error', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' }
};

export default function StatusBadge({ status, label }) {
  const normalized = (status || '').toLowerCase();
  const config = statusMap[normalized] || {
    label: label || status || 'Unknown',
    bg: 'rgba(148, 163, 184, 0.15)',
    color: 'var(--text-secondary)',
    border: 'var(--border-subtle)'
  };

  return (
    <span className="status-badge" style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.2rem 0.6rem',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.75rem',
      fontWeight: 500,
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.border}`,
      textTransform: 'capitalize'
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: config.color }} />
      {label || config.label}
    </span>
  );
}
