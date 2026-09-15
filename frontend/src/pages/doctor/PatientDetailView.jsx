import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  HeartPulse, Clock, Share2, FileText, Search, Upload,
  Calendar, CheckCircle, AlertTriangle, ChevronRight,
  Database, RefreshCw, Send, ArrowLeft, Layers, ShieldCheck
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

export default function PatientDetailView() {
  const { patientId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/kg/analytics/${patientId}`);
      setAnalytics(res.data);
    } catch (err) {
      toast.error('Failed to load patient profile.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-lg" />
        <span style={{ color: 'var(--text-secondary)' }}>Loading patient record {patientId}...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation breadcrumb */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <Link to="/doctor" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Patient List
        </Link>
      </div>

      {/* Patient Header Banner */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
              <span className="badge badge-blue" style={{ fontFamily: 'monospace', fontSize: 'var(--font-sm)' }}>
                PID: {patientId}
              </span>
              <span className="badge badge-green">Active Record</span>
            </div>
            <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>
              Patient #{patientId}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-xs)' }}>
              Age: <strong style={{ color: 'var(--text-primary)' }}>{analytics?.age ?? 'N/A'}</strong> &bull;{' '}
              Gender: <strong style={{ color: 'var(--text-primary)' }}>{analytics?.gender ?? 'N/A'}</strong> &bull;{' '}
              State/Region: <strong style={{ color: 'var(--text-primary)' }}>{analytics?.state ?? 'N/A'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-secondary" onClick={fetchPatientData} title="Refresh records">
              <RefreshCw size={14} /> Sync
            </button>
            <button className="btn btn-primary" onClick={() => setActiveTab('qa')}>
              <Search size={14} /> Ask Clinical AI
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-md)',
          marginTop: 'var(--space-xl)',
          borderBottom: '1px solid var(--border-default)',
          overflowX: 'auto'
        }}>
          <TabButton id="tab-overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<HeartPulse size={16} />} label="Overview" />
          <TabButton id="tab-timeline" active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} icon={<Clock size={16} />} label="Timeline" />
          <TabButton id="tab-graph" active={activeTab === 'graph'} onClick={() => setActiveTab('graph')} icon={<Share2 size={16} />} label="Knowledge Graph" />
          <TabButton id="tab-documents" active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} icon={<FileText size={16} />} label="Documents & Upload" />
          <TabButton id="tab-qa" active={activeTab === 'qa'} onClick={() => setActiveTab('qa')} icon={<Search size={16} />} label="Clinical Q&A" />
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && <OverviewTab analytics={analytics} onNavigateTab={setActiveTab} />}
      {activeTab === 'timeline' && <TimelineTab patientId={patientId} />}
      {activeTab === 'graph' && <KnowledgeGraphTab patientId={patientId} />}
      {activeTab === 'documents' && <DocumentsTab patientId={patientId} />}
      {activeTab === 'qa' && <ClinicalQATab patientId={patientId} />}
    </div>
  );
}

function TabButton({ id, active, onClick, icon, label }) {
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-sm) var(--space-md)',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 400,
        fontSize: 'var(--font-sm)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap'
      }}
    >
      {icon} {label}
    </button>
  );
}

/* -------------------------------------------------------------
   OVERVIEW TAB
------------------------------------------------------------- */
function OverviewTab({ analytics, onNavigateTab }) {
  return (
    <div>
      <div className="stat-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' }}>
            <HeartPulse size={22} />
          </div>
          <div>
            <div className="stat-value">{analytics?.condition_count ?? 0}</div>
            <div className="stat-label">Diagnosed Conditions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-secondary-glow)', color: 'var(--accent-secondary)' }}>
            <Database size={22} />
          </div>
          <div>
            <div className="stat-value">{analytics?.treatment_count ?? 0}</div>
            <div className="stat-label">Prescribed Treatments</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-warning-glow)', color: 'var(--accent-warning)' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div className="stat-value">{analytics?.admission_count ?? 0}</div>
            <div className="stat-label">Hospital Admissions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-success-glow)', color: 'var(--accent-success)' }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="stat-value">{analytics?.indexed_document_chunks ?? 0}</div>
            <div className="stat-label">Indexed Vector Chunks</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
        <div className="card">
          <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            Inpatient & Care Economics
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--border-default)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Cumulative Length of Stay</span>
              <strong style={{ color: 'var(--text-primary)' }}>{analytics?.total_length_of_stay_days ?? 0} Days</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--border-default)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Cumulative Treatment Expense</span>
              <strong style={{ color: 'var(--text-primary)' }}>INR {Number(analytics?.total_treatment_cost_inr ?? 0).toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Primary State Jurisdiction</span>
              <strong style={{ color: 'var(--text-primary)' }}>{analytics?.state || 'Unknown'}</strong>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
              Integrated Patient Workflows
            </h2>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              Explore the interconnected graph representations, temporal health events, and run evidence-grounded queries.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => onNavigateTab('timeline')}>
              <Clock size={14} /> Open Timeline
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigateTab('graph')}>
              <Share2 size={14} /> Explore Subgraph
            </button>
            <button className="btn btn-primary" onClick={() => onNavigateTab('qa')}>
              <Search size={14} /> Start Clinical Q&A
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
   TIMELINE TAB
------------------------------------------------------------- */
function TimelineTab({ patientId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const toast = useToast();

  useEffect(() => {
    fetchTimeline();
  }, [patientId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/kg/timeline/${patientId}`);
      setEvents(res.data || []);
    } catch {
      toast.error('Failed to load patient timeline events.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = events.filter((e) => {
    if (filter === 'ALL') return true;
    return e.event_type === filter;
  });

  const getEventBadge = (type) => {
    switch (type) {
      case 'Condition Diagnosis': return 'badge-amber';
      case 'Treatment Course': return 'badge-blue';
      case 'Hospital Admission': return 'badge-purple';
      default: return 'badge-blue';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>Chronological Clinical Timeline</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Bi-temporal tracking of diagnoses, treatments, and hospital encounters
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          {['ALL', 'Condition Diagnosis', 'Treatment Course', 'Hospital Admission'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f === 'ALL' ? 'All Encounters' : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-container" style={{ minHeight: '300px' }}>
          <div className="spinner spinner-lg" />
          <span>Retrieving chronological history...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }} />
          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>No Timeline Events Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            {filter === 'ALL'
              ? 'No clinical events have been recorded for this patient in the knowledge graph.'
              : `No events matching '${filter}' recorded.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filtered.map((item, idx) => (
            <div key={idx} className="card" style={{ borderLeft: '4px solid var(--accent-primary)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
                    <span className={`badge ${getEventBadge(item.event_type)}`}>
                      {item.event_type}
                    </span>
                    <span className="badge badge-green">{item.status || 'Recorded'}</span>
                  </div>
                  <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-xs)' }}>
                    {item.details}
                  </p>
                </div>

                <div style={{ textAlign: 'right', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                  <div><strong>Date:</strong> {item.date || 'N/A'}</div>
                  {item.end_date && <div><strong>End:</strong> {item.end_date}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   KNOWLEDGE GRAPH TAB
------------------------------------------------------------- */
function KnowledgeGraphTab({ patientId }) {
  const [subgraph, setSubgraph] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchGraph();
  }, [patientId]);

  const fetchGraph = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/kg/subgraph/${patientId}`);
      const rawElements = res.data?.elements || { nodes: [], edges: [] };
      setSubgraph({
        nodes: rawElements.nodes || [],
        edges: rawElements.edges || []
      });
    } catch {
      toast.error('Failed to load knowledge graph data.');
    } finally {
      setLoading(false);
    }
  };

  const nodeTypes = [...new Set(subgraph.nodes.map(n => n.data?.type || 'Entity'))];

  const getNodeColor = (type) => {
    switch (type) {
      case 'Patient': return '#3b82f6';
      case 'Condition': return '#f59e0b';
      case 'Treatment': return '#10b981';
      case 'AdmissionEvent': return '#8b5cf6';
      case 'DocumentChunk': return '#ec4899';
      default: return '#64748b';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>Patient Knowledge Subgraph</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Interactive exploration of entities and clinical relationships stored in Neo4j
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <span className="badge badge-blue">{subgraph.nodes.length} Nodes</span>
          <span className="badge badge-purple">{subgraph.edges.length} Edges</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-container" style={{ minHeight: '350px' }}>
          <div className="spinner spinner-lg" />
          <span>Constructing subgraph representation...</span>
        </div>
      ) : subgraph.nodes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <Share2 size={32} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }} />
          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>No Graph Elements Recorded</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            There are currently no graph nodes linked to patient {patientId}.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-lg)', alignItems: 'start' }}>
          {/* Graph Visualization Canvas / Card */}
          <div className="card" style={{ padding: 'var(--space-md)', minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--border-default)' }}>
              {nodeTypes.map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: getNodeColor(t) }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>

            {/* SVG Visual Node Graph */}
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '380px', overflow: 'hidden', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)' }}>
              <svg width="100%" height="100%" viewBox="0 0 600 360" style={{ display: 'block' }}>
                {/* Visual circle layout for demo / exploration */}
                {(() => {
                  const total = subgraph.nodes.length;
                  const cx = 300;
                  const cy = 180;
                  const rx = 220;
                  const ry = 130;

                  const coords = {};
                  subgraph.nodes.forEach((n, idx) => {
                    if (n.data?.type === 'Patient') {
                      coords[n.data.id] = { x: cx, y: cy };
                    } else {
                      const angle = ((idx + 1) / total) * 2 * Math.PI;
                      coords[n.data.id] = {
                        x: cx + rx * Math.cos(angle),
                        y: cy + ry * Math.sin(angle)
                      };
                    }
                  });

                  return (
                    <>
                      {/* Lines for edges */}
                      {subgraph.edges.map((e, i) => {
                        const s = coords[e.data?.source];
                        const t = coords[e.data?.target];
                        if (!s || !t) return null;
                        return (
                          <line
                            key={i}
                            x1={s.x}
                            y1={s.y}
                            x2={t.x}
                            y2={t.y}
                            stroke="rgba(148, 163, 184, 0.25)"
                            strokeWidth="1.5"
                          />
                        );
                      })}

                      {/* Nodes */}
                      {subgraph.nodes.map((n, i) => {
                        const pt = coords[n.data?.id] || { x: cx, y: cy };
                        const isSelected = selectedNode?.id === n.data?.id;
                        const col = getNodeColor(n.data?.type);
                        const radius = n.data?.type === 'Patient' ? 22 : 14;

                        return (
                          <g
                            key={i}
                            transform={`translate(${pt.x}, ${pt.y})`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedNode(n.data)}
                          >
                            <circle
                              r={radius}
                              fill={col}
                              stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.2)'}
                              strokeWidth={isSelected ? 3 : 1.5}
                              style={{ filter: isSelected ? 'drop-shadow(0 0 8px ' + col + ')' : 'none' }}
                            />
                            <text
                              textAnchor="middle"
                              y={radius + 12}
                              fontSize="10"
                              fill="var(--text-secondary)"
                              style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                              {(n.data?.label || n.data?.id || '').slice(0, 16)}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Node Inspector Panel */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <Layers size={16} /> Node Inspector
            </h3>
            {selectedNode ? (
              <div style={{ fontSize: 'var(--font-xs)' }}>
                <div style={{ marginBottom: 'var(--space-sm)' }}>
                  <span className="badge" style={{ background: getNodeColor(selectedNode.type), color: '#fff' }}>
                    {selectedNode.type}
                  </span>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                  {selectedNode.label || selectedNode.id}
                </div>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 'var(--space-md)' }}>
                  ID: {selectedNode.id}
                </div>
                <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Properties</h4>
                <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', maxHeight: '200px', overflowY: 'auto' }}>
                  {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 ? (
                    Object.entries(selectedNode.properties).map(([k, v]) => (
                      <div key={k} style={{ marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{String(v)}</strong>
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>No extra properties</span>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                Click any node on the graph canvas to inspect its clinical properties and metadata.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   DOCUMENTS & UPLOAD TAB
------------------------------------------------------------- */
function DocumentsTab({ patientId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/documents/patient/${patientId}`);
      setDocuments(res.data || []);
    } catch {
      toast.error('Failed to load patient documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);

    try {
      setUploading(true);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Document uploaded. Processing initiated.');
      const jobId = res.data.job_id;
      setActiveJob({
        job_id: jobId,
        filename: file.name,
        status: 'pending',
        progress_message: 'Queued for processing...',
        chunks_indexed: 0,
        entities_extracted: 0,
      });

      // Poll job status
      pollJob(jobId);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to upload document.';
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
          toast.success(`Successfully processed ${job.filename}!`);
          fetchDocuments();
        } else if (job.status === 'failed') {
          clearInterval(interval);
          setUploading(false);
          toast.error(`Processing failed: ${job.error_message || 'Unknown error'}`);
          fetchDocuments();
        }
      } catch {
        clearInterval(interval);
        setUploading(false);
      }
    }, 2000);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>Clinical Documents & Ingestion</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Upload discharge summaries, lab reports, or clinical notes for NLP parsing & KG ingestion
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
            id="file-input-patient"
          />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            id="upload-record-btn"
          >
            {uploading ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14 }} /> Ingesting...
              </>
            ) : (
              <>
                <Upload size={16} /> Upload New Document
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Upload / Polling Status Banner */}
      {activeJob && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--accent-primary)', background: 'var(--bg-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
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

          <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: 'var(--font-xs)' }}>
            <span>Chunks Indexed: <strong>{activeJob.chunks_indexed ?? 0}</strong></span>
            <span>Entities Extracted: <strong>{activeJob.entities_extracted ?? 0}</strong></span>
          </div>
        </div>
      )}

      {/* Documents Table */}
      {loading ? (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="spinner spinner-lg" />
          <span>Loading indexed documents...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }} />
          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>No Documents Indexed</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', maxWidth: '400px', margin: '0 auto var(--space-md) auto' }}>
            No clinical records have been uploaded for Patient #{patientId} yet. Upload a PDF or text report to expand the knowledge graph.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Status</th>
                <th>Chunks Indexed</th>
                <th>Entities Extracted</th>
                <th>Upload Date</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.job_id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.filename}</td>
                  <td>
                    <span className={`badge ${d.status === 'completed' ? 'badge-green' : d.status === 'failed' ? 'badge-red' : 'badge-blue'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>{d.chunks_indexed ?? 0}</td>
                  <td>{d.entities_extracted ?? 0}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>
                    {new Date(d.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   CLINICAL Q&A TAB
------------------------------------------------------------- */
function ClinicalQATab({ patientId }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [history, setHistory] = useState([]);
  const toast = useToast();

  useEffect(() => {
    fetchHistory();
  }, [patientId]);

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/query/history/${patientId}`);
      setHistory(res.data || []);
    } catch {
      // non-blocking
    }
  };

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
      fetchHistory();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Query execution failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
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
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>Evidence-Grounded Clinical Q&A</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
          Hybrid retrieval combining structured Neo4j graph traversal, FAISS vector embeddings, and LLM synthesis
        </p>
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
            disabled={loading}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Query Input Box */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <textarea
            id="clinical-query-input"
            className="input"
            rows={3}
            placeholder="Type a clinical query regarding this patient (e.g. 'What treatments were given for condition X?')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            style={{ flex: 1, resize: 'vertical' }}
          />
          <button
            id="submit-query-btn"
            className="btn btn-primary"
            onClick={() => handleAsk()}
            disabled={loading || !query.trim()}
            style={{ alignSelf: 'flex-end', padding: 'var(--space-sm) var(--space-lg)' }}
          >
            {loading ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <>
                <Send size={16} /> Execute
              </>
            )}
          </button>
        </div>
      </div>

      {/* Query Results Display */}
      {loading && (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="spinner spinner-lg" />
          <span>Fusing graph & vector evidence, synthesizing clinical answer...</span>
        </div>
      )}

      {response && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Main Answer Card */}
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

          {/* Evidence Breakdown: Document and Graph Evidence */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
            {/* Document Evidence */}
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

            {/* Knowledge Graph Evidence */}
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

      {/* Query History for this Patient */}
      {history.length > 0 && (
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            Recent Audit Queries for Patient #{patientId}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {history.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{h.query}</span>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(h.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
