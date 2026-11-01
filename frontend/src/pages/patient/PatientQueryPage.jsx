import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { PageHeader, FormattedAnswer, EmptyState } from '../../components/ui';
import { IconMessage2, IconSend, IconSparkles, IconShieldCheck, IconFileText } from '@tabler/icons-react';

export default function PatientQueryPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const patientId = user?.clinical_patient_id;

  if (!patientId) {
    return (
      <div className="page-root">
        <EmptyState
          title="No medical record linked"
          description="Your account is not linked to a clinical patient dossier."
          icon={IconMessage2}
        />
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

  const quickQuestions = [
    'What medications and dosages are currently prescribed to me?',
    'What conditions have been diagnosed in my clinical record?',
    'What was the summary and outcome of my last hospital visit?',
    'What are my latest laboratory test results?'
  ];

  const rawAnswer = response?.answer;
  const displayAnswer = rawAnswer && rawAnswer.startsWith('Clinical synthesis error:')
    ? 'Answer temporarily unavailable. Evidence is shown below.'
    : rawAnswer && rawAnswer.startsWith('INSUFFICIENT_EVIDENCE:')
    ? rawAnswer.replace('INSUFFICIENT_EVIDENCE:', '').trim()
    : rawAnswer;

  return (
    <div className="page-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
      <PageHeader
        title="Ask About Your Health Record"
        description="Receive clear, plain-language answers grounded strictly in your personal medical record and clinical documents."
      />

      {/* Suggested Questions Chips */}
      <div>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
          Suggested Inquiries
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setQuestion(q)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                fontSize: '0.82rem',
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
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Query Form */}
      <form onSubmit={handleAsk} style={{ position: 'relative' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <textarea
            rows={3}
            placeholder="Ask a question about your conditions, treatments, medications, or past visits…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '1rem',
              color: 'var(--text-primary)',
              fontSize: '0.92rem',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.6rem 1rem',
              background: 'rgba(0, 0, 0, 0.2)',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Press Ctrl+Enter to submit
            </span>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !question.trim()}
              style={{ padding: '0.45rem 1rem' }}
            >
              {loading ? (
                <>
                  <span className="spinner spinner-sm" style={{ width: '14px', height: '14px' }} />
                  <span>Searching Records...</span>
                </>
              ) : (
                <>
                  <IconSend size={15} />
                  <span>Ask ClinicalKG</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Answer & Sources */}
      {response ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Answer Card */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconSparkles size={18} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  ClinicalKG Answer
                </h3>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '0.72rem',
                  fontWeight: 500
                }}
              >
                <IconShieldCheck size={12} /> Verified from Medical Record
              </span>
            </div>

            <FormattedAnswer text={displayAnswer} />
          </div>

          {/* Sources for patients */}
          {((response.graph_evidence && response.graph_evidence.length > 0) ||
            (response.document_evidence && response.document_evidence.length > 0)) && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem'
              }}
            >
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Verified Evidence Sources ({((response.graph_evidence?.length || 0) + (response.document_evidence?.length || 0))})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {response.graph_evidence?.map((g, idx) => (
                  <div
                    key={`pg-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <IconShieldCheck size={15} style={{ color: 'var(--accent-primary)', shrink: 0 }} />
                    <span>From your validated medical history: <strong>{g.name || g.relationship || 'Health history'}</strong></span>
                  </div>
                ))}

                {response.document_evidence?.map((d, idx) => (
                  <div
                    key={`pd-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <IconFileText size={15} style={{ color: 'var(--accent-secondary)', shrink: 0 }} />
                    <span>From uploaded clinical note: <code>{d.source_filename}</code></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="Ask any health question"
          description="Type your inquiry or click a suggested question above to retrieve validated answers from your medical records."
          icon={IconMessage2}
        />
      )}
    </div>
  );
}
