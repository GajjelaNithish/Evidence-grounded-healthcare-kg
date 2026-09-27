import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force-3d';

const NODE_COLORS = {
  patient: '#3B82F6',
  Patient: '#3B82F6',
  condition: '#EF4444',
  Condition: '#EF4444',
  treatment: '#22C55E',
  Treatment: '#22C55E',
  admission: '#8B5CF6',
  AdmissionEvent: '#8B5CF6',
  document: '#F59E0B',
  DocumentChunk: '#F59E0B',
};

function normalizeType(type) {
  if (!type) return 'condition';
  const lower = type.toLowerCase();
  if (lower.includes('patient')) return 'patient';
  if (lower.includes('cond')) return 'condition';
  if (lower.includes('treat')) return 'treatment';
  if (lower.includes('admis')) return 'admission';
  if (lower.includes('doc') || lower.includes('chunk')) return 'document';
  return 'condition';
}

export default function Graph({ patientId, graphData, summary, timeline }) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [selectedNode, setSelectedNode] = useState(null);

  // Filter toggles
  const [showConditions, setShowConditions] = useState(true);
  const [showTreatments, setShowTreatments] = useState(true);
  const [showAdmissions, setShowAdmissions] = useState(true);
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

  // Force configuration
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge', d3.forceManyBody().strength(-400));
      fgRef.current.d3Force('collision', d3.forceCollide().radius(50));
      fgRef.current.d3Force('link', d3.forceLink().distance(150));
    }
  }, [fgRef, showConditions, showTreatments, showAdmissions, showDocuments]);

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
        val: norm === 'patient' ? 12 : 7,
      });
    });

    rawEdges.forEach((e) => {
      const d = e.data || e;
      const key = `${d.source}->${d.target}`;
      if (!linkSet.has(key)) {
        linkSet.add(key);
        links.push({
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
        },
        val: 12,
      });
    }

    // Complement from timeline if needed
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
              },
              val: 7,
            });
            links.push({ source: pId, target: admId, label: 'HAD_ADMISSION' });
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
              },
              val: 7,
            });
            links.push({ source: pId, target: condId, label: 'HAS_CONDITION' });
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
  }, [graphData, summary, timeline, patientId, showConditions, showTreatments, showAdmissions, showDocuments]);

  // Node Canvas Object rendering per Phase 10
  const renderNode = useCallback((node, ctx, globalScale) => {
    const radius = node.type === 'patient' ? 12 : 7;
    const color = NODE_COLORS[node.type] || '#94A3B8';

    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw label below node when zoomed in enough
    if (globalScale >= 0.8) {
      const label = node.label?.length > 18 ? node.label.substring(0, 16) + '…' : (node.label || node.id);
      const fontSize = Math.max(10, 12 / globalScale);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = '#F1F5F9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, node.x, node.y + radius + 3);
    }
  }, []);

  const handleResetZoom = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50);
    }
  };

  return (
    <div className="graph-tab-container" ref={containerRef}>
      {/* Header and Filter Strip */}
      <div className="graph-controls-header">
        <div className="graph-filter-strip">
          <span className="graph-filter-label">Filter:</span>

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
            className={`graph-filter-toggle ${showDocuments ? 'active' : ''}`}
            onClick={() => setShowDocuments(!showDocuments)}
          >
            <span className="filter-dot dot-document" /> Documents
          </button>
        </div>

        <button type="button" onClick={handleResetZoom} className="btn-text-action">
          Reset view
        </button>
      </div>

      {/* Graph Canvas */}
      <div className="graph-canvas-frame">
        <ForceGraph2D
          ref={fgRef}
          graphData={transformedData}
          width={containerWidth}
          height={600}
          backgroundColor="#0A1628"
          nodeCanvasObject={renderNode}
          nodeLabel={(node) => node.label || node.id}
          linkLabel={(link) => link.label || 'RELATED_TO'}
          linkColor={() => 'rgba(148, 163, 184, 0.3)'}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          onNodeClick={(node) => setSelectedNode(node)}
          cooldownTicks={300}
          enableNodeDrag={true}
          onEngineStop={() => fgRef.current?.zoomToFit(400, 40)}
          nodeRelSize={1}
        />
      </div>

      {/* Selected Node Panel (below the graph) */}
      {selectedNode && (
        <div className="graph-selected-node-panel">
          <div className="graph-selected-header">
            <h3 className="graph-selected-title">Selected: {selectedNode.label || selectedNode.id}</h3>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="btn-text-close"
              aria-label="Close node inspector"
            >
              ×
            </button>
          </div>

          <div className="section-divider" />

          <dl className="summary-definition-list">
            <div className="summary-def-row">
              <dt className="summary-def-label">Type</dt>
              <dd className="summary-def-value">{selectedNode.type}</dd>
            </div>
            <div className="summary-def-row">
              <dt className="summary-def-label">Node ID</dt>
              <dd className="summary-def-value font-mono">{selectedNode.id}</dd>
            </div>

            {selectedNode.properties &&
              Object.entries(selectedNode.properties).map(([k, v]) => (
                <div key={k} className="summary-def-row">
                  <dt className="summary-def-label">{k}</dt>
                  <dd className="summary-def-value">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </div>
  );
}
