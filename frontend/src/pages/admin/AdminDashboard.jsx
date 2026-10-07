import React, { useEffect, useState } from 'react';
import {
  IconDatabase,
  IconServer,
  IconUsers,
  IconFileText,
  IconActivity,
  IconNetwork,
  IconCheck,
  IconX,
  IconShieldCheck
} from '@tabler/icons-react';
import api from '../../api';
import { PageHeader, SectionHeader, StatCard, StatusBadge, DataTable, Skeleton } from '../../components/ui';

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
        <Skeleton height="40px" width="300px" style={{ marginBottom: '1.5rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <Skeleton height="110px" />
          <Skeleton height="110px" />
          <Skeleton height="110px" />
        </div>
        <Skeleton height="200px" />
      </div>
    );
  }

  const auditColumns = [
    {
      header: 'Timestamp',
      key: 'timestamp',
      render: (row) => (
        <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {row.timestamp ? new Date(row.timestamp).toLocaleString() : 'Recent'}
        </span>
      )
    },
    {
      header: 'User',
      key: 'username',
      render: (row) => row.username || row.user_id || 'system'
    },
    {
      header: 'Action',
      key: 'action',
      render: (row) => (
        <StatusBadge status={row.action?.includes('ERROR') ? 'error' : 'completed'} label={row.action} />
      )
    },
    {
      header: 'Patient ID',
      key: 'clinical_patient_id',
      render: (row) => (
        <span className="font-mono">{row.clinical_patient_id || '—'}</span>
      )
    }
  ];

  return (
    <div className="page-root">
      <PageHeader
        title="Admin Overview"
        description="System health, processing metrics, and recent administrative audit events"
        badge="System Active"
      />

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard
          title="Documents Processed"
          value={metrics?.total_documents_processed ?? 0}
          subtitle="Total ingestion pipeline tasks"
          icon={IconFileText}
          color="var(--accent-primary)"
        />
        <StatCard
          title="Queries Executed"
          value={metrics?.total_queries_executed ?? 0}
          subtitle="Clinical Q&A execution total"
          icon={IconActivity}
          color="var(--accent-secondary)"
        />
        <StatCard
          title="Registered Users"
          value={metrics?.total_users ?? 0}
          subtitle="Across all platform roles"
          icon={IconUsers}
          color="var(--accent-success)"
        />
        <StatCard
          title="Knowledge Graph Nodes"
          value={metrics?.neo4j_nodes ?? 0}
          subtitle={metrics?.neo4j_relationships ? `${metrics.neo4j_relationships} relationships` : 'Graph database entities'}
          icon={IconNetwork}
          color="var(--accent-info)"
        />
      </div>

      {/* Infrastructure Status */}
      <section className="admin-section" style={{ marginBottom: '2rem' }}>
        <SectionHeader title="Infrastructure Health" subtitle="Core service connections and status" icon={IconServer} />
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <IconNetwork size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Neo4j Graph Database</h4>
                <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {metrics?.neo4j_nodes ? `${metrics.neo4j_nodes} nodes · ${metrics.neo4j_relationships || 0} edges` : 'Graph database'}
                </p>
              </div>
            </div>
            <StatusBadge status={healthStatus?.neo4j ? 'active' : 'error'} label={healthStatus?.neo4j ? 'Connected' : 'Disconnected'} />
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-success)' }}>
                <IconDatabase size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>PostgreSQL Store</h4>
                <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {metrics?.total_users ? `${metrics.total_users} users registered` : 'Relational database'}
                </p>
              </div>
            </div>
            <StatusBadge status={healthStatus?.postgres ? 'active' : 'error'} label={healthStatus?.postgres ? 'Connected' : 'Disconnected'} />
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-warning)' }}>
                <IconServer size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Redis Cache</h4>
                <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Task broker & cache session manager</p>
              </div>
            </div>
            <StatusBadge status={healthStatus?.redis ? 'active' : 'error'} label={healthStatus?.redis ? 'Connected' : 'Disconnected'} />
          </div>
        </div>
      </section>

      {/* Section 3: Recent Audit Events */}
      <section className="admin-section">
        <SectionHeader title="Recent Audit Events" subtitle="Latest 5 system audit logs" icon={IconShieldCheck} />
        <DataTable
          columns={auditColumns}
          data={recentAudit}
          emptyMessage="No recent audit events recorded."
        />
      </section>
    </div>
  );
}

