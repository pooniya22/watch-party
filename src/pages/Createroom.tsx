import React, { useState } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';

interface CreateRoomProps {
  onBack:   () => void;
  onCreate: (roomId: string) => void;
}
const generateRoomId = () => {
  const adjectives = ['COOL', 'DARK', 'NEON', 'WILD', 'EPIC', 'CHILL', 'VIBE', 'LOUD', 'FIRE'];
  const nouns      = ['SQUAD', 'PARTY', 'CREW', 'GANG', 'NIGHT', 'ZONE', 'WAVE'];
  const num        = Math.floor(1000 + Math.random() * 9000);
  const adj        = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun       = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}-${num}`;
};





const CreateRoomView: React.FC<CreateRoomProps> = ({ onBack, onCreate }) => {
  const [roomName,     setRoomName]     = useState(generateRoomId());
  const [participants, setParticipants] = useState(10);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = roomName.trim().toUpperCase();
    if (!trimmed) return;

    setError('');
    setLoading(true);

    try {
      // ✅ Authorization header added — verifyToken middleware reads Bearer token
      const token = sessionStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/room/create`,
        {
          roomId:          trimmed,
          maxParticipants: participants,
        },
        {
          headers:         { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      // Room saved in DB — pass roomId up so Dashboard emits create_room socket event
      onCreate(trimmed);
      onBack(); // close modal after creation
    } catch (err: any) {
      // ✅ Handle 401 specifically — token expired or invalid
      if (err.response?.status === 401) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      setError(err.response?.data?.message || 'Failed to create room. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onBack}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Create Watch Party</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ color: '#6b635a', marginBottom: '8px', display: 'block', fontSize: '0.9rem', fontWeight: 600 }}>
              Room Code
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
  <input
    type="text"
    className="form-input"
    value={roomName}
    onChange={(e) => { setRoomName(e.target.value.toUpperCase()); setError(''); }}
    required
    autoFocus
    style={{
      flex: 1, padding: '12px', borderRadius: '8px',
      border: '1px solid rgba(163, 124, 88, 0.3)', backgroundColor: '#ffffff',
      color: '#2a2520', fontWeight: '700', letterSpacing: '0.08em',
      outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
    }}
  />
  <button
    type="button"
    onClick={() => setRoomName(generateRoomId())}
    style={{
      padding: '0 16px', borderRadius: '8px',
      background: 'rgba(163, 124, 88, 0.05)', border: '1px solid rgba(163, 124, 88, 0.2)',
      color: '#a37c58', cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(163, 124, 88, 0.1)'; e.currentTarget.style.color = '#8a6543'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(163, 124, 88, 0.05)'; e.currentTarget.style.color = '#a37c58'; }}
    title="Generate new room code"
  >
    <RefreshCw size={18} />
  </button>
</div>
          </div>

          <div className="form-group">
            <label style={{ color: '#6b635a', marginBottom: '8px', display: 'block', fontSize: '0.9rem', fontWeight: 600 }}>
              Max Participants
            </label>
            <input
              type="number"
              min="2"
              max="50"
              value={participants}
              onChange={(e) => setParticipants(parseInt(e.target.value))}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                border: '1px solid rgba(163, 124, 88, 0.3)', backgroundColor: '#ffffff',
                color: '#2a2520', marginBottom: '24px', fontWeight: '500',
                outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onBack}
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
              type="submit"
              style={{ 
                flex: 1, opacity: loading || !roomName.trim() ? 0.6 : 1, padding: '12px', 
                borderRadius: '100px', cursor: loading || !roomName.trim() ? 'not-allowed' : 'pointer',
                background: '#a37c58', border: 'none',
                color: 'white', fontWeight: '600', fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(163, 124, 88, 0.2)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { if(!loading && roomName.trim()) e.currentTarget.style.background = '#8a6543'; }}
              onMouseLeave={(e) => { if(!loading && roomName.trim()) e.currentTarget.style.background = '#a37c58'; }}
              disabled={loading || !roomName.trim()}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomView;