import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force-3d';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, X, Info, Filter, Link2, Calendar, Database } from 'lucide-react';

const NODE_COLORS = {
  patient: '#3B82F6',
  Patient: '#3B82F6',
  condition: '#EF4444',
  Condition: '#EF4444',
  treatment: '#10B981',
  Treatment: '#10B981',
  admission: '#F59E0B',
  AdmissionEvent: '#F59E0B',
  encounter: '#06B6D4',
  Encounter: '#06B6D4',
  observation: '#EC4899',
  Observation: '#EC4899',
  document: '#8B5CF6',
  DocumentChunk: '#8B5CF6',
};

function normalizeType(type) {
  if (!type) return 'condition';
  const lower = type.toLowerCase();
  if (lower.includes('patient')) return 'patient';
  if (lower.includes('cond')) return 'condition';
  if (lower.includes('treat')) return 'treatment';
  if (lower.includes('obs') || lower.includes('lab') || lower.includes('test')) return 'observation';
  if (lower.includes('admis')) return 'admission';
  if (lower.includes('encount') || lower.includes('visit')) return 'encounter';
  if (lower.includes('doc') || lower.includes('chunk')) return 'document';
  return 'condition';
}

export default function Graph({ patientId, graphData, summary, timeline }) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);

  // Filter toggles
  const [showConditions, setShowConditions] = useState(true);
  const [showTreatments, setShowTreatments] = useState(true);
  const [showAdmissions, setShowAdmissions] = useState(true);
  const [showEncounters, setShowEncounters] = useState(true);
  const [showObservations, setShowObservations] = useState(true);
  const [showDocuments, setShowDocuments] = useState(true);

  // ResizeObserver for dynamic width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Force configuration to prevent overlapping and provide a stable layout
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge', d3.forceManyBody().strength(-600));
      fgRef.current.d3Force('collision', d3.forceCollide().radius(55));
      fgRef.current.d3Force('link', d3.forceLink().distance(160));
    }
  }, [fgRef, showConditions, showTreatments, showAdmissions, showEncounters, showObservations, showDocuments]);

  // Transform graph data
  const transformedData = useMemo(() => {
    const nodesMap = new Map();
    const links = [];
    const linkSet = new Set();

    const rawNodes = graphData?.nodes || [];
    const rawEdges = graphData?.edges || [];

    rawNodes.forEach((n) => {
      const d = n.data || n;
      const norm = normalizeType(d.type);
      nodesMap.set(d.id, {
        id: d.id,
        label: d.label || d.id,
        type: norm,
        properties: d.properties || {},
        val: norm === 'patient' ? 14 : 8,
      });
    });

    rawEdges.forEach((e) => {
      const d = e.data || e;
      const key = `${d.source}->${d.target}`;
      if (!linkSet.has(key)) {
        linkSet.add(key);
        links.push({
          id: key,
          source: d.source,
          target: d.target,
          label: d.label || 'RELATED_TO',
          properties: d.properties || {},
        });
      }
    });

    // Ensure central Patient node exists
    const patientKey = `Patient_${patientId}`;
    if (!nodesMap.has(patientKey) && !nodesMap.has(patientId)) {
      nodesMap.set(patientKey, {
        id: patientKey,
        label: `Patient ${patientId}`,
        type: 'patient',
        properties: {
          age: summary?.age ?? 'N/A',
          gender: summary?.gender ?? 'N/A',
          state: summary?.state ?? 'N/A',
          source: 'Primary Knowledge Graph',
        },
        val: 14,
      });
    }

    // Complement graph nodes from timeline events
    if (timeline && timeline.length > 0) {
      const pId = nodesMap.has(patientKey) ? patientKey : (nodesMap.has(patientId) ? patientId : patientKey);
      timeline.forEach((evt, idx) => {
        if (evt.event_type === 'Hospital Admission') {
          const admId = `Admission_${idx}`;
          if (!nodesMap.has(admId)) {
            nodesMap.set(admId, {
              id: admId,
              label: `Admission (${evt.date || '2024'})`,
              type: 'admission',
              properties: {
                date: evt.date,
                status: evt.status,
                details: evt.details,
                source: 'Hospital EHR System',
              },
              val: 8,
            });
            links.push({ id: `${pId}->${admId}`, source: pId, target: admId, label: 'HAD_ADMISSION', properties: { valid_from: evt.date } });
          }
        } else if (evt.event_type === 'Clinical Encounter') {
          const encId = `Encounter_${idx}`;
          if (!nodesMap.has(encId)) {
            nodesMap.set(encId, {
              id: encId,
              label: `Clinical Visit (${evt.date})`,
              type: 'encounter',
              properties: {
                visit_date: evt.date,
                title: evt.title,
                details: evt.details,
                source: 'Longitudinal Encounter Stream',
              },
              val: 8,
            });
            links.push({ id: `${pId}->${encId}`, source: pId, target: encId, label: 'HAD_ENCOUNTER', properties: { valid_from: evt.date } });
          }
        } else if (evt.event_type === 'Condition Diagnosis' && evt.title) {
          const condId = `Condition_${evt.title.replace(/\s+/g, '_')}`;
          if (!nodesMap.has(condId)) {
            nodesMap.set(condId, {
              id: condId,
              label: evt.title,
              type: 'condition',
              properties: {
                diagnosed_date: evt.date,
                status: evt.status,
                source: 'Verified EHR Record',
              },
              val: 8,
            });
            links.push({ id: `${pId}->${condId}`, source: pId, target: condId, label: 'HAS_CONDITION', properties: { valid_from: evt.date } });
          }
        } else if (evt.event_type === 'Lab / Investigation' && evt.title) {
          const obsId = `Observation_${idx}`;
          if (!nodesMap.has(obsId)) {
            nodesMap.set(obsId, {
              id: obsId,
              label: evt.title,
              type: 'observation',
              properties: {
                date: evt.date,
                status: evt.status,
                details: evt.details,
                source: 'Diagnostic Lab Stream',
              },
              val: 8,
            });
            links.push({ id: `${pId}->${obsId}`, source: pId, target: obsId, label: 'HAD_OBSERVATION', properties: { valid_from: evt.date } });
          }
        }
      });
    }

    const allNodes = Array.from(nodesMap.values());
    const activeNodeIds = new Set();

    const filteredNodes = allNodes.filter((node) => {
      if (node.type === 'patient') {
        activeNodeIds.add(node.id);
        return true;
      }
      if (node.type === 'condition') {
        if (showConditions) activeNodeIds.add(node.id);
        return showConditions;
      }
      if (node.type === 'treatment') {
        if (showTreatments) activeNodeIds.add(node.id);
        return showTreatments;
      }
      if (node.type === 'admission') {
        if (showAdmissions) activeNodeIds.add(node.id);
        return showAdmissions;
      }
      if (node.type === 'encounter') {
        if (showEncounters) activeNodeIds.add(node.id);
        return showEncounters;
      }
      if (node.type === 'observation') {
        if (showObservations) activeNodeIds.add(node.id);
        return showObservations;
      }
      if (node.type === 'document') {
        if (showDocuments) activeNodeIds.add(node.id);
        return showDocuments;
      }
      activeNodeIds.add(node.id);
      return true;
    });

    const filteredLinks = links.filter((link) => {
      const src = typeof link.source === 'object' ? link.source.id : link.source;
      const tgt = typeof link.target === 'object' ? link.target.id : link.target;
      return activeNodeIds.has(src) && activeNodeIds.has(tgt);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, summary, timeline, patientId, showConditions, showTreatments, showAdmissions, showEncounters, showObservations, showDocuments]);

  // Node Canvas rendering with selection highlight & clean text
  const renderNode = useCallback((node, ctx, globalScale) => {
    const radius = node.type === 'patient' ? 14 : 8;
    const color = NODE_COLORS[node.type] || '#94A3B8';
    const isSelected = selectedNode?.id === node.id;

    // Draw selection halo
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3B82F6';
      ctx.stroke();
    }

    // Draw main circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0F172A';
    ctx.stroke();

    // Draw label below node
    if (globalScale >= 0.7 || isSelected) {
      const label = node.label?.length > 20 ? node.label.substring(0, 18) + '…' : (node.label || node.id);
      const fontSize = Math.max(10, 12 / globalScale);
      ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = isSelected ? '#38BDF8' : '#F1F5F9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, node.x, node.y + radius + 4);
    }
  }, [selectedNode]);

  // Usability Controls
  const handleZoomIn = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 1.3, 300);
  };

  const handleZoomOut = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() / 1.3, 300);
  };

  const handleFitToView = () => {
    if (fgRef.current) fgRef.current.zoomToFit(400, 50);
  };

  const handleResetLayout = () => {
    if (fgRef.current) {
      fgRef.current.reheatSimulation();
      fgRef.current.zoomToFit(400, 50);
    }
  };

  // Find connected links for selected node
  const connectedLinks = useMemo(() => {
    if (!selectedNode) return [];
    return transformedData.links.filter((l) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      return src === selectedNode.id || tgt === selectedNode.id;
    });
  }, [selectedNode, transformedData]);

  return (
    <div className="graph-tab-container" ref={containerRef}>
      {/* Header and Filter Strip */}
      <div className="graph-controls-header">
        <div className="graph-filter-strip">
          <span className="graph-filter-label flex-align-gap"><Filter size={14} /> Filter:</span>

          <button
            type="button"
            className={`graph-filter-toggle ${showConditions ? 'active' : ''}`}
            onClick={() => setShowConditions(!showConditions)}
          >
            <span className="filter-dot dot-condition" /> Conditions
          </button>

          <button
            type="button"
            className={`graph-filter-toggle ${showTreatments ? 'active' : ''}`}
            onClick={() => setShowTreatments(!showTreatments)}
          >
            <span className="filter-dot dot-treatment" /> Treatments
          </button>

          <button
            type="button"
            className={`graph-filter-toggle ${showAdmissions ? 'active' : ''}`}
            onClick={() => setShowAdmissions(!showAdmissions)}
          >
            <span className="filter-dot dot-admission" /> Admissions
          </button>

          <button
            type="button"
            className={`graph-filter-toggle ${showEncounters ? 'active' : ''}`}
            onClick={() => setShowEncounters(!showEncounters)}
          >
            <span className="filter-dot dot-encounter" /> Encounters
          </button>

          <button
            type="button"
            className={`graph-filter-toggle ${showObservations ? 'active' : ''}`}
            onClick={() => setShowObservations(!showObservations)}
          >
            <span className="filter-dot dot-observation" style={{ backgroundColor: '#EC4899' }} /> Labs / Obs
          </button>

          <button
            type="button"
            className={`graph-filter-toggle ${showDocuments ? 'active' : ''}`}
            onClick={() => setShowDocuments(!showDocuments)}
          >
            <span className="filter-dot dot-document" /> Documents
          </button>
        </div>

        {/* Usability Controls */}
        <div className="graph-toolbar-controls">
          <button type="button" onClick={handleZoomIn} className="btn-icon-action" title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <button type="button" onClick={handleZoomOut} className="btn-icon-action" title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <button type="button" onClick={handleFitToView} className="btn-icon-action" title="Fit to View">
            <Maximize2 size={16} />
          </button>
          <button type="button" onClick={handleResetLayout} className="btn-icon-action" title="Reset Layout">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Graph Canvas Frame */}
      <div className="graph-canvas-frame">
        <ForceGraph2D
          ref={fgRef}
          graphData={transformedData}
          width={containerWidth}
          height={560}
          backgroundColor="#0A1628"
          nodeCanvasObject={renderNode}
          nodeLabel={(node) => `${node.label || node.id} (${node.type})`}
          linkLabel={(link) => link.label || 'RELATED_TO'}
          linkColor={(link) => {
            if (selectedNode) {
              const src = typeof link.source === 'object' ? link.source.id : link.source;
              const tgt = typeof link.target === 'object' ? link.target.id : link.target;
              if (src === selectedNode.id || tgt === selectedNode.id) return '#38BDF8';
            }
            if (selectedLink && selectedLink.id === link.id) return '#38BDF8';
            return 'rgba(148, 163, 184, 0.35)';
          }}
          linkWidth={(link) => {
            if (selectedNode) {
              const src = typeof link.source === 'object' ? link.source.id : link.source;
              const tgt = typeof link.target === 'object' ? link.target.id : link.target;
              if (src === selectedNode.id || tgt === selectedNode.id) return 2.5;
            }
            return 1.2;
          }}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          enableNodeDrag={true}
          enablePanInteraction={true}
          enableZoomInteraction={true}
          onNodeClick={(node) => {
            setSelectedNode(node);
            setSelectedLink(null);
          }}
          onLinkClick={(link) => {
            setSelectedLink(link);
            setSelectedNode(null);
          }}
          onBackgroundClick={() => {
            setSelectedNode(null);
            setSelectedLink(null);
          }}
          cooldownTicks={250}
          onEngineStop={() => fgRef.current?.zoomToFit(400, 40)}
          nodeRelSize={1}
        />
      </div>

      {/* Node Inspector Panel */}
      {selectedNode && (
        <div className="graph-node-inspector-panel">
          <div className="graph-selected-header">
            <div className="flex-align-gap">
              <span className={`evidence-badge badge-${selectedNode.type}`}>
                {selectedNode.type.toUpperCase()}
              </span>
              <h3 className="graph-selected-title">{selectedNode.label || selectedNode.id}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="btn-text-close"
              aria-label="Close inspector"
            >
              <X size={18} />
            </button>
          </div>

          <div className="section-divider" />

          <div className="inspector-content-grid">
            <div className="inspector-col">
              <dl className="summary-definition-list">
                <div className="summary-def-row">
                  <dt className="summary-def-label">Entity Identifier</dt>
                  <dd className="summary-def-value font-mono">{selectedNode.id}</dd>
                </div>
                <div className="summary-def-row">
                  <dt className="summary-def-label">Entity Type</dt>
                  <dd className="summary-def-value">{selectedNode.type}</dd>
                </div>
                <div className="summary-def-row">
                  <dt className="summary-def-label">Provenance / Source</dt>
                  <dd className="summary-def-value">{selectedNode.properties?.source || 'EHR Knowledge Graph'}</dd>
                </div>
              </dl>
            </div>

            <div className="inspector-col">
              <dl className="summary-definition-list">
                {selectedNode.properties?.date && (
                  <div className="summary-def-row">
                    <dt className="summary-def-label">Date</dt>
                    <dd className="summary-def-value font-mono">{selectedNode.properties.date}</dd>
                  </div>
                )}
                {selectedNode.properties?.diagnosed_date && (
                  <div className="summary-def-row">
                    <dt className="summary-def-label">Diagnosed Date</dt>
                    <dd className="summary-def-value font-mono">{selectedNode.properties.diagnosed_date}</dd>
                  </div>
                )}
                {selectedNode.properties?.status && (
                  <div className="summary-def-row">
                    <dt className="summary-def-label">Temporal Status</dt>
                    <dd className="summary-def-value">{selectedNode.properties.status}</dd>
                  </div>
                )}
                {selectedNode.properties?.details && (
                  <div className="summary-def-row">
                    <dt className="summary-def-label">Clinical Details</dt>
                    <dd className="summary-def-value">{selectedNode.properties.details}</dd>
                  </div>
                )}
                {selectedNode.properties?.dosage && (
                  <div className="summary-def-row">
                    <dt className="summary-def-label">Dosage</dt>
                    <dd className="summary-def-value font-mono">{selectedNode.properties.dosage}</dd>
                  </div>
                )}
                {selectedNode.properties?.frequency && (
                  <div className="summary-def-row">
                    <dt className="summary-def-label">Frequency</dt>
                    <dd className="summary-def-value font-mono">{selectedNode.properties.frequency}</dd>
                  </div>
                )}
                {selectedNode.properties?.value && (
                  <div className="summary-def-row">
                    <dt className="summary-def-label">Lab Value / Result</dt>
                    <dd className="summary-def-value font-mono">{selectedNode.properties.value} {selectedNode.properties.unit || ''}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Connected Relationships List */}
          {connectedLinks.length > 0 && (
            <div className="inspector-relationships-block">
              <h4 className="rel-block-title"><Link2 size={14} /> Connected Graph Relationships ({connectedLinks.length})</h4>
              <ul className="rel-list">
                {connectedLinks.map((l, i) => {
                  const srcName = typeof l.source === 'object' ? l.source.label || l.source.id : l.source;
                  const tgtName = typeof l.target === 'object' ? l.target.label || l.target.id : l.target;
                  return (
                    <li key={i} className="rel-item font-mono">
                      <span>{srcName}</span>
                      <span className="rel-arrow">─[{l.label}]→</span>
                      <span>{tgtName}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Relationship Link Inspector Panel */}
      {selectedLink && (
        <div className="graph-node-inspector-panel">
          <div className="graph-selected-header">
            <div className="flex-align-gap">
              <span className="evidence-badge badge-graph">RELATIONSHIP</span>
              <h3 className="graph-selected-title">{selectedLink.label || 'RELATED_TO'}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLink(null)}
              className="btn-text-close"
              aria-label="Close relationship inspector"
            >
              <X size={18} />
            </button>
          </div>

          <div className="section-divider" />

          <dl className="summary-definition-list">
            <div className="summary-def-row">
              <dt className="summary-def-label">Relationship Type</dt>
              <dd className="summary-def-value font-mono">{selectedLink.label}</dd>
            </div>
            <div className="summary-def-row">
              <dt className="summary-def-label">Source Entity</dt>
              <dd className="summary-def-value">{typeof selectedLink.source === 'object' ? selectedLink.source.label : selectedLink.source}</dd>
            </div>
            <div className="summary-def-row">
              <dt className="summary-def-label">Target Entity</dt>
              <dd className="summary-def-value">{typeof selectedLink.target === 'object' ? selectedLink.target.label : selectedLink.target}</dd>
            </div>
            {selectedLink.properties?.valid_from && (
              <div className="summary-def-row">
                <dt className="summary-def-label">Valid From Date</dt>
                <dd className="summary-def-value font-mono">{selectedLink.properties.valid_from}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
