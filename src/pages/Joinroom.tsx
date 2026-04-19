import React, { useState } from 'react';
import axios from 'axios';

interface JoinProps {
  onClose: () => void;
  onJoin:  (code: string) => void;
}

const JoinRoomModal: React.FC<JoinProps> = ({ onClose, onJoin }) => {
  const [code,    setCode]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setError('');
    setLoading(true);

    try {
      // ✅ Authorization header added — verifyToken middleware reads Bearer token
      const token = sessionStorage.getItem("token");
      await axios.get(
        `${import.meta.env.VITE_API_URL}/api/room/validate/${trimmed}`,
        {
          headers:         { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      onJoin(trimmed); // only called when room is valid
    } catch (err: any) {
      // ✅ Handle 401 specifically — token expired or invalid
      if (err.response?.status === 401) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      setError(err.response?.data?.message || 'Room not found. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title" style={{ marginBottom: '8px' }}>Join Watch Party</h2>
        <p style={{ color: '#8c8276', fontSize: '0.9rem', marginBottom: '24px' }}>
          Enter the unique room code shared by your friend.
        </p>

        <div className="form-group">
          <label style={{ color: '#6b635a', marginBottom: '8px', display: 'block', fontSize: '0.9rem', fontWeight: 600 }}>
            Room Code
          </label>
          <input
            type="text"
            placeholder="e.g. COOL-ZONE-1234"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              border: '1px solid rgba(163, 124, 88, 0.3)', backgroundColor: '#ffffff',
              color: '#2a2520', fontWeight: '700', letterSpacing: '0.08em',
              outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
              marginBottom: '16px'
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#f87171', fontSize: '13px', marginTop: '6px' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={onClose}
            style={{ 
              flex: 1, padding: '12px', borderRadius: '100px', cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(163, 124, 88, 0.3)',
              color: '#6b635a', fontWeight: '600', fontSize: '0.95rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(163, 124, 88, 0.05)'; e.currentTarget.style.color = '#2a2520'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b635a'; }}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            style={{ 
              flex: 1, opacity: code.trim() && !loading ? 1 : 0.6, padding: '12px', 
              borderRadius: '100px', cursor: !code.trim() || loading ? 'not-allowed' : 'pointer',
              background: '#a37c58', border: 'none',
              color: 'white', fontWeight: '600', fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(163, 124, 88, 0.2)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { if(code.trim() && !loading) e.currentTarget.style.background = '#8a6543'; }}
            onMouseLeave={(e) => { if(code.trim() && !loading) e.currentTarget.style.background = '#a37c58'; }}
            disabled={!code.trim() || loading}
          >
            {loading ? 'Checking...' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomModal;