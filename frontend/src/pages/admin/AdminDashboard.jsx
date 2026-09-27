import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [recentAudit, setRecentAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/metrics').catch(() => ({ data: null })),
      api.get('/health').catch(() => ({ data: null })),
      api.get('/admin/audit').catch(() => ({ data: [] })),
    ]).then(([metricsRes, healthRes, auditRes]) => {
      setMetrics(metricsRes.data);
      setHealthStatus(healthRes.data);
      setRecentAudit((auditRes.data || []).slice(0, 5));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="page-root">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-paragraph" />
      </div>
    );
  }

  return (
    <div className="page-root">
      {/* Section 1: System Overview */}
      <section className="admin-section">
        <h2 className="section-title">System overview</h2>
        <div className="section-divider" />

        <div className="admin-service-list">
          <div className="admin-service-row">
            <span className="admin-service-name">Neo4j</span>
            <span className={healthStatus?.neo4j ? 'status-connected' : 'status-disconnected'}>
              {healthStatus?.neo4j ? 'Connected' : 'Disconnected'}
            </span>
            <span className="admin-service-detail">
              {metrics?.neo4j_nodes ? `${metrics.neo4j_nodes} nodes · ${metrics.neo4j_relationships || 0} edges` : 'Graph database'}
            </span>
          </div>

          <div className="admin-service-row">
            <span className="admin-service-name">PostgreSQL</span>
            <span className={healthStatus?.postgres ? 'status-connected' : 'status-disconnected'}>
              {healthStatus?.postgres ? 'Connected' : 'Disconnected'}
            </span>
            <span className="admin-service-detail">
              {metrics?.total_users ? `${metrics.total_users} users registered` : 'Relational store'}
            </span>
          </div>

          <div className="admin-service-row">
            <span className="admin-service-name">Redis</span>
            <span className={healthStatus?.redis ? 'status-connected' : 'status-disconnected'}>
              {healthStatus?.redis ? 'Connected' : 'Disconnected'}
            </span>
            <span className="admin-service-detail">Task broker & cache</span>
          </div>
        </div>
      </section>

      {/* Section 2: Processing & Stats */}
      <section className="admin-section">
        <h2 className="section-title">Processing metrics</h2>
        <div className="section-divider" />

        <dl className="summary-definition-list">
          <div className="summary-def-row">
            <dt className="summary-def-label">Documents processed</dt>
            <dd className="summary-def-value">{metrics?.total_documents_processed ?? 0}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Queries executed</dt>
            <dd className="summary-def-value">{metrics?.total_queries_executed ?? 0}</dd>
          </div>
          <div className="summary-def-row">
            <dt className="summary-def-label">Total registered users</dt>
            <dd className="summary-def-value">{metrics?.total_users ?? 0}</dd>
          </div>
        </dl>
      </section>

      {/* Section 3: Recent Audit Events */}
      <section className="admin-section">
        <h2 className="section-title">Recent audit events</h2>
        <div className="section-divider" />

        {recentAudit.length === 0 ? (
          <p className="empty-subtext">No recent audit events recorded.</p>
        ) : (
          <div className="compact-table-container">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User ID</th>
                  <th>Action</th>
                  <th>Patient</th>
                </tr>
              </thead>
              <tbody>
                {recentAudit.map((item, idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-muted">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}
                    </td>
                    <td>{item.username || item.user_id || 'system'}</td>
                    <td>
                      <span className={`audit-action-text action-${String(item.action || '').toLowerCase()}`}>
                        {item.action}
                      </span>
                    </td>
                    <td className="font-mono">{item.clinical_patient_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
