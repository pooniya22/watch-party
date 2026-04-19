import React, { useState } from 'react';
import { Clapperboard, Star, Sparkles, Check } from 'lucide-react';

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

  const ratingLabels = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Amazing!'];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(247, 244, 237, 0.7)', backdropFilter: 'blur(16px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#fffdf8',
        border: '1px solid rgba(163, 124, 88, 0.15)', borderRadius: '20px',
        padding: '2.5rem 2rem', width: '100%', maxWidth: '420px',
        boxShadow: '0 40px 80px rgba(163, 124, 88, 0.1), 0 0 60px rgba(163, 124, 88, 0.05)',
        animation: 'cardAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {!submitted ? (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <Clapperboard size={38} strokeWidth={1.5} color="#a37c58" />
              </div>
              <h2 style={{ color: '#2a2520', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px', fontFamily: '"Space Grotesk", sans-serif' }}>
                How was the party?
              </h2>
              <p style={{ color: '#6b635a', fontSize: '0.9rem', margin: 0 }}>
                Rate your experience in <strong style={{ color: '#a37c58' }}>{roomId}</strong>
              </p>
            </div>

            {/* Stars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
              {[1, 2, 3, 4, 5].map(star => {
                const isActive = hoveredStar >= star || rating >= star;
                return (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setRating(star)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      transform: isActive ? 'scale(1.2)' : 'scale(1)',
                    }}
                  >
                    <Star
                      size={36}
                      fill={isActive ? '#a37c58' : 'transparent'}
                      color={isActive ? '#a37c58' : '#d0c6ba'}
                      strokeWidth={1.5}
                      style={{ transition: 'all 0.2s' }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Rating label */}
            <div style={{
              textAlign: 'center', fontSize: '0.88rem', fontWeight: 700,
              color: rating > 0 || hoveredStar > 0 ? '#a37c58' : 'transparent',
              height: '24px', marginBottom: '20px',
              transition: 'color 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em'
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
                width: '100%', padding: '14px', borderRadius: '12px',
                background: 'rgba(163, 124, 88, 0.04)', border: '1px solid rgba(163, 124, 88, 0.15)',
                color: '#2a2520', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif',
                outline: 'none', resize: 'none',
                transition: 'border-color 0.2s, background 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#a37c58';
                e.target.style.background = 'rgba(163, 124, 88, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(163, 124, 88, 0.15)';
                e.target.style.background = 'rgba(163, 124, 88, 0.04)';
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#8c8276', marginTop: '6px' }}>
              {comment.length}/500
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={onSkip}
                style={{
                  flex: 1, padding: '12px', borderRadius: '100px',
                  background: 'transparent', border: '1px solid rgba(163, 124, 88, 0.3)',
                  color: '#6b635a', fontSize: '0.92rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(163, 124, 88, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || submitting}
                style={{
                  flex: 1, padding: '12px', borderRadius: '100px',
                  background: rating > 0 ? 'linear-gradient(135deg, #a37c58, #c6a282)' : 'rgba(163, 124, 88, 0.2)',
                  border: 'none', color: '#fff', fontSize: '0.92rem', fontWeight: 700,
                  cursor: rating > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s', opacity: submitting ? 0.8 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
                onMouseEnter={(e) => { if (rating > 0 && !submitting) e.currentTarget.style.filter = 'brightness(1.05)'}}
                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
              >
                {submitting ? 'Sending...' : (
                  <>Submit <Sparkles size={16} /></>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Success State */
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: '74px', height: '74px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'checkPop 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 12px 30px rgba(16,185,129,0.2)',
            }} className="text-white">
              <Check size={36} color="white" strokeWidth={3} />
            </div>
            <h2 style={{ color: '#2a2520', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px', fontFamily: '"Space Grotesk", sans-serif' }}>
              Thanks for the feedback!
            </h2>
            <p style={{ color: '#6b635a', fontSize: '0.9rem', margin: 0 }}>
              Redirecting you back...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
