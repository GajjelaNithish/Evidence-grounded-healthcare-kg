import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  return (
    <div className="login-viewport">
      <div className="login-card-split">
        {/* Left Side: Product Identity */}
        <div className="login-identity-panel">
          <div className="login-identity-content">
            <h1 className="login-brand-name">ClinicalKG</h1>
            <p className="login-brand-tagline">
              Evidence-grounded patient knowledge graph for clinical teams.
            </p>
          </div>

          <div className="login-identity-footer">
            <div className="login-divider-line" />
            <p className="login-disclaimer-text">
              A B.Tech research prototype. Synthetic data only.
            </p>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="login-form-panel">
          <div className="login-form-wrapper">
            <h2 className="login-form-title">Sign in</h2>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field-group">
                <label className="login-field-label" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className="login-field-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>

              <div className="login-field-group">
                <label className="login-field-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  className="login-field-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                className="login-submit-button"
                disabled={loading || !username.trim() || !password.trim()}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              {error && <div className="login-inline-error">{error}</div>}
            </form>

            <div className="login-form-footer">
              <div className="login-divider-line" />
              <p className="login-role-hint">Admin · Doctor · Patient access</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
