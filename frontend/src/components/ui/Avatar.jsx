import React from 'react';

export default function Avatar({ name, role, size = 36 }) {
  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const getGradient = (r) => {
    const norm = (r || '').toLowerCase();
    if (norm === 'admin') return 'linear-gradient(135deg, #ef4444, #b91c1c)';
    if (norm === 'doctor') return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    if (norm === 'patient') return 'linear-gradient(135deg, #10b981, #047857)';
    return 'linear-gradient(135deg, #64748b, #334155)';
  };

  return (
    <div
      className="avatar"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: getGradient(role),
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: `${Math.max(12, Math.floor(size * 0.38))}px`,
        flexShrink: 0,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}
    >
      {getInitials(name)}
    </div>
  );
}
