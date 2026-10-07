import React from 'react';
import { IconInbox } from '@tabler/icons-react';

export default function EmptyState({ title = 'No items found', description = 'There is no data to display right now.', icon: Icon = IconInbox, action }) {
  return (
    <div className="empty-state" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      textAlign: 'center',
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
      margin: '1rem 0'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'rgba(148, 163, 184, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        marginBottom: '1rem'
      }}>
        <Icon size={28} />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>{title}</h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, maxWidth: '400px' }}>{description}</p>
      {action && <div style={{ marginTop: '1.25rem' }}>{action}</div>}
    </div>
  );
}
