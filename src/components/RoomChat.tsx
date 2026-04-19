import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Socket } from 'socket.io-client';
import { Send, Smile, MessageSquare } from 'lucide-react';

interface ChatMessage {
  userId: string;
  username: string;
  text: string;
  role?: string;
  timestamp: number;
}

interface Props {
  socket: Socket | null;
  roomId: string;
  username: string;
  myUserId: string;
  myRole: string;
  messages: ChatMessage[];
}

const ROLE_BADGE_COLOR: Record<string, string> = {
  HOST:        '#f59e0b',
  MODERATOR:   '#a78bfa',
  PARTICIPANT: '#38bdf8',
  VIEWER:      '#44445a',
};

const RoomChat: React.FC<Props> = ({ socket, roomId, username, myUserId, myRole, messages }) => {
  const [input,      setInput]      = useState('');
  const [showEmoji,  setShowEmoji]  = useState(false);
  const [chatError,  setChatError]  = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isViewer  = myRole === 'VIEWER';

  useEffect(() => {
    if (!socket) return;
    const handleChatError = (data: { message: string }) => {
      setChatError(data.message);
      setTimeout(() => setChatError(null), 3000);
    };
    socket.on('chat_error', handleChatError);
    return () => { socket.off('chat_error', handleChatError); };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socket || isViewer) return;
    const sanitized = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 500);
    socket.emit('send_chat', { roomId, username, text: sanitized });
    setInput('');
    setShowEmoji(false);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-surface)',
      borderRadius: '12px',
      border: '1px solid rgba(163, 124, 88, 0.15)',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(163, 124, 88, 0.15)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} color="#a37c58" />
          <span style={{ color: '#2a2520', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.02em' }}>Live Chat</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#6b635a', fontWeight: 600 }}>{messages.length} msgs</span>
      </div>

      {/* Error */}
      {chatError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5',
          padding: '6px 12px', fontSize: '0.78rem', textAlign: 'center',
          borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
        }}>
          {chatError}
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 10px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--bg-hover) transparent',
      }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center' }}>
            <MessageSquare size={32} color="#cdc6bd" style={{ marginBottom: '8px' }} />
            <p style={{ color: '#8c8276', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>No messages yet. Say hi!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.userId === myUserId || msg.username === username;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {!isMe && (
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a37c58, #c6a282)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: '0.72rem', color: '#6b635a', fontWeight: 600 }}>{isMe ? 'You' : msg.username}</span>
                {msg.role && (
                  <span style={{
                    fontSize: '0.62rem', color: ROLE_BADGE_COLOR[msg.role] || '#8c8276',
                    fontWeight: 700, letterSpacing: '0.04em',
                    background: 'rgba(163, 124, 88, 0.08)',
                    padding: '2px 6px', borderRadius: '4px',
                  }}>
                    {msg.role}
                  </span>
                )}
              </div>
              <div style={{
                background: isMe ? 'rgba(163, 124, 88, 0.15)' : '#ffffff',
                border: isMe ? '1px solid rgba(163, 124, 88, 0.25)' : '1px solid rgba(163, 124, 88, 0.15)',
                color: '#2a2520',
                padding: '8px 12px',
                borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                maxWidth: '85%',
                fontSize: '0.88rem',
                wordBreak: 'break-word',
                lineHeight: '1.5',
                boxShadow: isMe ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
              }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Emoji Picker */}
      {showEmoji && !isViewer && (
        <div style={{ borderTop: '1px solid rgba(163, 124, 88, 0.15)' }}>
          <EmojiPicker onEmojiClick={(e) => setInput(p => p + e.emoji)} theme={"light" as any} width="100%" height={400} />
        </div>
      )}

      {/* Input */}
      {isViewer ? (
        <div style={{
          padding: '12px 14px', textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          color: '#44445a', fontSize: '0.78rem',
        }}>
          Viewers cannot chat — ask the Host to upgrade your role.
        </div>
      ) : (
        <div style={{
          display: 'flex', gap: '8px', padding: '10px 12px',
          borderTop: '1px solid rgba(163, 124, 88, 0.15)',
          alignItems: 'center', backgroundColor: '#ffffff',
          borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px',
        }}>
          <button
            onClick={() => setShowEmoji(p => !p)}
            style={{
              background: showEmoji ? 'rgba(163, 124, 88, 0.1)' : 'transparent',
              border: 'none', cursor: 'pointer', padding: '8px',
              borderRadius: '8px', display: 'flex', alignItems: 'center',
              transition: 'background 0.2s',
            }}
          >
            <Smile size={18} color={showEmoji ? '#a37c58' : '#8c8276'} />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            maxLength={500}
            style={{
              flex: 1,
              background: '#fcfcfc',
              color: '#2a2520',
              border: '1px solid rgba(163, 124, 88, 0.2)',
              borderRadius: '8px',
              padding: '9px 12px',
              fontSize: '0.9rem',
              outline: 'none',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              background: 'rgba(163, 124, 88, 0.15)',
              border: '1px solid rgba(163, 124, 88, 0.25)',
              color: '#a37c58',
              borderRadius: '8px',
              padding: '9px 12px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default RoomChat;