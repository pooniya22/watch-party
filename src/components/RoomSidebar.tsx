import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { MessageSquare, Users, Search, Crown, Shield, Eye, Drama, Check, X, Loader2 } from 'lucide-react';
import RoomChat from './RoomChat';

interface ChatMessage {
  userId: string; username: string; text: string; role?: string; timestamp: number;
}
interface RoomUser {
  userId: string; username: string; role: 'HOST' | 'MODERATOR' | 'PARTICIPANT' | 'VIEWER';
}
interface RoleRequestItem {
  requestId: string; fromUserId: string; fromUsername: string; requestedRole: string; timestamp: number;
}
interface Props {
  participants: RoomUser[]; myRole: string; myUserId: string;
  handleAssignRole: (userId: string, role: string) => void;
  handleKickUser: (userId: string) => void;
  socket: Socket | null; roomId: string; username: string;
  onSearchVideo?: (videoId: string) => void;
  incomingRequests: RoleRequestItem[]; myPendingRequest: string | null;
  onRequestRoleUpgrade: (requestedRole: string) => void;
  onRespondRoleRequest: (requestId: string, approved: boolean) => void;
  handleTransferHost: (userId: string) => void;
  externalSearchQuery?: string;
}

const ROLE_COLOR: Record<string, string> = {
  HOST: '#f59e0b', MODERATOR: '#a78bfa', PARTICIPANT: '#38bdf8', VIEWER: '#44445a',
};

const RoleIcon = ({ role, size = 12 }: { role: string; size?: number }) => {
  if (role === 'HOST')        return <Crown    size={size} color="#f59e0b" />;
  if (role === 'MODERATOR')   return <Shield   size={size} color="#a78bfa" />;
  if (role === 'PARTICIPANT') return <Drama    size={size} color="#38bdf8" />;
  return <Eye size={size} color="#44445a" />;
};

