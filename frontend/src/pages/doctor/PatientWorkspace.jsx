import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlusCircle, User, Calendar, MapPin, ArrowLeft } from 'lucide-react';
import { usePatientWorkspace } from '../../hooks/usePatientWorkspace';

// Workspace Tabs
import Overview from './workspace/Overview';
import Timeline from './workspace/Timeline';
import Documents from './workspace/Documents';
import Graph from './workspace/Graph';
import QA from './workspace/QA';
import AddEncounterModal from './workspace/AddEncounterModal';

export default function PatientWorkspace() {
  const { patientId } = useParams();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showAddEncounter, setShowAddEncounter] = useState(false);

  const {
    summary,
    timeline,
    graphData,
    documents,
    loading,
    error,
    refetch,
  } = usePatientWorkspace(patientId);

  const patientName = summary?.name || `Patient ${patientId}`;
  const ageStr = summary?.age && summary.age !== 'N/A' ? `${summary.age} yrs` : null;
  const genderStr = summary?.gender && summary.gender !== 'N/A' ? summary.gender : null;
  const stateStr = summary?.state && summary.state !== 'N/A' ? summary.state : null;

  return (
    <div className="workspace-page">
      {/* Breadcrumb Navigation Trail */}
      <div className="workspace-breadcrumb-bar flex-align-gap" style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/doctor/patients" className="back-link flex-align-gap" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Patients
        </Link>
        <span style={{ opacity: 0.5 }}>/</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{patientId}</span>
        <span style={{ opacity: 0.5 }}>/</span>
        <span className="text-accent" style={{ fontWeight: 500 }}>{activeTab}</span>
      </div>

      {/* Compact Patient Profile Header */}
      <header className="workspace-profile-header-card">
        <div className="profile-header-main">
          <div className="profile-avatar-circle">
            <User size={24} />
          </div>
          <div className="profile-info-block">
            <div className="profile-title-row">
              <h1 className="profile-patient-name">{patientName}</h1>
              <span className="profile-id-tag">{patientId}</span>
            </div>
            <div className="profile-meta-row">
              {genderStr && <span className="profile-meta-item">{genderStr}</span>}
              {ageStr && <span className="profile-meta-item">• {ageStr}</span>}
              {stateStr && (
                <span className="profile-meta-item flex-align-gap" style={{ gap: '4px' }}>
                  • <MapPin size={12} /> {stateStr}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Obvious "+ Add Clinical Visit" Doctor Action */}
        <div className="profile-header-actions">
          <button
            type="button"
            className="btn-primary-action flex-align-gap"
            onClick={() => setShowAddEncounter(true)}
          >
            <PlusCircle size={16} /> Add Clinical Visit
          </button>
        </div>
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
            <p className="error-message-text">Could not load patient records. Check authorization or network.</p>
            <button type="button" onClick={refetch} className="btn-secondary-action">
              Retry
            </button>
          </div>
        ) : (
          <div className="workspace-fade-in" key={activeTab}>
            {activeTab === 'Overview' && (
              <Overview
                patientId={patientId}
                summary={summary}
                timeline={timeline}
                documents={documents}
                onNavigateTab={setActiveTab}
                onOpenAddEncounter={() => setShowAddEncounter(true)}
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

      {/* Add Clinical Visit Modal */}
      {showAddEncounter && (
        <AddEncounterModal
          patientId={patientId}
          onClose={() => setShowAddEncounter(false)}
          onEncounterCreated={() => {
            setShowAddEncounter(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
