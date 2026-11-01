import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Sparkles, MessageSquare, Clock, FileText, Database } from 'lucide-react';
import api from '../../../api';
import { FormattedAnswer } from '../../../components/ui';

export default function QA({ patientId }) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTurn, setActiveTurn] = useState(null);
  const [history, setHistory] = useState([]);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const handleAsk = async (e) => {
    if (e) e.preventDefault();
    const queryText = question.trim();
    if (!queryText || isLoading) return;

    setIsLoading(true);

    try {
      const res = await api.post('/query', {
        patient_id: patientId,
        query: queryText,
      });

      const responseData = res.data;
      const now = new Date();
      const timeStr = `${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

      const turn = {
        question: queryText,
        response: responseData,
        timestamp: timeStr,
      };

      setActiveTurn(turn);
      setHistory((prev) => [turn, ...prev]);
      setQuestion('');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Query execution failed.';
      const now = new Date();
      const timeStr = `${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

      const fallbackTurn = {
        question: queryText,
        response: {
          answer: `INSUFFICIENT_EVIDENCE: ${msg}`,
          confidence_score: 0,
          graph_evidence: [],
          document_evidence: [],
          routing_decision: 'insufficient_evidence',
        },
        timestamp: timeStr,
      };

      setActiveTurn(fallbackTurn);
      setHistory((prev) => [fallbackTurn, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  // Format answer text into clean paragraphs/bullets
  const renderFormattedAnswer = (rawAnswer) => {
    if (!rawAnswer) return null;
    return <FormattedAnswer text={rawAnswer} />;
  };

  const graphEv = activeTurn?.response?.graph_evidence || [];
  const docEv = activeTurn?.response?.document_evidence || [];
  const isInsufficient = activeTurn?.response?.routing_decision === 'insufficient_evidence' ||
    activeTurn?.response?.answer?.startsWith('INSUFFICIENT_EVIDENCE:') ||
    activeTurn?.response?.answer?.includes('Insufficient Evidence Notice');

  return (
    <div className="qa-tab-container">
      {/* Clinician Query Form */}
      <section className="qa-query-section">
        <div className="section-header-row">
          <h2 className="section-title">Clinical Q&A Interface</h2>
          <span className="qa-subtitle-badge">Evidence-Grounded Retrieval</span>
        </div>
        <div className="section-divider" />

        <form onSubmit={handleAsk} className="qa-input-wrapper">
          <textarea
            className="qa-textarea"
            rows={3}
            placeholder="Ask a clinical question about this patient (e.g., 'What medications was this patient prescribed?', 'What condition did the patient have in 2024?')"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <div className="qa-input-footer">
            <span className="qa-keyboard-hint">Press Enter to submit</span>
            <button
              type="submit"
              className="qa-ask-inside-btn"
              disabled={isLoading || !question.trim()}
            >
              {isLoading ? (
                <>
                  <span className="css-spinner-inline" />
                  <span>Retrieving...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Ask ClinicalKG</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Clinical Prompts */}
        <div style={{ marginTop: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              'Current active medications & dosages',
              'Timeline of diagnoses & chronic conditions',
              'Recent laboratory & investigation findings',
              'Hospital admissions & discharge summary'
            ].map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuestion(promptText)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 12px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'var(--bg-card)';
                }}
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Active Conversation Turn */}
      {activeTurn ? (
        <div className="qa-response-area">
          <section className="qa-conversation-card">
            {/* 1. Clinician Question (Stays Visible) */}
            <div className="qa-turn-question">
              <div className="qa-author-row">
                <span className="qa-author-tag author-user">YOU</span>
                <span className="qa-timestamp">{activeTurn.timestamp}</span>
              </div>
              <h3 className="qa-user-question-text">{activeTurn.question}</h3>
            </div>

            <div className="qa-turn-divider" />

            {/* 2. ClinicalKG Grounded Answer */}
            <div className="qa-turn-answer">
              <div className="qa-author-row">
                <span className="qa-author-tag author-system">CLINICALKG</span>
                {activeTurn.response?.temporal_filter_applied && (
                  <span className="qa-meta-pill pill-temporal">
                    ⏱ {activeTurn.response.temporal_filter_applied}
                  </span>
                )}
              </div>

              <div className="qa-answer-body">
                {renderFormattedAnswer(activeTurn.response?.answer)}
              </div>
            </div>

            {/* 3. Clean Key Evidence Summary (Default Display) */}
            {!isInsufficient && (graphEv.length > 0 || docEv.length > 0) && (
              <div className="qa-key-evidence-section">
                <h4 className="key-evidence-title">
                  <Database size={15} /> Key Evidence Sources
                </h4>

                <div className="key-evidence-grid">
                  {/* Graph Facts */}
                  {graphEv.map((item, idx) => (
                    <div key={`g-summary-${idx}`} className="key-evidence-card card-graph">
                      <div className="card-header">
                        <span className="evidence-badge badge-graph">{item.node_type || 'Graph Fact'}</span>
                        {item.valid_from && (
                          <span className="evidence-date">{item.valid_from}{item.valid_to ? ` – ${item.valid_to}` : ''}</span>
                        )}
                      </div>
                      <div className="card-body">
                        <strong className="evidence-name">{item.name}</strong>
                        {item.details?.medication && (
                          <p className="evidence-detail">Medication: {item.details.medication}</p>
                        )}
                        {item.details?.diagnosis && (
                          <p className="evidence-detail">Diagnosis: {item.details.diagnosis}</p>
                        )}
                        {item.details?.treatment && (
                          <p className="evidence-detail">Treatment: {item.details.treatment}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Document Passages */}
                  {docEv.map((item, idx) => (
                    <div key={`d-summary-${idx}`} className="key-evidence-card card-doc">
                      <div className="card-header">
                        <span className="evidence-badge badge-doc">Clinical Document</span>
                        <span className="evidence-filename"><FileText size={12} /> {item.source_filename}</span>
                      </div>
                      <div className="card-body">
                        <blockquote className="evidence-excerpt">
                          "{item.chunk_text?.slice(0, 140)}{item.chunk_text?.length > 140 ? '...' : ''}"
                        </blockquote>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Progressive Disclosure: Hide Technical Noise by Default */}
            <div className="qa-progressive-disclosure">
              <button
                type="button"
                className="qa-disclosure-toggle-btn"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              >
                <span>{showTechnicalDetails ? 'Hide Technical Metadata & Scores' : 'View Technical Metadata & Scores'}</span>
                {showTechnicalDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showTechnicalDetails && (
                <div className="qa-technical-details-panel">
                  <div className="tech-meta-row">
                    <span className="tech-label">Routing Decision:</span>
                    <span className={`tech-value pill-routing pill-routing-${activeTurn.response?.routing_decision?.replace('_', '-')}`}>
                      {activeTurn.response?.routing_decision}
                    </span>
                  </div>
                  <div className="tech-meta-row">
                    <span className="tech-label">Fused Confidence Score:</span>
                    <span className="tech-value">
                      {typeof activeTurn.response?.confidence_score === 'number'
                        ? activeTurn.response.confidence_score.toFixed(3)
                        : 'N/A'}
                    </span>
                  </div>
                  {activeTurn.response?.temporal_filter_applied && (
                    <div className="tech-meta-row">
                      <span className="tech-label">Temporal Filter:</span>
                      <span className="tech-value">{activeTurn.response.temporal_filter_applied}</span>
                    </div>
                  )}

                  {/* Raw Graph Nodes */}
                  {graphEv.length > 0 && (
                    <div className="tech-raw-block">
                      <h5>Neo4j Knowledge Graph Nodes ({graphEv.length})</h5>
                      <ul>
                        {graphEv.map((g, i) => (
                          <li key={i}>
                            <code>[{g.node_type}] {g.name}</code> (relationship: {g.relationship}, score: {g.score ?? 1.0})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Raw Document Chunks */}
                  {docEv.length > 0 && (
                    <div className="tech-raw-block">
                      <h5>FAISS Vector Chunks ({docEv.length})</h5>
                      <ul>
                        {docEv.map((d, i) => (
                          <li key={i}>
                            <code>{d.source_filename}</code> (chunk #{d.chunk_index}, relevance score: {d.score?.toFixed(3)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Conversation History Timeline */}
          {history.length > 1 && (
            <section className="qa-section-block qa-history-section">
              <h3 className="section-title"><Clock size={16} /> Conversation History</h3>
              <div className="section-divider" />

              <div className="qa-history-timeline">
                {history.map((h, i) => {
                  const isActive = h === activeTurn;
                  return (
                    <div
                      key={i}
                      className={`qa-history-card ${isActive ? 'active-history-card' : ''}`}
                      onClick={() => setActiveTurn(h)}
                    >
                      <div className="history-card-header">
                        <span className="history-q-text"><MessageSquare size={14} /> {h.question}</span>
                        <span className="history-time">{h.timestamp}</span>
                      </div>
                      <div className="history-card-preview">
                        {h.response?.answer?.startsWith('INSUFFICIENT_EVIDENCE:')
                          ? '⚠ Insufficient evidence'
                          : h.response?.answer?.slice(0, 90) + '...'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="qa-initial-state">
          <div className="empty-state-card">
            <Sparkles size={28} className="empty-icon" />
            <h3>Evidence-Grounded Clinical Q&A</h3>
            <p>
              Ask a question above to retrieve validated clinical evidence from this patient's longitudinal knowledge graph and uploaded document records.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