const RoomSidebar: React.FC<Props> = ({
  participants, myRole, myUserId, handleAssignRole, handleKickUser,
  socket, roomId, username, onSearchVideo,
  incomingRequests, myPendingRequest, onRequestRoleUpgrade, onRespondRoleRequest,
  handleTransferHost, externalSearchQuery,
}) => {
  const [tab,               setTab]               = useState<'chat' | 'users' | 'search'>('chat');
  const [searchQuery,       setSearchQuery]       = useState('');
  const [searchResults,     setSearchResults]     = useState<any[]>([]);
  const [isSearching,       setIsSearching]       = useState(false);
  const [unreadCount,       setUnreadCount]       = useState(0);
  const [messages,          setMessages]          = useState<ChatMessage[]>([]);
  const [searchNextPage,    setSearchNextPage]    = useState<string | null>(null);
  const [isLoadingMore,     setIsLoadingMore]     = useState(false);
  const searchLoadMoreRef   = useRef<HTMLDivElement | null>(null);
  const searchObserverRef   = useRef<IntersectionObserver | null>(null);
  const hostUser            = participants.find(p => p.role === 'HOST');

  useEffect(() => {
    if (!socket) return;
    const handleNewChat = (msg: ChatMessage) => {
      setMessages(prev => [...prev.slice(-200), msg]);
      if (tab !== 'chat') setUnreadCount(prev => prev + 1);
    };
    socket.on('receive_chat', handleNewChat);
    return () => { socket.off('receive_chat', handleNewChat); };
  }, [socket, tab]);

  useEffect(() => {
    if (externalSearchQuery) {
      setSearchQuery(externalSearchQuery);
      setTab('search');
      handleSearchDirect(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  useEffect(() => {
    if (searchObserverRef.current) searchObserverRef.current.disconnect();
    searchObserverRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && searchNextPage && !isLoadingMore) handleSearchMore(searchNextPage);
    }, { threshold: 0.1 });
    if (searchLoadMoreRef.current) searchObserverRef.current.observe(searchLoadMoreRef.current);
    return () => { searchObserverRef.current?.disconnect(); };
  }, [searchNextPage, isLoadingMore]);

  const handleSearchDirect = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true); setSearchResults([]);
    try {
      const API_KEY = (import.meta as any).env.VITE_YOUTUBE_API_KEY;
      const res  = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`);
      const data = await res.json();
      if (data.items) { setSearchResults(data.items); setSearchNextPage(data.nextPageToken || null); }
    } catch (e) { console.error(e); }
    finally { setIsSearching(false); }
  };

  const handleSearchMore = async (pageToken: string) => {
    if (!searchQuery.trim()) return;
    setIsLoadingMore(true);
    try {
      const API_KEY = (import.meta as any).env.VITE_YOUTUBE_API_KEY;
      const res  = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(searchQuery)}&type=video&key=${API_KEY}&pageToken=${pageToken}`);
      const data = await res.json();
      if (data.items) { setSearchResults(prev => [...prev, ...data.items]); setSearchNextPage(data.nextPageToken || null); }
    } catch (e) { console.error(e); }
    finally { setIsLoadingMore(false); }
  };

  const canRequestUpgrade = (myRole === 'PARTICIPANT' || myRole === 'VIEWER') && !myPendingRequest;

  const tabs = [
    { key: 'chat'   as const, icon: MessageSquare, label: 'Chat',   badge: unreadCount },
    { key: 'users'  as const, icon: Users,         label: `${participants.length}`, badge: myRole === 'HOST' ? incomingRequests.length : 0 },
    ...(myRole === 'HOST' || myRole === 'MODERATOR'
      ? [{ key: 'search' as const, icon: Search, label: 'Search', badge: 0 }]
      : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '12px' }}>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '4px',
        background: 'rgba(255,255,255,0.04)',
        padding: '4px', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {tabs.map(({ key, icon: Icon, label, badge }) => {
          const isActive = tab === key;
          return (
            <button key={key}
              onClick={() => { setTab(key); if (key === 'chat') setUnreadCount(0); }}
              style={{
                flex: 1, padding: '7px 6px',
                background: isActive ? 'rgba(138, 92, 246, 0.2)' : 'transparent',
                color: isActive ? '#a78bfa' : '#44445a',
                border: isActive ? '1px solid rgba(138, 92, 246, 0.25)' : '1px solid transparent',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
                borderRadius: '7px', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                position: 'relative',
                fontFamily: 'Space Grotesk, sans-serif',
              }}
            >
              <Icon size={13} />
              {label}
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#ef4444', color: 'white', borderRadius: '50%',
                  width: '16px', height: '16px', fontSize: '0.6rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg-base)',
                }}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CHAT TAB ── */}
      {tab === 'chat' && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <RoomChat socket={socket} roomId={roomId} username={username} myUserId={myUserId} myRole={myRole} messages={messages} />
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Role Requests */}
          {myRole === 'HOST' && incomingRequests.length > 0 && (
            <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '10px' }}>
              <p style={{ color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Crown size={11} /> Role Requests ({incomingRequests.length})
              </p>
              {incomingRequests.map(req => (
                <div key={req.requestId} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 10px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#f0f0ff', fontSize: '0.82rem', fontWeight: 600 }}>{req.fromUsername}</span>
                    <span style={{ fontSize: '0.68rem', color: ROLE_COLOR[req.requestedRole] || '#a78bfa', fontWeight: 700 }}>→ {req.requestedRole}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => onRespondRoleRequest(req.requestId, true)}
                      style={{ flex: 1, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '6px', padding: '5px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Check size={11} /> Approve
                    </button>
                    <button onClick={() => onRespondRoleRequest(req.requestId, false)}
                      style={{ flex: 1, background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '5px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <X size={11} /> Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Request Upgrade */}
          {canRequestUpgrade && (
            <div style={{ background: 'rgba(138, 92, 246, 0.06)', border: '1px solid rgba(138, 92, 246, 0.2)', borderRadius: '10px', padding: '10px' }}>
              <p style={{ color: '#8888aa', fontSize: '0.72rem', fontWeight: 600, margin: '0 0 8px' }}>Request Role Upgrade</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {myRole === 'VIEWER' && (
                  <button onClick={() => onRequestRoleUpgrade('PARTICIPANT')}
                    style={{ flex: 1, background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px', padding: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.73rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Drama size={11} /> Participant
                  </button>
                )}
                <button onClick={() => onRequestRoleUpgrade('MODERATOR')}
                  style={{ flex: 1, background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.2)', borderRadius: '6px', padding: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.73rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Shield size={11} /> Moderator
                </button>
              </div>
            </div>
          )}

          {/* Pending */}
          {myPendingRequest && (
            <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <p style={{ color: '#f59e0b', fontSize: '0.8rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Loader2 size={12} /> Role request pending...
              </p>
            </div>
          )}

          {/* Stats */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '7px', marginBottom: '7px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#8888aa', display: 'flex', alignItems: 'center', gap: '5px' }}><Crown size={11} color="#f59e0b" /> Host</span>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>{hostUser?.username ?? 'N/A'}</span>
            </div>
            {[
              { label: 'Total',        count: participants.length,                                      color: '#f0f0ff' },
              { label: 'Moderators',   count: participants.filter(p => p.role === 'MODERATOR').length,  color: '#a78bfa' },
              { label: 'Participants', count: participants.filter(p => p.role === 'PARTICIPANT').length, color: '#38bdf8' },
              { label: 'Viewers',      count: participants.filter(p => p.role === 'VIEWER').length,     color: '#44445a' },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#8888aa' }}>{label}</span>
                <strong style={{ color }}>{count}</strong>
              </div>
            ))}
          </div>

          {/* Participants List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {participants.map(user => (
              <div key={user.userId} style={{
                background: user.userId === myUserId ? 'rgba(138, 92, 246, 0.06)' : 'rgba(255,255,255,0.02)',
                border: user.userId === myUserId ? '1px solid rgba(138, 92, 246, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                borderRadius: '10px', padding: '10px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{
                      width: '26px', height: '26px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8a5cf6, #f059da)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ color: '#f0f0ff', fontWeight: 600, fontSize: '0.82rem' }}>
                        {user.username}
                        {user.userId === myUserId && <span style={{ color: '#44445a', fontSize: '0.68rem', marginLeft: '4px' }}>(you)</span>}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: '6px' }}>
                    <RoleIcon role={user.role} size={10} />
                    <span style={{ fontSize: '0.65rem', color: ROLE_COLOR[user.role], fontWeight: 700 }}>{user.role}</span>
                  </div>
                </div>

                {/* Host Controls */}
                {myRole === 'HOST' && user.userId !== myUserId && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <select value={user.role} onChange={e => handleAssignRole(user.userId, e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#f0f0ff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', flex: 1, padding: '5px 8px', fontSize: '0.75rem', outline: 'none' }}>
                        <option value="MODERATOR">Moderator</option>
                        <option value="PARTICIPANT">Participant</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button onClick={() => handleKickUser(user.userId)}
                        style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', cursor: 'pointer', padding: '5px 10px', fontSize: '0.73rem', fontWeight: 700 }}>
                        Kick
                      </button>
                    </div>
                    <button onClick={() => { if (window.confirm(`Transfer host to ${user.username}?`)) handleTransferHost(user.userId); }}
                      style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', cursor: 'pointer', padding: '5px', fontSize: '0.73rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      <Crown size={11} /> Transfer Host
                    </button>
                  </div>
                )}

                {/* Moderator Controls */}
                {myRole === 'MODERATOR' && user.userId !== myUserId && !['HOST', 'MODERATOR'].includes(user.role) && (
                  <button onClick={() => handleKickUser(user.userId)}
                    style={{ marginTop: '7px', width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.18)', borderRadius: '6px', cursor: 'pointer', padding: '5px', fontSize: '0.73rem', fontWeight: 700 }}>
                    Remove User
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SEARCH TAB ── */}
      {tab === 'search' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSearchDirect(searchQuery); }}
            style={{ display: 'flex', gap: '6px' }}>
            <input type="text" placeholder="Search YouTube..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', color: '#f0f0ff', fontSize: '0.82rem', outline: 'none', fontFamily: 'Space Grotesk, sans-serif' }} />
            <button type="submit" disabled={isSearching}
              style={{ background: 'rgba(138, 92, 246, 0.2)', color: '#a78bfa', border: '1px solid rgba(138, 92, 246, 0.25)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {isSearching ? <Loader2 size={14} /> : <Search size={14} />}
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {searchResults.map((item) => (
              <div key={item.id.videoId} onClick={() => onSearchVideo?.(item.id.videoId)}
                style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(138, 92, 246, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
              >
                <img src={item.snippet.thumbnails.default.url} alt="" style={{ width: '88px', height: '58px', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ padding: '6px 6px 6px 0', flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#f0f0ff', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{item.snippet.title}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: '#44445a', fontWeight: 500 }}>{item.snippet.channelTitle}</p>
                </div>
              </div>
            ))}
          </div>

          <div ref={searchLoadMoreRef} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isLoadingMore && <Loader2 size={16} color="#44445a" />}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomSidebar;