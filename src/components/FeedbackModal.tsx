import React, { useState } from 'react';

interface Props {
  roomId: string;
  username: string;
  onSubmit: () => void;
  onSkip: () => void;
}

const FeedbackModal: React.FC<Props> = ({ roomId, username, onSubmit, onSkip }) => {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem('token');
      await fetch('http://localhost:3000/api/room/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId, rating, comment, username }),
      });
      setSubmitted(true);
      setTimeout(() => onSubmit(), 1500);
    } catch (err) {
      console.error('Feedback error:', err);
      onSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Terrible 😞', 'Bad 😕', 'Okay 😐', 'Good 😊', 'Amazing! 🎉'];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px',
        padding: '2rem', width: '100%', maxWidth: '420px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        animation: 'cardAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {!submitted ? (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎬</div>
              <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px' }}>
                How was the party?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', margin: 0 }}>
                Rate your experience in <strong style={{ color: '#a855f7' }}>{roomId}</strong>
              </p>
            </div>

            {/* Stars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(star)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '2rem', transition: 'transform 0.2s, filter 0.2s',
                    transform: (hoveredStar >= star || rating >= star) ? 'scale(1.2)' : 'scale(1)',
                    filter: (hoveredStar >= star || rating >= star) ? 'none' : 'grayscale(100%) opacity(0.3)',
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>

            {/* Rating label */}
            <div style={{
              textAlign: 'center', fontSize: '0.88rem', fontWeight: 600,
              color: rating > 0 ? '#a855f7' : 'transparent',
              height: '24px', marginBottom: '16px',
              transition: 'color 0.2s',
            }}>
              {ratingLabels[hoveredStar || rating]}
            </div>

            {/* Comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts (optional)..."
              maxLength={500}
              rows={3}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif',
                outline: 'none', resize: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              {comment.length}/500
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={onSkip}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || submitting}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  background: rating > 0 ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#334155',
                  border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 700,
                  cursor: rating > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s', opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Sending...' : 'Submit ✨'}
              </button>
            </div>
          </>
        ) : (
          /* Success State */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '70px', height: '70px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '2rem',
              animation: 'checkPop 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 0 30px rgba(16,185,129,0.3)',
            }}>
              ✓
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.3rem', margin: '0 0 6px' }}>Thanks for the feedback!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', margin: 0 }}>Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
