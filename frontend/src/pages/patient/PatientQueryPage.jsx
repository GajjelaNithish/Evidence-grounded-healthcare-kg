import { useState } from 'react';
import { Search, Send, ShieldCheck, FileText, Share2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function PatientQueryPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const toast = useToast();

  const patientId = user?.clinical_patient_id;

  if (!patientId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <AlertCircle size={36} style={{ color: 'var(--accent-warning)', marginBottom: 'var(--space-sm)' }} />
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>No Medical Record Associated</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
          Your account is not linked to a clinical patient ID.
        </p>
      </div>
    );
  }

  const handleAsk = async (promptQuery) => {
    const textToAsk = promptQuery || query;
    if (!textToAsk.trim()) return;

    try {
      setLoading(true);
      setResponse(null);
      const res = await api.post('/query', {
        patient_id: patientId,
        query: textToAsk.trim()
      });
      setResponse(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to execute query.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    'What medical conditions do I have on record?',
    'What treatments and medications have been prescribed to me?',
    'When was my most recent hospital admission?',
    'Are there any recorded follow-up instructions?'
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Ask About Your Health Record</h1>
        <p>Verified clinical answers synthesized strictly from your medical records and care timeline.</p>
      </div>

      {/* Suggestion Chips */}
      <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
        {presets.map((p, i) => (
          <button
            key={i}
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setQuery(p);
              handleAsk(p);
            }}
            disabled={loading}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Query Input */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <textarea
            id="patient-query-input"
            className="input"
            rows={3}
            placeholder="Type your question (e.g. 'What medications am I taking?')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            style={{ flex: 1, resize: 'vertical' }}
          />
          <button
            id="patient-query-submit"
            className="btn btn-primary"
            onClick={() => handleAsk()}
            disabled={loading || !query.trim()}
            style={{ alignSelf: 'flex-end', padding: 'var(--space-sm) var(--space-lg)' }}
          >
            {loading ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <>
                <Send size={16} /> Ask AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-container" style={{ minHeight: '180px' }}>
          <div className="spinner spinner-lg" />
          <span>Searching your medical records and synthesizing answer...</span>
        </div>
      )}

      {/* Response Card */}
      {response && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <ShieldCheck size={18} style={{ color: 'var(--accent-success)' }} />
                <span style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>Medical Answer</span>
              </div>

              <span className={`badge ${response.confidence_score >= 0.7 ? 'badge-green' : response.confidence_score >= 0.4 ? 'badge-amber' : 'badge-red'}`}>
                Confidence: {Math.round((response.confidence_score || 0) * 100)}%
              </span>
            </div>

            <div style={{ lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {response.answer}
            </div>

            <p style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-default)', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
              Disclaimer: This information is generated from your clinical records and knowledge graph. Always consult your healthcare provider for medical advice.
            </p>
          </div>

          {/* Evidence Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
            {response.document_evidence && response.document_evidence.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 700, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                  <FileText size={14} /> Referenced Clinical Notes
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', maxHeight: '240px', overflowY: 'auto' }}>
                  {response.document_evidence.map((doc, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-primary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      {doc.source_filename && <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>{doc.source_filename}:</strong>}
                      {doc.chunk_text || doc.text || doc.snippet}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {response.graph_evidence && response.graph_evidence.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 700, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                  <Share2 size={14} /> Verified Clinical Facts
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', maxHeight: '240px', overflowY: 'auto' }}>
                  {response.graph_evidence.map((g, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-primary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)' }}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{g.relationship || g.node_type}:</span>{' '}
                      <span style={{ color: 'var(--text-primary)' }}>{g.name || g.target}</span>
                      {g.temporal_status && <span className="badge badge-blue" style={{ marginLeft: '6px', fontSize: '10px' }}>{g.temporal_status}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
