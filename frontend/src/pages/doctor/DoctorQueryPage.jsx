import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Send, ShieldCheck, FileText, Share2, ArrowLeft } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function DoctorQueryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(searchParams.get('patient') || '');
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [query, setQuery] = useState('');
  const [executing, setExecuting] = useState(false);
  const [response, setResponse] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      const res = await api.get('/kg/patients');
      const pts = res.data || [];
      setPatients(pts);

      const requestedPid = searchParams.get('patient');
      if (requestedPid && pts.some(p => p.patient_id === requestedPid)) {
        setSelectedPatient(requestedPid);
      } else if (pts.length > 0 && !selectedPatient) {
        setSelectedPatient(pts[0].patient_id);
      }
    } catch {
      toast.error('Failed to load patient cohort.');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handlePatientChange = (pid) => {
    setSelectedPatient(pid);
    setSearchParams({ patient: pid });
    setResponse(null);
  };

  const handleAsk = async (promptQuery) => {
    const textToAsk = promptQuery || query;
    if (!textToAsk.trim() || !selectedPatient) return;

    try {
      setExecuting(true);
      setResponse(null);
      const res = await api.post('/query', {
        patient_id: selectedPatient,
        query: textToAsk.trim()
      });
      setResponse(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Query execution failed.';
      toast.error(msg);
    } finally {
      setExecuting(false);
    }
  };

  const presets = [
    'What conditions has this patient been diagnosed with?',
    'Detail the administered treatments and their timeline.',
    'Summarize recent hospital admissions and outcomes.',
    'Does the patient show signs of diabetes or hypertension?'
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Clinical Q&A Explorer</h1>
        <p>Evidence-grounded hybrid retrieval across structured knowledge graph and vector documents.</p>
      </div>

      {/* Patient Selector Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600, fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Target Patient:
        </label>
        {loadingPatients ? (
          <div className="spinner" style={{ width: 16, height: 16 }} />
        ) : patients.length === 0 ? (
          <span style={{ color: 'var(--accent-warning)', fontSize: 'var(--font-sm)' }}>
            No assigned patients available.
          </span>
        ) : (
          <select
            id="query-patient-select"
            className="input"
            style={{ maxWidth: '320px' }}
            value={selectedPatient}
            onChange={(e) => handlePatientChange(e.target.value)}
          >
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.label || `Patient ${p.patient_id}`}
              </option>
            ))}
          </select>
        )}

        {selectedPatient && (
          <Link
            to={`/doctor/patients/${encodeURIComponent(selectedPatient)}`}
            style={{ fontSize: 'var(--font-sm)', color: 'var(--accent-primary)', textDecoration: 'none', marginLeft: 'auto' }}
          >
            View Patient Dossier &rarr;
          </Link>
        )}
      </div>

      {/* Preset Suggestions */}
      <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
        {presets.map((p, i) => (
          <button
            key={i}
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setQuery(p);
              handleAsk(p);
            }}
            disabled={executing || !selectedPatient}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Query Input Box */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <textarea
            id="doctor-query-input"
            className="input"
            rows={3}
            placeholder="Type clinical question for the selected patient..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={executing || !selectedPatient}
            style={{ flex: 1, resize: 'vertical' }}
          />
          <button
            id="doctor-query-submit"
            className="btn btn-primary"
            onClick={() => handleAsk()}
            disabled={executing || !query.trim() || !selectedPatient}
            style={{ alignSelf: 'flex-end', padding: 'var(--space-sm) var(--space-lg)' }}
          >
            {executing ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <>
                <Send size={16} /> Execute
              </>
            )}
          </button>
        </div>
      </div>

      {/* Query Results */}
      {executing && (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="spinner spinner-lg" />
          <span>Fusing graph & vector evidence, synthesizing clinical answer...</span>
        </div>
      )}

      {response && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <ShieldCheck size={18} style={{ color: 'var(--accent-success)' }} />
                <span style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>Synthesized Clinical Answer</span>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                <span className="badge badge-blue">Routing: {response.routing_decision || 'hybrid'}</span>
                {response.temporal_filter_applied && (
                  <span className="badge badge-purple">Temporal: {response.temporal_filter_applied}</span>
                )}
                <span className={`badge ${response.confidence_score >= 0.7 ? 'badge-green' : response.confidence_score >= 0.4 ? 'badge-amber' : 'badge-red'}`}>
                  Confidence: {Math.round((response.confidence_score || 0) * 100)}%
                </span>
              </div>
            </div>

            <div style={{ lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {response.answer}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
            <div className="card">
              <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <FileText size={16} /> Document Evidence ({response.document_evidence?.length ?? 0})
              </h3>
              {(!response.document_evidence || response.document_evidence.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>
                  No vector document passages retrieved for this query.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '300px', overflowY: 'auto' }}>
                  {response.document_evidence.map((doc, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-primary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-muted)' }}>
                        <span>Chunk #{doc.chunk_index ?? idx}</span>
                        <span>Score: {Number(doc.similarity_score ?? doc.score ?? 0).toFixed(3)}</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {doc.text || doc.snippet || JSON.stringify(doc)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Share2 size={16} /> Knowledge Graph Triples ({response.graph_evidence?.length ?? 0})
              </h3>
              {(!response.graph_evidence || response.graph_evidence.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>
                  No structured graph paths matched this query.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '300px', overflowY: 'auto' }}>
                  {response.graph_evidence.map((g, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-primary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)' }}>
                      <div style={{ color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '2px' }}>
                        {g.relationship || g.rel || 'RELATION'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {g.source || g.from || 'Source'} &rarr; <strong>{g.target || g.to || g.name || JSON.stringify(g)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
