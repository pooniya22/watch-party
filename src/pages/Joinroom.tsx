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
        <h3>Join Watch Party</h3>
        <p>Enter the unique room code shared by your friend.</p>

        <input
          type="text"
          placeholder="e.g. H7VATI2K"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          className="form-input"
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          autoFocus
        />

        {error && (
          <p style={{ color: '#f87171', fontSize: '13px', marginTop: '6px' }}>{error}</p>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleJoin}
            disabled={!code.trim() || loading}
            style={{ opacity: code.trim() && !loading ? 1 : 0.5 }}
          >
            {loading ? 'Checking...' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomModal;