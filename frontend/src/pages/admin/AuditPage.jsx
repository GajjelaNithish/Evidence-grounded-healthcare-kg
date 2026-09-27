import React, { useEffect, useState } from 'react';
import api from '../../api';

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

  const getActionClass = (action) => {
    const act = String(action || '').toUpperCase();
    if (act.includes('QUERY')) return 'action-query';
    if (act.includes('UPLOAD')) return 'action-upload';
    if (act.includes('LOGIN')) return 'action-login';
    return 'action-default';
  };

  return (
    <div className="page-root">
      {/* Header */}
      <div className="page-header-row">
        <h1 className="page-title">Audit log</h1>
      </div>

      {/* Filter Bar */}
      <div className="admin-filters-bar">
        <div className="filter-select-group">
          <label className="filter-select-label">Action:</label>
          <select
            className="filter-select-dropdown"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="CLINICAL_QUERY">Clinical Query</option>
            <option value="DOCUMENT_UPLOAD">Document Upload</option>
            <option value="KG_VIEW">KG View</option>
            <option value="LOGIN">Login</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label className="filter-select-label">Patient:</label>
          <input
            className="search-input compact-input"
            placeholder="Filter patient ID..."
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="section-divider" />

      {/* Audit Table */}
      {loading ? (
        <div className="skeleton-table">
          <div className="skeleton skeleton-row-left" />
          <div className="skeleton skeleton-row-left" />
          <div className="skeleton skeleton-row-left" />
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state-container">
          <p className="empty-state-text">No audit entries found matching search criteria.</p>
        </div>
      ) : (
        <div className="compact-table-container">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Patient</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const detailsStr =
                  typeof log.details === 'object' && log.details !== null
                    ? JSON.stringify(log.details)
                    : (log.details || '—');

                return (
                  <tr key={log.id}>
                    <td className="font-mono text-muted">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                    </td>
                    <td className="font-semibold">{log.username || log.user_id || 'system'}</td>
                    <td>
                      <span className={`audit-action-text ${getActionClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="font-mono">{log.clinical_patient_id || log.patient_id || '—'}</td>
                    <td className="text-muted truncate-cell" title={detailsStr}>
                      {detailsStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
