import React from 'react';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<Props> = ({ message, onConfirm, onCancel }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000,
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px',
        padding: '2rem', width: '100%', maxWidth: '380px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎬</div>
          <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px' }}>
            End Watch Party?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', margin: 0 }}>
            {message}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #dc2626, #ef4444)',
              border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            End Party 🔴
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
