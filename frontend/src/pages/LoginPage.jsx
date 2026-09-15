import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Activity, Lock, User, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      toast.success(`Welcome back, ${user.full_name || user.username}!`);
      // Route based on role
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'doctor') navigate('/doctor');
      else navigate('/patient');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Check credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Animated background blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />
      <div style={styles.blob3} />

      <div style={styles.loginCard}>
        <div style={styles.brandSection}>
          <div style={styles.brandIcon}>
            <Activity size={28} color="white" />
          </div>
          <h1 style={styles.brandTitle}>ClinicalKG</h1>
          <p style={styles.brandSub}>Evidence-Grounded Patient Knowledge Graph</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="label">Username</label>
            <div style={styles.inputWrapper}>
              <User size={16} style={styles.inputIcon} />
              <input
                id="login-username"
                className="input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading || !username.trim() || !password.trim()}
            style={styles.submitBtn}
          >
            {loading ? (
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            ) : (
              <>
                Sign In <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p style={styles.hint}>
          Contact your administrator to obtain credentials
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--bg-primary)',
  },
  blob1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)',
    top: '-100px',
    right: '-100px',
    animation: 'pulse 8s ease-in-out infinite',
  },
  blob2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)',
    bottom: '-80px',
    left: '-80px',
    animation: 'pulse 10s ease-in-out infinite reverse',
  },
  blob3: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)',
    top: '30%',
    left: '20%',
    animation: 'pulse 12s ease-in-out infinite',
  },
  loginCard: {
    background: 'var(--bg-glass)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
    position: 'relative',
    zIndex: 1,
  },
  brandSection: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  brandIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.75rem',
    boxShadow: '0 4px 20px var(--accent-primary-glow)',
  },
  brandTitle: {
    fontSize: 'var(--font-2xl)',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    marginBottom: '0.25rem',
  },
  brandSub: {
    fontSize: 'var(--font-sm)',
    color: 'var(--text-secondary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.875rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  submitBtn: {
    width: '100%',
    marginTop: '0.5rem',
    padding: '0.75rem',
    fontSize: 'var(--font-base)',
  },
  hint: {
    textAlign: 'center',
    fontSize: 'var(--font-xs)',
    color: 'var(--text-muted)',
    marginTop: '1.25rem',
  },
};
