import React, { useState } from 'react';
import './SignUp.css'; 

const API = `${import.meta.env.VITE_API_URL}/api`;
interface AuthProps {
  onSwitch: () => void;
  onSuccess: () => void;
}

const Login: React.FC<AuthProps> = ({ onSwitch, onSuccess }) =>  {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false); // Added success state

   const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
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
            sessionStorage.setItem("token", data.token);
            sessionStorage.setItem("username", data.username);
            if (data.userId) sessionStorage.setItem("userId", data.userId);
            setSuccess(true);
            
            setTimeout(() => {
                onSuccess(); // Triggers the view change in App.tsx
            }, 2000);
        } else {
                setError(data.message || 'Invalid email or password');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-page">
            <div className="signup-card">
                
                <div className="signup-header">
                    <h1>{success ? '👋 Welcome Back!' : 'Login'}</h1>
                    <p>{success ? 'You have successfully logged in.' : 'Login to join the Watch Party'}</p>
                </div>

                {error && !success && <div className="error-toast">{error}</div>}

                <div className="step-container">
                    {!success ? (
                        <form className="step-content" onSubmit={handleLogin}>
                            <div className="form-group">
                                <label htmlFor="login-email">Email Address</label>
                                <input
                                    id="login-email"
                                    className="form-input"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="login-password">Password</label>
                                <input
                                    id="login-password"
                                    className="form-input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            <button className="btn-primary" type="submit" disabled={loading}>
                                {loading ? "Logging in..." : "Login →"}
                            </button>

                            <div className="resend-row" style={{ marginTop: '20px', textAlign: 'center' }}>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                                    Don't have an account?{' '}
                                    <span 
                                        onClick={onSwitch} 
                                        style={{ color: '#a855f7', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Sign up
                                    </span>
                                </p>
                            </div>
                        </form>
                    ) : (
                        /* SUCCESS POPUP AREA */
                        <div className="success-state">
                            <div className="success-checkmark">
                                <svg viewBox="0 0 24 24" style={{ width: '48px', height: '48px' }}>
                                    <path 
                                        fill="none" 
                                        stroke="#4BB543" 
                                        strokeWidth="3" 
                                        d="M5 13l4 4L19 7" 
                                    />
                                </svg>
                            </div>
                            <h2>Successfully Logged In!</h2>
                            <p>Taking you to the watch party...</p>
                            <div className="spinner" style={{ margin: '20px auto' }}></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Login;
