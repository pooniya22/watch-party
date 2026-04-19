import React, { useState, useRef } from 'react';
import './SignUp.css';

const API = `${import.meta.env.VITE_API_URL}/api`;
interface SignUpProps {
    onSwitch: () => void;
    onSuccess: () => void;
}

const Signup: React.FC<SignUpProps> = ({ onSwitch, onSuccess }) => {
    const [username, setUsername] = useState('');
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    // Fix: type the ref as array of HTMLInputElement or null
    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

    // ---------- STEP 1: Send OTP ----------
    const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
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
            if (data.message === 'OTP sent') {
                setStep(2);
                startResendCooldown();
            } else {
                setError(data.message || 'Something went wrong');
            }
        } catch {
            setError('Network error. Is the server running?');
        }
        setLoading(false);
    };

    // ---------- STEP 2: Verify OTP ----------
    const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length < 6) {
            setError('Please enter the full 6-digit OTP');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpString }),
            });
            const data = await res.json();
            if (data.message === 'OTP verified') {
                setStep(3);
            } else {
                setError(data.message || 'Verification failed');
            }
        } catch {
            setError('Network error. Please try again.');
        }
        setLoading(false);
    };

    // ---------- STEP 3: Set Password ----------
    const handleSetCredientials = async (e: React.FormEvent<HTMLFormElement>) => {
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
                // 1. Save to session
                if (data.token) {
                    sessionStorage.setItem("token", data.token);
                    sessionStorage.setItem("username", username);
                    if (data.userId) sessionStorage.setItem("userId", data.userId);
                }

                // 2. Show the "Welcome aboard" text in SignUp
                setSuccess(true);
                setError(''); 

                // 3. Wait 2 seconds, then tell App.tsx to switch to Dashboard
                setTimeout(() => {
                    onSuccess(); 
                }, 2000);

            } else {
                setError(data.message || 'Registration failed');
            }
        } catch { 
            setError('Network error'); 
        } finally {
            setLoading(false);
        }
    };

    // ---------- OTP Input Handlers ----------
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // digits only
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        // Auto-focus next box
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length > 0) {
            const newOtp = [...otp];
            for (let i = 0; i < 6; i++) {
                newOtp[i] = pasted[i] || '';
            }
            setOtp(newOtp);
            const focusIdx = Math.min(pasted.length, 5);
            otpRefs.current[focusIdx]?.focus();
        }
    };

    // ---------- Resend Cooldown ----------
    const startResendCooldown = () => {
        setResendCooldown(30);
        const interval = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        setError('');
        try {
            const res = await fetch(`${API}/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (data.message === 'OTP resent') {
                startResendCooldown();
                setOtp(['', '', '', '', '', '']);
            } else {
                setError(data.message || 'Failed to resend');
            }
        } catch {
            setError('Network error');
        }
    };

    // ---------- Password Strength ----------
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

    const strength = getPasswordStrength(password);

    // ---------- RENDER ----------
    return (
        <div className="signup-page">
            <div className="signup-card">
                {/* Header */}
                <div className="signup-header">
                    <h1>{success ? '🎉 All Done!' : 'Create Account'}</h1>
                    {!success && (
                        <p>
                            {step === 1 && "Enter your email to get started"}
                            {step === 2 && `We sent a code to ${email}`}
                            {step === 3 && "Set a secure password"}
                        </p>
                    )}
                </div>

                {/* Step Indicator */}
                {!success && (
                    <div className="step-indicator">
                        {[1, 2, 3].map((s, i) => (
                            <React.Fragment key={s}>
                                <div
                                    className={`step-dot ${step > s ? 'completed' : step === s ? 'active' : 'inactive'
                                        }`}
                                >
                                    {step > s ? '✓' : s}
                                </div>
                                {i < 2 && (
                                    <div className={`step-line ${step > s ? 'completed' : ''}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && <div className="error-toast">{error}</div>}

                {/* Steps */}
                <div className="step-container">
                    {/* ---- STEP 1: Email ---- */}
                    {step === 1 && !success && (
                        <form className="step-content" onSubmit={handleSendOtp}>
                            <div className="form-group">
                                <label htmlFor="email-input">Email Address</label>
                                <input
                                    id="email-input"
                                    className="form-input"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    autoFocus
                                />
                            </div>
                            <button className="btn-primary" type="submit" disabled={loading}>
                                {loading ? <><span className="spinner" /> Sending...</> : 'Send OTP →'}
                            </button>
                        </form>
                    )}

                    {/* ---- STEP 2: OTP ---- */}
                    {step === 2 && !success && (
                        <form className="step-content" onSubmit={handleVerifyOtp}>
                            <div className="form-group">
                                <label>Enter 6-Digit Code</label>
                                <div className="otp-inputs" onPaste={handleOtpPaste}>
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => { otpRefs.current[i] = el; }}
                                            className={`otp-box ${digit ? 'filled' : ''}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            autoFocus={i === 0}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="resend-row">
                                {resendCooldown > 0 ? (
                                    <span>Resend in {resendCooldown}s</span>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={handleResendOtp}
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                            <button className="btn-primary" type="submit" disabled={loading}>
                                {loading ? <><span className="spinner" /> Verifying...</> : 'Verify OTP →'}
                            </button>
                        </form>
                    )}

                    {/* ---- STEP 3: Password ---- */}
                    {step === 3 && !success && (
                        <form className="step-content" onSubmit={handleSetCredientials}>
                            <div className="form-group">
                                <label htmlFor="username-input">Username</label>
                                <input id="username-input"
                                    className="form-input"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoFocus/>
                                    
                                <label htmlFor="password-input">Password</label>
                                <input
                                    id="password-input"
                                    className="form-input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min 6 characters"
                                    required
                                    minLength={6}
                                   
                                />
                                {strength && (
                                    <div className="password-strength">
                                        <div className="strength-bar">
                                            <div className={`strength-fill ${strength}`} />
                                        </div>
                                        <span className={`strength-label ${strength}`}>
                                            {strength === 'weak' && 'Weak'}
                                            {strength === 'medium' && 'Medium'}
                                            {strength === 'strong' && 'Strong 💪'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirm-password-input">Confirm Password</label>
                                <input
                                    id="confirm-password-input"
                                    className="form-input"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    required
                                    minLength={6}
                                />
                                {confirmPassword && (
                                    <div className={`password-match ${password === confirmPassword ? 'match' : 'no-match'}`}>
                                        {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                    </div>
                                )}
                            </div>
                            <button className="btn-primary" type="submit" disabled={loading || password !== confirmPassword}>
                                {loading ? <><span className="spinner" /> Creating...</> : 'Create Account ✨'}
                            </button>

                            <div className="resend-row" style={{ marginTop: '20px', textAlign: 'center' }}>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                                    Already have an account?{' '}
                                    <span 
                                        onClick={onSwitch} 
                                        style={{ color: '#a855f7', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Log in
                                    </span>
                                </p>
                            </div>
                        </form>
                    )}

                    {/* ---- SUCCESS ---- */}
                    {success && (
                        <div className="success-state">
                            <div className="success-checkmark">
                                <svg viewBox="0 0 24 24">
                                    <path d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2>Welcome aboard!</h2>
                            <p>Your account has been created successfully.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Signup;
