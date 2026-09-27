import React, { useState, useRef, useEffect } from 'react';
import api from '../../../api';

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

  const handleUpload = async (e) => {
    e.preventDefault();
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
    }
  };

  const pollJob = (jobId) => {
    if (pollersRef.current[jobId]) clearInterval(pollersRef.current[jobId]);

    pollersRef.current[jobId] = setInterval(async () => {
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
    }, 3000);
  };

  // Combine server documents with optimistic active jobs
  const allDocs = [...documents];
  Object.values(activeJobs).forEach((activeJob) => {
    const existingIdx = allDocs.findIndex((d) => d.job_id === activeJob.job_id);
    if (existingIdx >= 0) {
      allDocs[existingIdx] = activeJob;
    } else {
      allDocs.unshift(activeJob);
    }
  });

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
        <div className="empty-state-container" style={{ marginTop: '16px' }}>
          <p className="empty-state-text">
            No documents uploaded for this patient. Use Upload to add clinical notes or discharge summaries.
          </p>
        </div>
      ) : (
        <div className="documents-list-rows" style={{ display: 'flex', flexDirection: 'column' }}>
          {allDocs.map((doc) => {
            const isProcessing = doc.status === 'pending' || doc.status === 'processing';
            const isCompleted = doc.status === 'completed';
            const isFailed = doc.status === 'failed';

            return (
              <div key={doc.job_id} className="document-row-item" style={{ padding: '16px 0', borderBottom: 'var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="document-row-left">
                  <div className="document-row-filename" style={{ fontSize: 'var(--font-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>{doc.filename}</div>
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

                <div className="document-row-right" style={{ textAlign: 'right' }}>
                  <div className="document-row-status" style={{ fontSize: 'var(--font-sm)', fontWeight: 'var(--weight-medium)' }}>
                    {isCompleted && <span style={{ color: 'var(--color-success, #22c55e)' }}>Processed</span>}
                    {isProcessing && (
                      <span style={{ color: 'var(--accent-primary, #3b82f6)' }}>
                        Processing…
                      </span>
                    )}
                    {isFailed && <span style={{ color: 'var(--color-danger, #ef4444)' }}>Failed</span>}
                  </div>
                  <div className="document-row-date" style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recent'}
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

            <form onSubmit={handleUpload}>
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
                  type="submit"
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
