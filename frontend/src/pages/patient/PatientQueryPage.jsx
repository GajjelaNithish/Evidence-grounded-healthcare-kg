import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function PatientQueryPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const patientId = user?.clinical_patient_id;

  if (!patientId) {
    return (
      <div className="empty-state-container">
        <h2 className="empty-state-heading">No medical record linked</h2>
        <p className="empty-state-text">
          Your account is not linked to a clinical patient record.
        </p>
      </div>
    );
  }

  const handleAsk = async (e) => {
    if (e) e.preventDefault();
    const queryText = question.trim();
    if (!queryText || loading) return;

    setLoading(true);
    try {
      const res = await api.post('/query', {
        patient_id: patientId,
        query: queryText,
      });
      setResponse(res.data);
    } catch (err) {
      setResponse({
        answer: 'We could not retrieve information for this inquiry. Please consult your physician directly.',
        document_evidence: [],
        graph_evidence: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAsk();
    }
  };

  const rawAnswer = response?.answer;
  const displayAnswer = rawAnswer && rawAnswer.startsWith('Clinical synthesis error:')
    ? 'Answer temporarily unavailable. Evidence is shown below.'
    : rawAnswer && rawAnswer.startsWith('INSUFFICIENT_EVIDENCE:')
    ? rawAnswer.replace('INSUFFICIENT_EVIDENCE:', '').trim()
    : rawAnswer;

  return (
    <div className="page-root">
      <div className="page-header-row">
        <h1 className="page-title">Ask about your health record</h1>
      </div>

      <div className="section-divider" />

      {/* Query Form */}
      <form onSubmit={handleAsk} className="qa-input-wrapper">
        <textarea
          className="qa-textarea"
          rows={3}
          placeholder="Ask a question about your conditions, treatments, or past visits…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="submit"
          className="qa-ask-inside-btn"
          disabled={loading || !question.trim()}
        >
          {loading ? <span className="css-spinner-inline" /> : 'Ask'}
        </button>
      </form>

      {/* Answer & Sources */}
      {response ? (
        <div className="qa-response-area">
          <section className="qa-section-block">
            <h3 className="section-title">Answer</h3>
            <div className="section-divider" />

            <div className="qa-answer-text">
              {displayAnswer}
            </div>
          </section>

          {/* Sources for patients (clean, non-technical) */}
          {((response.graph_evidence && response.graph_evidence.length > 0) ||
            (response.document_evidence && response.document_evidence.length > 0)) && (
            <section className="qa-section-block">
              <h3 className="section-title">Sources</h3>
              <div className="section-divider" />

              <div className="patient-sources-list">
                {response.graph_evidence?.map((g, idx) => (
                  <div key={`pg-${idx}`} className="patient-source-item" style={{ padding: '8px 0', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', borderBottom: 'var(--divider)' }}>
                    From your medical record ({g.name || g.relationship || 'Health history'})
                  </div>
                ))}

                {response.document_evidence?.map((d, idx) => (
                  <div key={`pd-${idx}`} className="patient-source-item" style={{ padding: '8px 0', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', borderBottom: 'var(--divider)' }}>
                    From uploaded documents · {d.source_filename}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="qa-initial-state">
          <p className="empty-state-text">
            Ask a question to receive plain-language explanations verified against your medical record.
          </p>
        </div>
      )}
    </div>
  );
}
