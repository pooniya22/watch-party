import React, { useState, useRef } from 'react';
import './LandingPage.css';

const API = `${import.meta.env.VITE_API_URL}/api`;

interface Props {
  onSuccess: () => void;
}

// ─── SIGNUP LOGIC ─────────────────────────────────────────
const getPasswordStrength = (pw: string) => {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
};

// ─── LOGIN FORM ───────────────────────────────────────────
const LoginForm: React.FC<{ onSwitch: () => void; onSuccess: () => void }> = ({ onSwitch, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('username', data.username);
        if (data.userId) sessionStorage.setItem('userId', data.userId);
        setSuccess(true);
        setTimeout(() => onSuccess(), 1500);
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="lp-success">
      <div className="lp-success-icon">✓</div>
      <p>Welcome back!</p>
    </div>
  );

  return (
    <form onSubmit={handleLogin} className="lp-form">
      {error && <div className="lp-error">{error}</div>}
      <div className="lp-field">
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com" required autoFocus />
      </div>
      <div className="lp-field">
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Your password" required />
      </div>
      <button type="submit" className="lp-btn-primary" disabled={loading}>
        {loading ? <span className="lp-spinner" /> : 'Sign in →'}
      </button>
      <p className="lp-switch">
        New here?{' '}
        <span onClick={onSwitch}>Create account</span>
      </p>
    </form>
  );
};

// ─── SIGNUP FORM ──────────────────────────────────────────
const SignupForm: React.FC<{ onSwitch: () => void; onSuccess: () => void }> = ({ onSwitch, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const startResendCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.message === 'OTP sent') { setStep(2); startResendCooldown(); }
      else setError(data.message || 'Something went wrong');
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) { setError('Enter all 6 digits'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpString }),
      });
      const data = await res.json();
      if (data.message === 'OTP verified') setStep(3);
      else setError(data.message || 'Verification failed');
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const handleSetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError('Password too short');
    if (password !== confirmPassword) return setError('Passwords do not match');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) {
          sessionStorage.setItem('token', data.token);
          sessionStorage.setItem('username', username);
          if (data.userId) sessionStorage.setItem('userId', data.userId);
        }
        setSuccess(true);
        setTimeout(() => onSuccess(), 1500);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
      setOtp(newOtp);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const strength = getPasswordStrength(password);

  if (success) return (
    <div className="lp-success">
      <div className="lp-success-icon">✓</div>
      <p>Account created!</p>
    </div>
  );

  return (
    <div className="lp-form">
      {/* Step dots */}
      <div className="lp-steps">
        {[1,2,3].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`lp-step-dot ${step > s ? 'done' : step === s ? 'active' : ''}`}>
              {step > s ? '✓' : s}
            </div>
            {i < 2 && <div className={`lp-step-line ${step > s ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="lp-error">{error}</div>}

      {step === 1 && (
        <form onSubmit={handleSendOtp}>
          <div className="lp-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoFocus />
          </div>
          <button type="submit" className="lp-btn-primary" disabled={loading}>
            {loading ? <span className="lp-spinner" /> : 'Send OTP →'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp}>
          <div className="lp-field">
            <label>6-digit code sent to {email}</label>
            <div className="lp-otp-row" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input key={i} ref={el => { otpRefs.current[i] = el; }}
                  className={`lp-otp-box ${digit ? 'filled' : ''}`}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0} />
              ))}
            </div>
          </div>
          <div className="lp-resend">
            {resendCooldown > 0 ? <span>Resend in {resendCooldown}s</span> :
              <button type="button" onClick={async () => {
                const res = await fetch(`${API}/resend-otp`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email }),
                });
                const data = await res.json();
                if (data.message === 'OTP resent') { startResendCooldown(); setOtp(['','','','','','']); }
              }}>Resend OTP</button>}
          </div>
          <button type="submit" className="lp-btn-primary" disabled={loading}>
            {loading ? <span className="lp-spinner" /> : 'Verify →'}
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSetCredentials}>
          <div className="lp-field">
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="coolname" required autoFocus />
          </div>
          <div className="lp-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters" required minLength={6} />
            {strength && (
              <div className="lp-strength">
                <div className="lp-strength-bar">
                  <div className={`lp-strength-fill ${strength}`} />
                </div>
                <span className={`lp-strength-label ${strength}`}>
                  {strength === 'weak' ? 'Weak' : strength === 'medium' ? 'Medium' : 'Strong 💪'}
                </span>
              </div>
            )}
          </div>
          <div className="lp-field">
            <label>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password" required minLength={6} />
            {confirmPassword && (
              <span className={`lp-match ${password === confirmPassword ? 'ok' : 'no'}`}>
                {password === confirmPassword ? '✓ Match' : '✗ No match'}
              </span>
            )}
          </div>
          <button type="submit" className="lp-btn-primary"
            disabled={loading || password !== confirmPassword}>
            {loading ? <span className="lp-spinner" /> : 'Create Account ✨'}
          </button>
        </form>
      )}

      <p className="lp-switch">
        Already have an account?{' '}
        <span onClick={onSwitch}>Sign in</span>
      </p>
    </div>
  );
};

// ─── MAIN LANDING PAGE ────────────────────────────────────
const LandingPage: React.FC<Props> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="lp-root">
      {/* Abstract background shapes */}
      <div className="lp-bg">
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />
        <div className="lp-grid" />
      </div>

      {/* Header */}
      <header className="lp-header">
        <div className="lp-logo">Watch_party</div>
        <div className="lp-header-tabs">
          <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Sign in</button>
          <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>Sign up</button>
        </div>
      </header>

      <main className="lp-main">
        {/* LEFT: Hero */}
        <div className="lp-hero">
          <div className="lp-hero-tag">🎬 Watch together, anywhere</div>
          <h1 className="lp-hero-title">
            Your squad.<br />
            One screen.<br />
            <span>Synchronized.</span>
          </h1>
          <p className="lp-hero-sub">
            Drop a YouTube link, invite your people, and watch in perfect sync — with live chat, roles, and no lag.
          </p>

          {/* Feature pills */}
          <div className="lp-features">
            <div className="lp-feature">
              <span>▶</span> YouTube sync
            </div>
            <div className="lp-feature">
              <span>💬</span> Live chat
            </div>
            <div className="lp-feature">
              <span>👑</span> Host controls
            </div>
            <div className="lp-feature">
              <span>⚡</span> Real-time
            </div>
          </div>

          {/* Abstract decorative card */}
          <div className="lp-mockup">
            <div className="lp-mockup-bar">
              <span /><span /><span />
            </div>
            <div className="lp-mockup-screen">
              <div className="lp-mockup-player">
                <div className="lp-mockup-play">▶</div>
              </div>
              <div className="lp-mockup-chat">
                <div className="lp-mockup-msg"><b>Vijay</b> omg this part 🔥</div>
                <div className="lp-mockup-msg right"><b>You</b> yesss bro 😭</div>
                <div className="lp-mockup-msg"><b>Priya</b> rewind rewind!!!</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Auth card */}
        <div className="lp-auth-wrap">
          <div className="lp-auth-card">
            {/* Toggle */}
            <div className="lp-auth-toggle">
              <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
                Sign in
              </button>
              <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>
                Sign up
              </button>
            </div>

            <div className="lp-auth-title">
              {authMode === 'login' ? 'Welcome back 👋' : 'Join the party 🎉'}
            </div>

            {authMode === 'login' ? (
              <LoginForm onSwitch={() => setAuthMode('signup')} onSuccess={onSuccess} />
            ) : (
              <SignupForm onSwitch={() => setAuthMode('login')} onSuccess={onSuccess} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
