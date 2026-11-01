import React, { useEffect, useState } from 'react';
import { IconSearch, IconX, IconShieldCheck, IconHistory } from '@tabler/icons-react';
import api from '../../api';
import { PageHeader, DataTable, StatusBadge } from '../../components/ui';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (patientFilter) params.patient_id = patientFilter;
      const res = await api.get('/admin/audit', { params });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, patientFilter]);

  const getActionBadge = (action) => {
    const act = String(action || '').toUpperCase();
    if (act.includes('QUERY')) return <StatusBadge status="completed" label={action} />;
    if (act.includes('UPLOAD')) return <StatusBadge status="active" label={action} />;
    if (act.includes('LOGIN')) return <StatusBadge status="inactive" label={action} />;
    if (act.includes('ERROR') || act.includes('FAILED')) return <StatusBadge status="error" label={action} />;
    return <StatusBadge status="pending" label={action} />;
  };

  const columns = [
    {
      header: 'Timestamp',
      key: 'timestamp',
      width: '180px',
      render: (log) => (
        <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
        </span>
      )
    },
    {
      header: 'User Principal',
      key: 'username',
      render: (log) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {log.username || log.user_id || 'system'}
        </span>
      )
    },
    {
      header: 'Audited Action',
      key: 'action',
      render: (log) => getActionBadge(log.action)
    },
    {
      header: 'Patient Scope',
      key: 'clinical_patient_id',
      render: (log) => (
        <span className="font-mono" style={{ color: (log.clinical_patient_id || log.patient_id) ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
          {log.clinical_patient_id || log.patient_id || '—'}
        </span>
      )
    },
    {
      header: 'Audit Event Metadata',
      key: 'details',
      render: (log) => {
        const detailsStr =
          typeof log.details === 'object' && log.details !== null
            ? JSON.stringify(log.details)
            : (log.details || '—');
        return (
          <span
            className="font-mono"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              display: 'block',
              maxWidth: '400px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis'
            }}
            title={detailsStr}
          >
            {detailsStr}
          </span>
        );
      }
    }
  ];

  return (
    <div className="page-root">
      {/* Header */}
      <PageHeader
        title="Audit Logs & Compliance Trail"
        description="Immutable administrative tracking of document ingestion, clinical queries, and patient record access."
        badge={`${logs.length} Logged Events`}
      />

      {/* Filter Row */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
          padding: '0.75rem 1rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Filter Action:</label>
          <select
            className="input-field"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            <option value="">All Actions</option>
            <option value="CLINICAL_QUERY">Clinical Query</option>
            <option value="DOCUMENT_UPLOAD">Document Upload</option>
            <option value="KG_VIEW">KG View</option>
            <option value="LOGIN">Login</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Patient Filter:</label>
          <input
            className="input-field"
            placeholder="Filter by Patient ID..."
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            style={{ width: '180px', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          />
          {patientFilter && (
            <button
              type="button"
              onClick={() => setPatientFilter('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Audit DataTable */}
      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyTitle="No audit logs recorded"
        emptyMessage="No system audit entries match the current filter query."
      />
    </div>
  );
}
