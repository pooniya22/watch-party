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
      border: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <MessageSquare size={14} color="#8a5cf6" />
          <span style={{ color: '#f0f0ff', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.02em' }}>Live Chat</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#44445a', fontWeight: 500 }}>{messages.length} msgs</span>
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
            <MessageSquare size={28} color="#44445a" style={{ marginBottom: '8px' }} />
            <p style={{ color: '#44445a', fontSize: '0.8rem', margin: 0 }}>No messages yet. Say hi!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.userId === myUserId || msg.username === username;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                {!isMe && (
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8a5cf6, #f059da)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: '0.68rem', color: '#8888aa', fontWeight: 600 }}>{isMe ? 'You' : msg.username}</span>
                {msg.role && (
                  <span style={{
                    fontSize: '0.58rem', color: ROLE_BADGE_COLOR[msg.role] || '#44445a',
                    fontWeight: 700, letterSpacing: '0.04em',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '1px 5px', borderRadius: '4px',
                  }}>
                    {msg.role}
                  </span>
                )}
              </div>
              <div style={{
                background: isMe ? 'rgba(138, 92, 246, 0.25)' : 'rgba(255,255,255,0.05)',
                border: isMe ? '1px solid rgba(138, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                color: '#f0f0ff',
                padding: '7px 11px',
                borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                maxWidth: '85%',
                fontSize: '0.83rem',
                wordBreak: 'break-word',
                lineHeight: '1.5',
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
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <EmojiPicker onEmojiClick={(e) => setInput(p => p + e.emoji)} theme={"dark" as any} width="100%" height={400} />
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
          display: 'flex', gap: '6px', padding: '8px 10px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          alignItems: 'center',
        }}>
          <button
            onClick={() => setShowEmoji(p => !p)}
            style={{
              background: showEmoji ? 'rgba(20, 8, 49, 0.15)' : 'none',
              border: 'none', cursor: 'pointer', padding: '6px',
              borderRadius: '6px', display: 'flex', alignItems: 'center',
              transition: 'background 0.2s',
            }}
          >
            <Smile size={16} color={showEmoji ? '#8a5cf6' : '#44445a'} />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            maxLength={500}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              color: '#f0f0ff',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '0.83rem',
              outline: 'none',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              background: 'rgba(138, 92, 246, 0.2)',
              border: '1px solid rgba(138, 92, 246, 0.3)',
              color: '#a78bfa',
              borderRadius: '8px',
              padding: '7px 10px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default RoomChat;