import { useEffect, useState } from 'react';
import { Users, FileText, Search as SearchIcon, BarChart3, Activity } from 'lucide-react';
import api from '../../api';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/metrics').catch(() => ({ data: null })),
      api.get('/health').catch(() => ({ data: null })),
    ]).then(([metricsRes, healthRes]) => {
      setMetrics(metricsRes.data);
      setHealthStatus(healthRes.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>System overview and management controls</p>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid">
        <StatCard
          icon={<Users size={22} />}
          value={metrics?.total_users ?? '—'}
          label="Total Users"
          color="var(--accent-primary)"
          bgColor="var(--accent-primary-glow)"
        />
        <StatCard
          icon={<FileText size={22} />}
          value={metrics?.total_documents_processed ?? '—'}
          label="Documents Processed"
          color="var(--accent-success)"
          bgColor="var(--accent-success-glow)"
        />
        <StatCard
          icon={<SearchIcon size={22} />}
          value={metrics?.total_queries_executed ?? '—'}
          label="Queries Executed"
          color="var(--accent-secondary)"
          bgColor="var(--accent-secondary-glow)"
        />
        <StatCard
          icon={<Activity size={22} />}
          value={metrics?.system_status === 'healthy' ? '✓' : '!'}
          label="System Status"
          color="var(--accent-warning)"
          bgColor="var(--accent-warning-glow)"
        />
      </div>

      {/* Service Health */}
      {healthStatus && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            Service Health
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
            <ServiceIndicator name="PostgreSQL" ok={healthStatus.postgres} />
            <ServiceIndicator name="Neo4j" ok={healthStatus.neo4j} />
            <ServiceIndicator name="Redis" ok={healthStatus.redis} />
          </div>
          <p style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            Overall: <span className={`badge ${healthStatus.status === 'ok' ? 'badge-green' : 'badge-amber'}`}>
              {healthStatus.status}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color, bgColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bgColor, color }}>
        {icon}
      </div>
      <div>
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function ServiceIndicator({ name, ok }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: ok ? 'var(--accent-success)' : 'var(--accent-danger)',
        boxShadow: ok ? '0 0 8px var(--accent-success-glow)' : '0 0 8px var(--accent-danger-glow)',
      }} />
      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>{name}</span>
    </div>
  );
}
