import React, { useState } from 'react';
import axios from 'axios';

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
            <label style={{ color: '#cbd5e1', marginBottom: '8px', display: 'block' }}>
              Room Name
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
      border: '1px solid #334155', backgroundColor: '#0f172a',
      color: 'white', fontWeight: '700', letterSpacing: '0.08em',
    }}
  />
  <button
    type="button"
    onClick={() => setRoomName(generateRoomId())}
    style={{
      padding: '12px 14px', borderRadius: '8px',
      background: 'transparent', border: '1px solid #334155',
      color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem',
      transition: 'all 0.2s',
    }}
    title="Generate new room ID"
  >
    🔀
  </button>
</div>
          </div>

          <div className="form-group">
            <label style={{ color: '#cbd5e1', marginBottom: '8px', display: 'block' }}>
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
                border: '1px solid #334155', backgroundColor: '#0f172a',
                color: 'white', marginBottom: '16px',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onBack}
              className="btn-join"
              style={{ flex: 1 }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-create"
              style={{ flex: 1, opacity: loading ? 0.5 : 1 }}
              disabled={loading || !roomName.trim()}
            >
              {loading ? 'Creating...' : 'Initialize Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomView;