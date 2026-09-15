import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const toast = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (patientFilter) params.patient_id = patientFilter;
      const res = await api.get('/admin/audit', { params });
      setLogs(res.data);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [actionFilter, patientFilter]);

  return (
    <div>
      <div className="page-header">
        <h1>Audit Logs</h1>
        <p>Track all system actions and clinical queries</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
          <label className="label">Action Type</label>
          <select className="select" value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)} id="audit-action-filter">
            <option value="">All Actions</option>
            <option value="CLINICAL_QUERY">Clinical Query</option>
            <option value="DOCUMENT_UPLOAD">Document Upload</option>
            <option value="KG_VIEW">KG View</option>
            <option value="LOGIN">Login</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
          <label className="label">Patient ID</label>
          <input className="input" placeholder="Filter by patient..." value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)} id="audit-patient-filter" />
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Patient</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.username}</td>
                    <td>
                      <span className={`badge ${actionBadge(log.action)}`}>{log.action}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-xs)' }}>
                      {log.patient_id || '—'}
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')}>
                      {typeof log.details === 'object' && log.details !== null ? JSON.stringify(log.details) : (log.details || '—')}
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function actionBadge(action) {
  if (action === 'CLINICAL_QUERY') return 'badge-blue';
  if (action === 'DOCUMENT_UPLOAD') return 'badge-green';
  if (action === 'KG_VIEW') return 'badge-purple';
  return 'badge-amber';
}
