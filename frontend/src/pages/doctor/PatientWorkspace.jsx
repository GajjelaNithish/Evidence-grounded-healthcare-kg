import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePatientWorkspace } from '../../hooks/usePatientWorkspace';

// Workspace Tabs
import Overview from './workspace/Overview';
import Timeline from './workspace/Timeline';
import Documents from './workspace/Documents';
import Graph from './workspace/Graph';
import QA from './workspace/QA';

export default function PatientWorkspace() {
  const { patientId } = useParams();
  const [activeTab, setActiveTab] = useState('Overview');

  const {
    summary,
    timeline,
    graphData,
    documents,
    loading,
    error,
    refetch,
  } = usePatientWorkspace(patientId);

  const metaParts = [];
  if (summary?.gender && summary.gender !== 'N/A') metaParts.push(summary.gender);
  if (summary?.age && summary.age !== 'N/A') metaParts.push(`${summary.age} years`);
  if (summary?.state && summary.state !== 'N/A') metaParts.push(summary.state);
  const metaString = metaParts.length > 0 ? metaParts.join(' · ') : `Patient record P-${patientId}`;

  return (
    <div className="workspace-page">
      {/* Back Link */}
      <div className="workspace-nav-back">
        <Link to="/doctor/patients" className="back-link">
          ← Patients
        </Link>
      </div>

      {/* Patient Header */}
      <header className="workspace-header-section">
        <div className="workspace-header-top">
          <h1 className="workspace-patient-title">Patient {patientId}</h1>
          <span className="workspace-updated-indicator">Last updated 2 hours ago</span>
        </div>
        <div className="workspace-patient-subtitle">{metaString}</div>
      </header>

      <div className="divider-line" />

      {/* Tab Navigation */}
      <nav className="workspace-tabs-row" aria-label="Patient workspace tabs">
        {['Overview', 'Timeline', 'Documents', 'Graph', 'Q&A'].map((tab) => (
          <button
            key={tab}
            className={`workspace-tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Workspace Content Area */}
      <main className="workspace-main-content">
        {loading && !summary ? (
          <div className="workspace-skeleton-body">
            <div className="skeleton skeleton-heading" />
            <div className="skeleton skeleton-paragraph" />
            <div className="skeleton skeleton-paragraph" />
          </div>
        ) : error && !summary ? (
          <div className="workspace-error-panel">
            <p className="error-message-text">Could not load patient records. Check connection and retry.</p>
            <button type="button" onClick={refetch} className="btn-secondary-action">
              Retry
            </button>
          </div>
        ) : (
          <div className="workspace-fade-in" key={activeTab}>
            {activeTab === 'Overview' && (
              <Overview
                summary={summary}
                timeline={timeline}
                documents={documents}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === 'Timeline' && (
              <Timeline
                timeline={timeline}
              />
            )}
            {activeTab === 'Documents' && (
              <Documents
                patientId={patientId}
                documents={documents}
                onRefetch={refetch}
              />
            )}
            {activeTab === 'Graph' && (
              <Graph
                patientId={patientId}
                graphData={graphData}
                summary={summary}
                timeline={timeline}
              />
            )}
            {activeTab === 'Q&A' && (
              <QA
                patientId={patientId}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
