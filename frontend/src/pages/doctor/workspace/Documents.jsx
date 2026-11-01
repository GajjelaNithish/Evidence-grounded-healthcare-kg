import React, { useState, useRef, useEffect } from 'react';
import { IconFileText, IconUpload, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import api from '../../../api';
import { StatusBadge, EmptyState } from '../../../components/ui';

export default function Documents({ patientId, documents, onRefetch }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [activeJobs, setActiveJobs] = useState({});
  const fileInputRef = useRef(null);
  const pollersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(pollersRef.current).forEach((interval) => clearInterval(interval));
    };
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patient_id', patientId);

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const jobId = res.data.job_id;
      const initialJob = {
        job_id: jobId,
        filename: selectedFile.name,
        status: 'pending',
        progress_message: 'Extracting clinical entities...',
        created_at: new Date().toISOString(),
      };

      setActiveJobs((prev) => ({ ...prev, [jobId]: initialJob }));
      setIsModalOpen(false);
      setSelectedFile(null);
      setUploading(false);

      pollJob(jobId);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to upload document.';
      setError(msg);
      setUploading(false);
      // Keep modal open so user can see the error
    }
  };

  const pollJob = (jobId) => {
    if (pollersRef.current[jobId]) clearInterval(pollersRef.current[jobId]);

    const checkStatus = async () => {
      try {
        const res = await api.get(`/documents/status/${jobId}`);
        const job = res.data;

        setActiveJobs((prev) => ({ ...prev, [jobId]: job }));

        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(pollersRef.current[jobId]);
          delete pollersRef.current[jobId];
          if (onRefetch) onRefetch();
        }
      } catch (err) {
        clearInterval(pollersRef.current[jobId]);
        delete pollersRef.current[jobId];
      }
    };

    // Immediate status check, then poll every 2 seconds
    checkStatus();
    pollersRef.current[jobId] = setInterval(checkStatus, 2000);
  };

  // Combine server documents with optimistic active jobs
  const safeDocs = Array.isArray(documents) ? [...documents] : [];
  const activeList = activeJobs && typeof activeJobs === 'object' ? Object.values(activeJobs) : [];

  activeList.forEach((activeJob) => {
    if (!activeJob) return;
    const targetId = activeJob.job_id || activeJob.document_id;
    const existingIdx = safeDocs.findIndex(
      (d) => d && (d.document_id || d.job_id) === targetId
    );
    if (existingIdx >= 0) {
      safeDocs[existingIdx] = { ...safeDocs[existingIdx], ...activeJob };
    } else {
      safeDocs.unshift(activeJob);
    }
  });

  const allDocs = safeDocs;

  return (
    <div className="documents-container">
      {/* Heading row with top-right action button */}
      <div className="documents-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="section-title">Clinical documents</h2>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn-secondary-action"
        >
          Upload document ↑
        </button>
      </div>

      <div className="section-divider" style={{ marginBottom: '32px' }} />

      {/* Document rows */}
      {allDocs.length === 0 ? (
        <EmptyState
          title="No documents uploaded"
          description="No clinical records or discharge summaries have been uploaded for this patient yet."
          icon={IconFileText}
          action={
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
            >
              <IconUpload size={16} /> Upload First Document
            </button>
          }
        />
      ) : (
        <div className="documents-list-rows" style={{ display: 'flex', flexDirection: 'column' }}>
          {allDocs.map((doc, index) => {
            if (!doc) return null;
            const docKey = doc.document_id || doc.job_id || `doc-${index}`;
            const isProcessing = doc.status === 'pending' || doc.status === 'processing';
            const isCompleted = doc.status === 'completed';
            const isFailed = doc.status === 'failed';
            const uploadDate = doc.upload_date || doc.created_at;

            return (
              <div key={docKey} className="document-row-item" style={{ padding: '16px 0', borderBottom: 'var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="document-row-left">
                  <div className="document-row-filename" style={{ fontSize: 'var(--font-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>{doc.filename}</div>

                  {/* Provenance badge row */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {doc.encounter_id && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: 'var(--font-xs)', fontWeight: 'var(--weight-medium)',
                        background: 'rgba(6, 182, 212, 0.12)', color: '#06B6D4',
                        border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '4px',
                        padding: '2px 8px'
                      }}>
                        Encounter: {doc.encounter_id}
                      </span>
                    )}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: 'var(--font-xs)',
                      color: 'var(--text-muted)'
                    }}>
                      {doc.patient_id || ''}
                    </span>
                  </div>

                  <div className="document-row-meta" style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {isProcessing ? (
                      <span>{doc.progress_message || 'Extracting entities...'}</span>
                    ) : isCompleted ? (
                      <span>
                        {doc.chunks_indexed ?? 0} chunks indexed · {doc.entities_extracted ?? 0} entities extracted
                      </span>
                    ) : isFailed ? (
                      <span className="text-danger">{doc.error_message || 'Processing failed'}</span>
                    ) : (
                      <span>{doc.chunks_indexed ?? 0} chunks indexed</span>
                    )}
                  </div>
                </div>

                <div className="document-row-right" style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <StatusBadge status={doc.status || 'completed'} />
                  <div className="document-row-date" style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                    {uploadDate ? new Date(uploadDate).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-title">Upload clinical document</h3>

            <form onSubmit={(e) => e.preventDefault()}>
              <div className="modal-file-select-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.md"
                />
                <button
                  type="button"
                  className="btn-secondary-action modal-choose-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? selectedFile.name : 'Choose file'}
                </button>
                <span className="modal-file-hint">PDF, PNG, JPG up to 10MB</span>
              </div>

              {error && <div className="login-inline-error modal-error">{error}</div>}

              <div className="modal-actions-row">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedFile(null);
                    setError(null);
                  }}
                  className="btn-secondary-action"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  className="btn-primary-action"
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
