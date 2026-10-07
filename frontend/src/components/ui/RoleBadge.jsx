import React from 'react';

const roleStyles = {
  admin: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)', label: 'Admin' },
  doctor: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)', label: 'Doctor' },
  patient: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)', label: 'Patient' }
};

export default function RoleBadge({ role }) {
  const normalized = (role || '').toLowerCase();
  const style = roleStyles[normalized] || {
    bg: 'rgba(148, 163, 184, 0.15)',
    color: 'var(--text-secondary)',
    border: 'var(--border-subtle)',
    label: role || 'User'
  };

  return (
    <span className="role-badge" style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.2rem 0.55rem',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }}>
      {style.label}
    </span>
  );
}
