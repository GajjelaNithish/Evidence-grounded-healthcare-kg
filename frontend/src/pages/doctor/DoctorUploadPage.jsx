import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function DoctorUploadPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(searchParams.get('patient') || '');
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const fileInputRef = useRef(null);
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
    setActiveJob(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatient) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', selectedPatient);

    try {
      setUploading(true);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Document uploaded. Ingestion pipeline initiated.');
      const jobId = res.data.job_id;
      setActiveJob({
        job_id: jobId,
        filename: file.name,
        status: 'pending',
        progress_message: 'Queued for processing...',
        chunks_indexed: 0,
        entities_extracted: 0,
      });

      pollJob(jobId);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Document upload failed.';
      toast.error(msg);
      setUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const pollJob = (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/documents/status/${jobId}`);
        const job = res.data;
        setActiveJob(job);

        if (job.status === 'completed') {
          clearInterval(interval);
          setUploading(false);
          toast.success(`Processing complete for ${job.filename}!`);
        } else if (job.status === 'failed') {
          clearInterval(interval);
          setUploading(false);
          toast.error(`Processing error: ${job.error_message || 'Failed'}`);
        }
      } catch {
        clearInterval(interval);
        setUploading(false);
      }
    }, 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Clinical Record Ingestion</h1>
        <p>Upload PDFs, clinical notes, and discharge reports for NLP extraction and graph enrichment.</p>
      </div>

      {/* Patient Selection */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600, fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Associate With Patient:
        </label>
        {loadingPatients ? (
          <div className="spinner" style={{ width: 16, height: 16 }} />
        ) : patients.length === 0 ? (
          <span style={{ color: 'var(--accent-warning)', fontSize: 'var(--font-sm)' }}>
            No assigned patients available.
          </span>
        ) : (
          <select
            id="upload-patient-select"
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

      {/* Upload Dropzone Card */}
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--accent-primary-glow)',
          color: 'var(--accent-primary)',
          marginBottom: 'var(--space-md)'
        }}>
          <Upload size={28} />
        </div>

        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
          Select Document for Ingestion
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', maxWidth: '440px', margin: '0 auto var(--space-lg) auto' }}>
          Supports PDF, TXT, MD, PNG, JPG, and JPEG. Files will be parsed with PyMuPDF/OCR, chunked, embedded with clinical vectors, and linked into the Neo4j knowledge graph.
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
          id="file-upload-input"
        />

        <button
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !selectedPatient}
          id="trigger-file-upload-btn"
          style={{ padding: 'var(--space-sm) var(--space-xl)' }}
        >
          {uploading ? (
            <>
              <div className="spinner" style={{ width: 16, height: 16 }} /> Processing Ingestion...
            </>
          ) : (
            <>
              <Upload size={16} /> Choose File to Upload
            </>
          )}
        </button>
      </div>

      {/* Active Processing Status */}
      {activeJob && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)', background: 'var(--bg-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <span className={`badge ${activeJob.status === 'completed' ? 'badge-green' : activeJob.status === 'failed' ? 'badge-red' : 'badge-blue'}`}>
                {activeJob.status.toUpperCase()}
              </span>
              <strong style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>{activeJob.filename}</strong>
            </div>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Job ID: {activeJob.job_id}</span>
          </div>

          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
            {activeJob.progress_message || 'Processing in progress...'}
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: 'var(--font-xs)' }}>
            <span>Chunks Indexed: <strong>{activeJob.chunks_indexed ?? 0}</strong></span>
            <span>Entities Extracted: <strong>{activeJob.entities_extracted ?? 0}</strong></span>
            <span>Nodes Created: <strong>{activeJob.nodes_created ?? 0}</strong></span>
            <span>Relationships: <strong>{activeJob.relationships_created ?? 0}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
