import React, { useState } from 'react';
import api from '../../../api';

export default function QA({ patientId }) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [history, setHistory] = useState([]);

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
      setCurrentResponse(responseData);

      const now = new Date();
      const timeStr = `${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

      setHistory((prev) => [
        {
          question: queryText,
          answer: responseData.answer,
          timestamp: timeStr,
        },
        ...prev.slice(0, 9),
      ]);

      setQuestion('');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Query execution failed.';
      setCurrentResponse({
        answer: `INSUFFICIENT_EVIDENCE: ${msg}`,
        confidence_score: 0,
        graph_evidence: [],
        document_evidence: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAsk();
    }
  };

  const getScoreColorClass = (score) => {
    if (score >= 0.8) return 'score-high';
    if (score >= 0.5) return 'score-medium';
    return 'score-low';
  };

  const answer = currentResponse?.answer;
  const displayAnswer = answer && answer.startsWith('Clinical synthesis error:')
    ? 'Answer temporarily unavailable. Evidence is shown below.'
    : answer && answer.startsWith('INSUFFICIENT_EVIDENCE:')
    ? answer.replace('INSUFFICIENT_EVIDENCE:', '').trim()
    : answer;

  const isInsufficient = answer && (answer.startsWith('INSUFFICIENT_EVIDENCE:') || answer.startsWith('Clinical synthesis error:'));

  return (
    <div className="qa-tab-container">
      {/* Question Form */}
      <section className="qa-query-section">
        <h2 className="section-title">Clinical query</h2>
        <div className="section-divider" />

        <form onSubmit={handleAsk} className="qa-input-wrapper">
          <textarea
            className="qa-textarea"
            rows={3}
            placeholder="Ask a clinical question about this patient…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="qa-ask-inside-btn"
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? <span className="css-spinner-inline" /> : 'Ask'}
          </button>
        </form>
      </section>

      {/* Answer & Evidence */}
      {currentResponse ? (
        <div className="qa-response-area">
          {/* Answer Section */}
          <section className="qa-section-block">
            <h3 className="section-title">Answer</h3>
            <div className="section-divider" />

            <div className={`qa-answer-text ${isInsufficient ? 'answer-insufficient-box' : ''}`}>
              {displayAnswer}
            </div>
          </section>

          {/* Evidence Section */}
          {((currentResponse.graph_evidence && currentResponse.graph_evidence.length > 0) ||
            (currentResponse.document_evidence && currentResponse.document_evidence.length > 0)) && (
            <section className="qa-section-block">
              <h3 className="section-title">Evidence</h3>
              <div className="section-divider" />

              <div className="qa-evidence-list">
                {/* Graph Evidence */}
                {currentResponse.graph_evidence?.map((item, idx) => (
                  <div key={`g-${idx}`} className="qa-evidence-row">
                    <div className="qa-evidence-left">
                      <span className="evidence-badge badge-graph">GRAPH</span>
                      <div className="qa-evidence-content">
                        <span>
                          {item.node_type || 'Patient'} → {item.relationship} → {item.name}
                        </span>
                        {item.valid_from && (
                          <div className="qa-evidence-subtext">
                            valid {item.valid_from}
                            {item.valid_to ? ` – ${item.valid_to}` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className={`qa-evidence-score ${getScoreColorClass(item.score ?? item.confidence ?? 0.9)}`}>
                      {((item.score ?? item.confidence ?? 1.0)).toFixed(2)}
                    </span>
                  </div>
                ))}

                {/* Document Evidence */}
                {currentResponse.document_evidence?.map((item, idx) => (
                  <div key={`d-${idx}`} className="qa-evidence-row doc-evidence-row">
                    <div className="qa-evidence-left">
                      <span className="evidence-badge badge-doc">DOC</span>
                      <div className="qa-evidence-content">
                        <span>
                          {item.source_filename}
                        </span>
                        {item.chunk_text && (
                          <blockquote className="qa-doc-blockquote">
                            "{item.chunk_text.slice(0, 120)}
                            {item.chunk_text.length > 120 ? '...' : ''}"
                          </blockquote>
                        )}
                      </div>
                    </div>

                    <span className={`qa-evidence-score ${getScoreColorClass(item.score ?? 0.7)}`}>
                      {(item.score ?? 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {currentResponse.confidence_score !== undefined && (
                <div className="qa-confidence-footer">
                  Confidence: {currentResponse.confidence_score.toFixed(2)}
                </div>
              )}
            </section>
          )}

          {/* Previous Queries Section */}
          {history.length > 0 && (
            <section className="qa-section-block">
              <h3 className="section-title">Previous queries</h3>
              <div className="section-divider" />

              <div className="qa-history-list">
                {history.map((h, i) => {
                  const isErr = h.answer && (h.answer.startsWith('Clinical synthesis error:') || h.answer.startsWith('INSUFFICIENT_EVIDENCE:'));
                  const histDisplay = isErr ? '—' : h.answer;
                  return (
                    <div key={i} className="qa-history-item">
                      <div className="qa-history-header">
                        <span className="qa-history-question">{h.question}</span>
                        <span className="qa-history-time">{h.timestamp}</span>
                      </div>
                      <div className="qa-history-answer">{histDisplay}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="qa-initial-state">
          <p className="empty-state-text">
            Ask a question to retrieve evidence-grounded answers from this patient's knowledge graph and uploaded documents.
          </p>
        </div>
      )}
    </div>
  );
}
