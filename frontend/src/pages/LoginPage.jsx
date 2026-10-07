import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBuildingHospital,
  IconLock,
  IconUser,
  IconShield,
  IconStethoscope,
  IconNetwork,
  IconBrain,
  IconArrowRight,
  IconSparkles
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const user = await login(username.trim(), password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'doctor') navigate('/doctor/patients');
      else navigate('/patient');
    } catch (err) {
      console.error('Login error response:', err.response || err);
      const msg = err.response?.data?.detail || 'Invalid username or password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="login-viewport">
      <div className="login-card-split">
        {/* Left Side: Product Identity & Features */}
        <div className="login-identity-panel">
          <div className="login-identity-content">
            <div className="login-brand-header">
              <div className="login-brand-icon">
                <IconBuildingHospital size={28} />
              </div>
              <h1 className="login-brand-name">Clinical<span>KG</span></h1>
            </div>
            
            <p className="login-brand-tagline">
              Evidence-grounded patient knowledge graph & clinical decision workspace.
            </p>

            {/* Feature Highlights */}
            <div className="login-features-list">
              <div className="login-feature-item">
                <div className="feature-icon"><IconNetwork size={20} /></div>
                <div>
                  <h4>Interactive Knowledge Graph</h4>
                  <p>Visualize patient encounters, lab results, and medical entities in real-time.</p>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="feature-icon"><IconBrain size={20} /></div>
                <div>
                  <h4>Evidence-Grounded Q&A</h4>
                  <p>Query medical histories backed by explicit citations from EHR records.</p>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="feature-icon"><IconShield size={20} /></div>
                <div>
                  <h4>Role-Based Access Control</h4>
                  <p>Tailored interfaces for Administrators, Doctors, and Patients.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-identity-footer">
            <div className="login-divider-line" />
            <p className="login-disclaimer-text">
              <IconSparkles size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              A B.Tech research prototype. Synthetic data only.
            </p>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="login-form-panel">
          <div className="login-form-wrapper">
            <h2 className="login-form-title">Sign in</h2>
            <p className="login-form-subtitle">Enter your credentials to access your portal</p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field-group">
                <label className="login-field-label" htmlFor="username">
                  Username
                </label>
                <div className="input-with-icon">
                  <IconUser size={18} className="input-icon" />
                  <input
                    id="username"
                    className="login-field-input"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label className="login-field-label" htmlFor="password">
                  Password
                </label>
                <div className="input-with-icon">
                  <IconLock size={18} className="input-icon" />
                  <input
                    id="password"
                    className="login-field-input"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                className="login-submit-button"
                disabled={loading || !username.trim() || !password.trim()}
              >
                {loading ? 'Signing in...' : (
                  <>
                    <span>Sign in</span>
                    <IconArrowRight size={18} />
                  </>
                )}
              </button>

              {error && <div className="login-inline-error">{error}</div>}
            </form>

            {/* Quick Fill Dev Buttons */}
            {import.meta.env.DEV && (
              <div className="login-quick-fill-section" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  ⚡ Development Quick Fill
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', flex: 1 }}
                    onClick={() => fillCredentials('admin', 'admin123')}
                  >
                    <IconShield size={14} style={{ marginRight: '4px' }} /> Admin
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', flex: 1 }}
                    onClick={() => fillCredentials('doc_smith', 'doc123')}
                  >
                    <IconStethoscope size={14} style={{ marginRight: '4px' }} /> Doctor
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', flex: 1 }}
                    onClick={() => fillCredentials('pat_john', 'pat123')}
                  >
                    <IconUser size={14} style={{ marginRight: '4px' }} /> Patient
                  </button>
                </div>
              </div>
            )}

            <div className="login-form-footer">
              <div className="login-divider-line" />
              <p className="login-role-hint">Protected by end-to-end encrypted session authentication</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

