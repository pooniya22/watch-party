import React from 'react';
import { VideoOff, Power } from 'lucide-react';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<Props> = ({ message, onConfirm, onCancel }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(247, 244, 237, 0.7)', backdropFilter: 'blur(16px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000,
    }}>
      <div style={{
        background: '#fffdf8', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(163, 124, 88, 0.15)', borderRadius: '20px',
        padding: '2.5rem 2rem', width: '100%', maxWidth: '400px',
        boxShadow: '0 40px 80px rgba(163, 124, 88, 0.1), 0 0 60px rgba(163, 124, 88, 0.05)',
        animation: 'cardAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ 
              background: 'rgba(225, 29, 72, 0.08)', padding: '16px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <VideoOff size={38} strokeWidth={1.5} color="#e11d48" />
            </div>
          </div>
          <h2 style={{ color: '#2a2520', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px', fontFamily: '"Space Grotesk", sans-serif' }}>
            End Watch Party?
          </h2>
          <p style={{ color: '#6b635a', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
            {message}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '100px',
              background: 'transparent', border: '1px solid rgba(163, 124, 88, 0.3)',
              color: '#6b635a', fontSize: '0.92rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(163, 124, 88, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: '100px',
              background: 'linear-gradient(135deg, #e11d48, #f43f5e)',
              border: 'none', color: '#fff', fontSize: '0.92rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.08)'}
            onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
          >
            End Party <Power size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
