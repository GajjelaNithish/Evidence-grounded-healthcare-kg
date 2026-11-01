import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  IconPlus,
  IconUser,
  IconCalendar,
  IconMapPin,
  IconArrowLeft,
  IconLayoutDashboard,
  IconClock,
  IconFileText,
  IconNetwork,
  IconMessage2
} from '@tabler/icons-react';
import { usePatientWorkspace } from '../../hooks/usePatientWorkspace';

// Workspace Tabs
import Overview from './workspace/Overview';
import Timeline from './workspace/Timeline';
import Documents from './workspace/Documents';
import Graph from './workspace/Graph';
import QA from './workspace/QA';
import AddEncounterModal from './workspace/AddEncounterModal';
import { Skeleton } from '../../components/ui';

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

  const patientName = summary?.name || `Patient #${patientId}`;
  const ageStr = summary?.age && summary.age !== 'N/A' ? `${summary.age} yrs` : null;
  const genderStr = summary?.gender && summary.gender !== 'N/A' ? summary.gender : null;
  const stateStr = summary?.state && summary.state !== 'N/A' ? summary.state : null;

  const tabs = [
    { id: 'Overview', label: 'Overview', icon: IconLayoutDashboard },
    { id: 'Timeline', label: 'Timeline', icon: IconClock, count: timeline?.length },
    { id: 'Documents', label: 'Documents', icon: IconFileText, count: documents?.length },
    { id: 'Graph', label: 'Knowledge Graph', icon: IconNetwork },
    { id: 'Q&A', label: 'Clinical Q&A', icon: IconMessage2 },
  ];

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Breadcrumb Navigation Trail */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link to="/doctor/patients" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <IconArrowLeft size={15} /> Assigned Patients
        </Link>
        <span style={{ opacity: 0.4 }}>/</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Patient #{patientId}</span>
        <span style={{ opacity: 0.4 }}>/</span>
        <span style={{ fontWeight: 500, color: 'var(--accent-primary)' }}>{activeTab}</span>
      </div>

      {/* Patient Profile Dossier Banner */}
      <header
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.25))',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}
          >
            P{patientId.toString().slice(-2)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                {patientName}
              </h1>
              <span
                className="font-mono"
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--accent-primary)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                PID: {patientId}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {genderStr && <span>{genderStr}</span>}
              {ageStr && <span>• {ageStr}</span>}
              {stateStr && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  • <IconMapPin size={13} /> {stateStr}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button: Add Clinical Visit */}
        <div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAddEncounter(true)}
            id="add-visit-btn"
          >
            <IconPlus size={16} /> Record Clinical Visit
          </button>
        </div>
      </header>

      {/* Tab Navigation Strip */}
      <nav
        aria-label="Patient workspace tabs"
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.5rem',
          overflowX: 'auto'
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-card)' : 'transparent',
                border: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Workspace Content Area */}
      <main className="workspace-main-content">
        {loading && !summary ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
            <Skeleton height="32px" width="30%" />
            <Skeleton height="140px" borderRadius="var(--radius-lg)" />
            <Skeleton height="180px" borderRadius="var(--radius-lg)" />
          </div>
        ) : error && !summary ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Could not load patient records. Check network connectivity or user authorization.
            </p>
            <button type="button" onClick={refetch} className="btn-secondary">
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
