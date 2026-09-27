import { useState, useEffect, useCallback } from 'react';
import api from '../api';

export function usePatientWorkspace(patientId) {
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkspaceData = useCallback(async () => {
    if (!patientId) return;

    setLoading(true);
    setError(null);

    try {
      const [summaryRes, timelineRes, subgraphRes, documentsRes] = await Promise.all([
        api.get(`/kg/analytics/${patientId}`).catch((err) => {
          // Fallback structure if analytics 404s
          if (err.response?.status === 404) {
            return { data: { patient_id: patientId, age: 'N/A', gender: 'N/A', condition_count: 0, treatment_count: 0, admission_count: 0 } };
          }
          throw err;
        }),
        api.get(`/kg/timeline/${patientId}`),
        api.get(`/kg/subgraph/${patientId}`).catch(() => ({ data: { elements: { nodes: [], edges: [] } } })),
        api.get(`/documents/patient/${patientId}`).catch(() => ({ data: [] })),
      ]);

      setSummary(summaryRes.data);
      setTimeline(timelineRes.data || []);
      setGraphData(subgraphRes.data?.elements || { nodes: [], edges: [] });
      setDocuments(documentsRes.data || []);
    } catch (err) {
      console.error('Failed to load patient workspace data:', err);
      const msg = err.response?.data?.detail || err.message || 'Could not load patient workspace.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  return {
    summary,
    timeline,
    graphData,
    documents,
    loading,
    error,
    refetch: fetchWorkspaceData,
  };
}
