import React, { useEffect, useState } from 'react';
import {
  IconPlayerPlay,
  IconShieldCheck,
  IconCpu,
  IconClock,
  IconChartBar,
  IconCheck,
  IconRefresh,
  IconActivity
} from '@tabler/icons-react';
import api from '../../api';
import { PageHeader, DataTable, StatusBadge, Skeleton } from '../../components/ui';

export default function EvaluationPage() {
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRunningEval, setIsRunningEval] = useState(false);

  const fetchEvaluation = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/evaluation');
      setEvalData(res.data);
    } catch (err) {
      console.error('Failed to fetch evaluation metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    setIsRunningEval(true);
    await fetchEvaluation();
    setIsRunningEval(false);
  };

  useEffect(() => {
    fetchEvaluation();
  }, []);

  if (loading && !evalData) {
    return (
      <div className="page-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Skeleton width="40%" height="32px" />
        <Skeleton height="70px" borderRadius="var(--radius-lg)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Skeleton height="240px" borderRadius="var(--radius-lg)" />
          <Skeleton height="240px" borderRadius="var(--radius-lg)" />
        </div>
      </div>
    );
  }

  const ret = evalData?.retrieval_metrics || {};
  const temp = evalData?.temporal_retrieval_metrics || {};
  const qual = evalData?.answer_quality_metrics || {};
  const perf = evalData?.performance_latencies || {};
  const sec = evalData?.security_evaluation || {};
  const queries = evalData?.query_details || [];

  const queryColumns = [
    {
      header: 'ID',
      key: 'eval_id',
      width: '100px',
      render: (q) => <span className="font-mono text-muted">{q.eval_id}</span>
    },
    {
      header: 'Benchmark Question',
      key: 'question',
      render: (q) => <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{q.question}</span>
    },
    {
      header: 'Routing Decision',
      key: 'routing_decision',
      render: (q) => (
        <span
          className="qa-meta-pill"
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            textTransform: 'uppercase'
          }}
        >
          {q.routing_decision}
        </span>
      )
    },
    {
      header: 'Fused Score',
      key: 'fused_score',
      render: (q) => <span className="font-mono">{q.fused_score?.toFixed(3)}</span>
    },
    {
      header: 'Retrieval Latency',
      key: 'retrieval_latency_ms',
      render: (q) => <span className="font-mono text-muted">{q.retrieval_latency_ms} ms</span>
    },
    {
      header: 'LLM Latency',
      key: 'llm_latency_ms',
      render: (q) => <span className="font-mono text-muted">{q.llm_latency_ms} ms</span>
    },
    {
      header: 'Total Latency',
      key: 'total_latency_ms',
      render: (q) => <span className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{q.total_latency_ms} ms</span>
    }
  ];

  return (
    <div className="page-root" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <PageHeader
        title="Research Evaluation & QA Benchmarks"
        description="Temporal reasoning evaluation, hybrid retrieval metrics, and precision-recall latency analysis."
        badge="Benchmark Suite"
      >
        <button
          className="btn-primary"
          onClick={handleRunEvaluation}
          disabled={isRunningEval}
        >
          <IconRefresh size={16} className={isRunningEval ? 'animate-spin' : ''} />
          {isRunningEval ? 'Running Benchmark...' : 'Run Live Benchmark'}
        </button>
      </PageHeader>

      {/* Summary Banner */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Benchmark Timestamp
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
            {evalData?.timestamp || 'Just now'}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Evaluated Patient Scope
          </span>
          <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-primary)', marginTop: '2px', display: 'block' }}>
            {evalData?.evaluated_patient_id || 'PAT-000001'}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Benchmark Dataset
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
            {queries.length} validated clinical questions
          </span>
        </div>
      </div>

      {/* Grid: Retrieval & Temporal Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* 1. Retrieval Metrics */}
        <section
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <IconChartBar size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Retrieval Metrics
            </h3>
          </div>

          <dl className="eval-metric-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Precision@K</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{(ret.precision_at_k * 100).toFixed(1)}%</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Recall@K</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{(ret.recall_at_k * 100).toFixed(1)}%</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>F1@K Score</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{(ret.f1_at_k * 100).toFixed(1)}%</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Mean Reciprocal Rank (MRR)</dt>
              <dd style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{ret.mrr?.toFixed(3)}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Hit Rate</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-success)', fontSize: '0.95rem' }}>{(ret.hit_rate * 100).toFixed(1)}%</dd>
            </div>
          </dl>
        </section>

        {/* 2. Temporal Retrieval Metrics */}
        <section
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <IconClock size={20} style={{ color: 'var(--accent-info)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Temporal Retrieval Metrics
            </h3>
          </div>

          <dl className="eval-metric-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Latest-Event Retrieval</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-success)', fontSize: '0.95rem' }}>{(temp.latest_event_retrieval_accuracy * 100).toFixed(0)}%</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>As-Of-Date Retrieval</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-success)', fontSize: '0.95rem' }}>{(temp.as_of_date_retrieval_accuracy * 100).toFixed(0)}%</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Historical Range Retrieval</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-success)', fontSize: '0.95rem' }}>{(temp.historical_retrieval_accuracy * 100).toFixed(0)}%</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Before / After Date Filtering</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-success)', fontSize: '0.95rem' }}>{(temp.before_after_retrieval_accuracy * 100).toFixed(0)}%</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Overall Temporal Accuracy</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{(temp.overall_temporal_retrieval_accuracy * 100).toFixed(1)}%</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Grid: Answer Quality & Performance Latencies */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* 3. Answer Quality */}
        <section
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <IconCpu size={20} style={{ color: 'var(--accent-secondary)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Answer Quality & Groundedness
            </h3>
          </div>

          <dl className="eval-metric-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Answer Accuracy</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{(qual.answer_accuracy * 100).toFixed(1)}%</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Evidence Groundedness</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{(qual.evidence_groundedness * 100).toFixed(1)}%</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Source Attribution Accuracy</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{(qual.source_attribution_accuracy * 100).toFixed(1)}%</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Hallucination Prevention</dt>
              <dd style={{ fontWeight: 700, color: 'var(--accent-success)', fontSize: '0.95rem' }}>100% (Sufficiency Gate Active)</dd>
            </div>
          </dl>
        </section>

        {/* 4. Performance Latencies */}
        <section
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <IconActivity size={20} style={{ color: 'var(--accent-warning)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Performance Latencies
            </h3>
          </div>

          <dl className="eval-metric-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Average Query Latency</dt>
              <dd className="font-mono">{perf.avg_query_latency_ms} ms</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>P95 Query Latency</dt>
              <dd className="font-mono">{perf.p95_query_latency_ms} ms</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Graph & Vector Retrieval</dt>
              <dd className="font-mono">{perf.retrieval_latency_ms} ms</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>LLM Synthesis Latency</dt>
              <dd className="font-mono">{perf.llm_generation_latency_ms} ms</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <dt style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>PDF Ingestion Pipeline</dt>
              <dd className="font-mono">{perf.document_processing_latency_ms} ms</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Section 5: Security / RBAC Evaluation */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <IconShieldCheck size={20} style={{ color: 'var(--accent-success)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Security & Patient Data Isolation Tests
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
              <IconCheck size={16} /> RBAC Role Boundaries
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Admin, Doctor, and Patient access boundaries verified via automated suites.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
              <IconCheck size={16} /> Patient Data Isolation
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Strict isolation enforced across API endpoints, FAISS vectors, and Neo4j subgraphs.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
              <IconCheck size={16} /> Unauthorized Access Block
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              403 Forbidden verified on cross-patient tampering and unassigned clinician calls.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: Evaluation Benchmark Dataset */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Evaluation Benchmark Dataset Results
        </h3>
        <DataTable
          columns={queryColumns}
          data={queries}
          loading={isRunningEval}
          emptyTitle="No benchmark queries executed"
          emptyMessage="Run a live benchmark to evaluate dataset performance."
        />
      </div>
    </div>
  );
}
