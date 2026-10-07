import React from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';

export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="error-state" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1.5rem',
      textAlign: 'center',
      background: 'rgba(239, 68, 68, 0.05)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      margin: '1rem 0'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--accent-danger)',
        marginBottom: '1rem'
      }}>
        <IconAlertTriangle size={24} />
      </div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>{title}</h3>
      {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', maxWidth: '450px' }}>{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary"
          style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
