import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, FileText, ArrowRight, Upload, Stethoscope, AlertCircle } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const toast = useToast();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/kg/patients');
      setPatients(res.data || []);
    } catch (err) {
      toast.error('Failed to load assigned patients.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = patients.filter((p) =>
    p.patient_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.label?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1>Assigned Patients</h1>
        <p>Comprehensive knowledge graph dossiers and clinical insights for your patient cohort.</p>
      </div>

      {/* Quick Action Header Bar */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={16} />
          <input
            id="patient-search"
            className="input"
            placeholder="Search patient ID or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link to="/doctor/query" className="btn btn-secondary" id="direct-query-btn">
            <Search size={16} /> Clinical Q&A
          </Link>
          <Link to="/doctor/upload" className="btn btn-primary" id="direct-upload-btn">
            <Upload size={16} /> Upload Record
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="loading-container" style={{ minHeight: '300px' }}>
          <div className="spinner spinner-lg" />
          <span style={{ color: 'var(--text-secondary)' }}>Loading patient roster...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-xl)' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--accent-primary-glow)',
            color: 'var(--accent-primary)',
            marginBottom: 'var(--space-md)'
          }}>
            <Stethoscope size={24} />
          </div>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
            {search ? 'No Matching Patients Found' : 'No Patients Assigned'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto var(--space-lg) auto', fontSize: 'var(--font-sm)' }}>
            {search
              ? 'Try modifying your search criteria to match patient ID or demographics.'
              : 'You do not have any patients assigned to your roster currently. Please contact your system administrator to assign patients to your profile.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--space-lg)'
        }}>
          {filtered.map((patient) => (
            <div key={patient.patient_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <span className="badge badge-blue" style={{ fontFamily: 'monospace', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-xs)', display: 'inline-block' }}>
                      PID: {patient.patient_id}
                    </span>
                    <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {patient.label || `Patient ${patient.patient_id}`}
                    </h3>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                marginTop: 'var(--space-lg)',
                paddingTop: 'var(--space-md)',
                borderTop: '1px solid var(--border-default)'
              }}>
                <Link
                  to={`/doctor/patients/${encodeURIComponent(patient.patient_id)}`}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  id={`view-dossier-${patient.patient_id}`}
                >
                  View Dossier <ArrowRight size={14} />
                </Link>
                <Link
                  to={`/doctor/query?patient=${encodeURIComponent(patient.patient_id)}`}
                  className="btn btn-icon btn-secondary"
                  title="Ask Clinical Question"
                  id={`query-patient-${patient.patient_id}`}
                >
                  <Search size={16} />
                </Link>
                <Link
                  to={`/doctor/upload?patient=${encodeURIComponent(patient.patient_id)}`}
                  className="btn btn-icon btn-secondary"
                  title="Upload Document"
                  id={`upload-patient-${patient.patient_id}`}
                >
                  <Upload size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
