import React, { useState, useEffect, useRef, useCallback } from 'react';
import YouTube from 'react-youtube';
import type { YouTubePlayer } from 'react-youtube';
import io, { Socket } from 'socket.io-client';
import { useNavigate, useParams } from 'react-router-dom';
import JoinRoomModal from './Joinroom';
import CreateRoomView from './Createroom';
import LobbySidebar from '../components/LobbySidebar';
import RoomSidebar from '../components/RoomSidebar';
import FeedbackModal from '../components/FeedbackModal';
import './Dashboard.css';
import ConfirmModal from '../components/ConfirmModel';
import { Search, CheckCircle2, Copy, Check,  Monitor, Maximize, X, ThumbsUp, Eye, MessageSquare, Clapperboard, TrendingUp, Music, Gamepad2, Film, BookOpen, Trophy } from 'lucide-react';

interface RoomUser {
  userId:   string;
  username: string;
  role:     'HOST' | 'MODERATOR' | 'PARTICIPANT' | 'VIEWER';
}

interface RoleRequestItem {
  requestId:     string;
  fromUserId:    string;
  fromUsername:  string;
  requestedRole: string;
  timestamp:     number;
}

interface VideoDetail {
  title:        string;
  channelTitle: string;
  channelId:    string;
  description:  string;
  publishedAt:  string;
  likeCount:    string;
  viewCount:    string;
  commentCount: string;
}

interface CommentItem {
  id:          string;
  author:      string;
  authorImage: string;
  text:        string;
  likeCount:   number;
  publishedAt: string;
}

const CATEGORY_MAP: Record<string, { label: string; id?: string; icon?: React.ElementType }> = {
  home:      { label: 'All' },
  trending:  { label: 'Trending',  icon: TrendingUp },
  music:     { label: 'Music',     id: '10', icon: Music },
  gaming:    { label: 'Gaming',    id: '20', icon: Gamepad2 },
  movies:    { label: 'Movies',    id: '1',  icon: Film },
  education: { label: 'Education', id: '27', icon: BookOpen },
  sports:    { label: 'Sports',    id: '17', icon: Trophy },
};

const Dashboard: React.FC = () => {
  const navigate              = useNavigate();
  const { roomId: urlRoomId } = useParams();

  // ✅ AUTH GUARD — redirect to login if no token, before any hooks run effects
  useEffect(() => {
    const token    = sessionStorage.getItem("token");
    const username = sessionStorage.getItem("username");
    if (!token || !username) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // View state
  const [view,       setView]       = useState<'lobby' | 'create'>('lobby');
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  // Video & category state
  // State ke saath ref bhi rakho
const [videoID, setVideoID] = useState<string | null>(null);

  const [activeCategory,  setActiveCategory]  = useState('home');
  const [videos,          setVideos]          = useState<any[]>([]);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [navSearchQuery,  setNavSearchQuery]  = useState('');
  const [isSearching,     setIsSearching]     = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [nextPageToken,   setNextPageToken]   = useState<string | null>(null);
  const [isLoadingMore,   setIsLoadingMore]   = useState(false);

  // Video detail state
  const [videoDetail,   setVideoDetail]   = useState<VideoDetail | null>(null);
  const [comments,      setComments]      = useState<CommentItem[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [showComments,  setShowComments]  = useState(false);

  // Room state
  const [participants,    setParticipants]    = useState<RoomUser[]>([]);
  // Always default to VIEWER — room_data event sets the real role
  const [myRole,          setMyRole]          = useState<string>('VIEWER');
  const [theaterMode,     setTheaterMode]     = useState(false);
  const [sidebarWidth,    setSidebarWidth]    = useState(320); // Default to slightly wider for chat
  const [isResizing,      setIsResizing]      = useState(false);
  const [showFeedback,    setShowFeedback]    = useState(false);
  const [leavingRoomId,   setLeavingRoomId]   = useState<string | null>(null);
  const [confirmedUserId, setConfirmedUserId] = useState<string | null>(null);

  // Room-created modal state
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [roomIdCopied,  setRoomIdCopied]  = useState(false);

  // Toast state
  const [joinError,        setJoinError]        = useState<string | null>(null);
  const [roleRequestToast, setRoleRequestToast] = useState<string | null>(null);

  // Role request state
  const [incomingRequests, setIncomingRequests] = useState<RoleRequestItem[]>([]);
  const [myPendingRequest, setMyPendingRequest] = useState<string | null>(null);

  // Refs
  const isRemoteAction  = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef       = useRef<YouTubePlayer | null>(null);
  const socketRef       = useRef<Socket | null>(null);
  const observerRef     = useRef<IntersectionObserver | null>(null);
  const loadMoreRef     = useRef<HTMLDivElement | null>(null);
  const pendingSeek     = useRef<{ time: number; shouldPlay: boolean } | null>(null);
  const lastPlayerState = useRef<number>(-1);
  
  const username = sessionStorage.getItem("username") || "User";
  const myUserId = confirmedUserId || sessionStorage.getItem("userId") || "unknown";
  const [actionError, setActionError] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const API_KEY  = (import.meta as any).env.VITE_YOUTUBE_API_KEY;
// ─── SOCKET CONNECTION ──────────────────────────────────
  useEffect(() => {
    // ✅ AUTH GUARD — don't even attempt socket if no token
    const token = sessionStorage.getItem("token");
    if (!token) return;

    const currentUserId = sessionStorage.getItem("userId") || "unknown";

    const s = io(import.meta.env.VITE_API_URL || "http://localhost:3000", {
      auth: { token }
    });
    socketRef.current = s;

    s.on('connect', () => {
      console.log('[Socket] Connected:', s.id);
      if (urlRoomId) {
        s.emit('join_room', { roomId: urlRoomId });
      }
    });

    // ✅ connect_error BEFORE return — handles expired/invalid token
    s.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      if (err.message.includes('Token expired') || err.message.includes('Invalid token')) {
        sessionStorage.clear();
        navigate('/login', { replace: true });
      }
    });

    s.on('join_error', (data: { message: string }) => {
      setJoinError(data.message);
      setTimeout(() => { setJoinError(null); navigate('/dashboard'); }, 4000);
    });

    s.on('room_data', (data: { users: RoomUser[] }) => {
      setParticipants(data.users);
      const me = data.users.find(u => u.userId === currentUserId || u.username === username);
      if (me) {
        setMyRole(me.role);
        if (me.userId !== currentUserId) {
          setConfirmedUserId(me.userId);
          sessionStorage.setItem("userId", me.userId);
        }
      }
    });

    s.on('you_were_kicked', (data: { by: string }) => {
      setJoinError(`You have been removed from the room by ${data.by}.`);
      setVideoID(null); setVideoDetail(null); setComments([]); setRelatedVideos([]);
      setTimeout(() => { setJoinError(null); navigate('/dashboard'); }, 3000);
    });

    s.on('room_dismissed', () => {
      setJoinError("The Host has ended the watch party.");
      setVideoID(null); setVideoDetail(null); setComments([]); setRelatedVideos([]);
      setTimeout(() => { setJoinError(null); navigate('/dashboard'); }, 3000);
    });
    // Host ke liye — koi join kare toh current state bhejo
s.on('request_sync', ({ roomId }: { roomId: string }) => {
  if (!playerRef.current || !videoID) return;
  const currentTime = playerRef.current.getCurrentTime?.() || 0;
  const state       = playerRef.current.getPlayerState?.();
  const isPlaying   = state === 1;

  // ✅ Host current state emit karega — sync_time se sab milega
  socketRef.current?.emit('sync_time', {
    roomId,
    currentTime,
    isPlaying,
    videoId: videoID
  });
});

   s.on('receive_video_action', (data: { action: string; videoId?: string; currentTime?: number; serverTimestamp?: number }) => {
  isRemoteAction.current = true;

  if (data.action === 'change' && data.videoId) {
    setVideoID(data.videoId);
  } else if (data.action === 'play' || data.action === 'pause') {
    
    if (typeof data.currentTime === 'number') {
      let targetTime = data.currentTime;
      if (data.serverTimestamp) {
        const networkDelaySeconds = (Date.now() - data.serverTimestamp) / 1000;
        targetTime += networkDelaySeconds;
      }
      playerRef.current?.seekTo(targetTime, true);
    }

    if (data.action === 'play') {
      playerRef.current?.playVideo();
    } else {
      playerRef.current?.pauseVideo();
    }
  }

  setTimeout(() => { isRemoteAction.current = false; }, 1000);
});

s.on('receive_video_seek', (data: { currentTime: number; serverTimestamp?: number }) => {
  isRemoteAction.current = true;
  
  let targetTime = data.currentTime;
  if (data.serverTimestamp) {
    const networkDelaySeconds = (Date.now() - data.serverTimestamp) / 1000;
    targetTime += networkDelaySeconds;
  }

  playerRef.current?.seekTo(targetTime, true);
  setTimeout(() => { isRemoteAction.current = false; }, 500);
});

    s.on('room_video_state', (data: { videoId: string; isPlaying: boolean; currentTime: number }) => {
      if (data.videoId) {
        setVideoID(data.videoId);
        pendingSeek.current = { time: data.currentTime, shouldPlay: data.isPlaying };
      }
    });

s.on('receive_sync_time', (data: { currentTime: number; isPlaying: boolean; videoId?: string; serverTimestamp?: number }) => {
  if (data.videoId && !videoID) {
    pendingSeek.current = { time: data.currentTime, shouldPlay: data.isPlaying };
    setVideoID(data.videoId);
    return; 
  }

  if (!playerRef.current) return;
  const localTime = playerRef.current.getCurrentTime?.() || 0;

  let targetTime = data.currentTime;
  if (data.serverTimestamp) {
    const networkDelaySeconds = (Date.now() - data.serverTimestamp) / 1000;
    targetTime += networkDelaySeconds;
  }

  const drift = Math.abs(localTime - targetTime);

  if (drift > 2) {
    isRemoteAction.current = true;
    playerRef.current.seekTo(targetTime, true);
    setTimeout(() => { isRemoteAction.current = false; }, 500);
  }

  if (data.isPlaying) {
    const state = playerRef.current.getPlayerState?.();
    if (state !== 1) {
      isRemoteAction.current = true;
      playerRef.current.playVideo();
      setTimeout(() => { isRemoteAction.current = false; }, 500);
    }
  }
});
    s.on('role_request_received', (data: { request: RoleRequestItem }) => {
      setIncomingRequests(prev => [...prev, data.request]);
    });

    s.on('pending_role_requests', (data: { requests: RoleRequestItem[] }) => {
      setIncomingRequests(data.requests);
    });

    s.on('role_request_sent', (data: { requestId: string; requestedRole: string }) => {
      setMyPendingRequest(data.requestId);
      setRoleRequestToast(`Request sent! Waiting for HOST to approve...`);
      setTimeout(() => setRoleRequestToast(null), 3000);
    });

    s.on('role_request_error', (data: { message: string }) => {
      setRoleRequestToast(data.message);
      setTimeout(() => setRoleRequestToast(null), 3000);
    });

    s.on('role_request_response', (data: {
      requestId: string; approved: boolean;
      newRole: string | null; respondedBy: string;
    }) => {
      setMyPendingRequest(null);
      if (data.approved) {
        setRoleRequestToast(`🎉 ${data.respondedBy} approved! You are now ${data.newRole}.`);
      } else {
        setRoleRequestToast(`❌ ${data.respondedBy} denied your request.`);
      }
      setTimeout(() => setRoleRequestToast(null), 4000);
    });

    s.on('role_assigned', (data: { userId: string; username: string; role: string }) => {
      if (data.userId === currentUserId) {
        setMyRole(data.role);
      }
    });

    s.on('host_transferred', (data: {
      oldHostId: string; newHostId: string; newHostUsername: string;
    }) => {
      if (data.newHostId === currentUserId) {
        setMyRole('HOST');
        setRoleRequestToast(`👑 You are now the HOST!`);
        setTimeout(() => setRoleRequestToast(null), 4000);
      } else if (data.oldHostId === currentUserId) {
        setMyRole('MODERATOR');
        setRoleRequestToast(`You transferred host to ${data.newHostUsername}. You are now MODERATOR.`);
        setTimeout(() => setRoleRequestToast(null), 4000);
      }
    });

    s.on('user_left', (data: { userId: string; username: string }) => {
      console.log(`[Room] ${data.username} left`);
    });

    // ✅ cleanup return is last — all listeners registered above
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      setTimeout(() => s.disconnect(), 100);
    };
  }, [urlRoomId, username, navigate]);

  // ─── SYNC HEARTBEAT ─────────────────────────────────────
  useEffect(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (urlRoomId && myRole === 'HOST' && videoID) {
      syncIntervalRef.current = setInterval(() => {
        if (playerRef.current && socketRef.current) {
          const currentTime = playerRef.current.getCurrentTime?.() || 0;
          const state       = playerRef.current.getPlayerState?.();
          const isPlaying   = state === 1;
          socketRef.current.emit('sync_time', { roomId: urlRoomId, currentTime, isPlaying });
        }
      }, 5000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [urlRoomId, myRole, videoID]);

  // ─── FETCH VIDEOS ───────────────────────────────────────
  const fetchVideos = useCallback(async (pageToken?: string) => {
    if (pageToken) setIsLoadingMore(true);
    else           setIsLoadingVideos(true);

    try {
      const category = CATEGORY_MAP[activeCategory];
      let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&maxResults=8&regionCode=IN&key=${API_KEY}`;
      if (category?.id) url += `&videoCategoryId=${category.id}`;
      if (pageToken)    url += `&pageToken=${pageToken}`;

      const res  = await fetch(url);
      const data = await res.json();

      if (data.items) {
        if (pageToken) setVideos(prev => [...prev, ...data.items]);
        else           setVideos(data.items);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoadingVideos(false);
      setIsLoadingMore(false);
    }
  }, [activeCategory, API_KEY]);

  useEffect(() => {
    if (!searchQuery) fetchVideos();
  }, [activeCategory, fetchVideos, searchQuery]);

  // ─── INFINITE SCROLL ────────────────────────────────────
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextPageToken && !isLoadingMore && !isLoadingVideos) {
        if (searchQuery) handleSearchMore();
        else             fetchVideos(nextPageToken);
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);

    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [nextPageToken, isLoadingMore, isLoadingVideos, searchQuery]);

  // ─── SEARCH ─────────────────────────────────────────────
  const handleSearchYouTube = async (query: string, pageToken?: string) => {
    if (!query.trim()) return;
    if (pageToken) setIsLoadingMore(true);
    else           setIsSearching(true);

    try {
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`;
      if (pageToken) url += `&pageToken=${pageToken}`;

      const res  = await fetch(url);
      const data = await res.json();

      if (data.items) {
        if (pageToken) setVideos(prev => [...prev, ...data.items]);
        else           setVideos(data.items);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (error) {
      console.error("Search Error:", error);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const handleSearchMore = () => {
    if (nextPageToken && searchQuery) handleSearchYouTube(searchQuery, nextPageToken);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearchQuery.trim()) {
      setSearchQuery(navSearchQuery);
      handleSearchYouTube(navSearchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setNavSearchQuery('');
    fetchVideos();
  };

  // ─── VIDEO DETAILS / COMMENTS / RELATED ─────────────────
  const fetchVideoDetail = async (vid: string) => {
    try {
      const res  = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${vid}&key=${API_KEY}`);
      const data = await res.json();
      if (data.items?.[0]) {
        const item = data.items[0];
        setVideoDetail({
          title:        item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          channelId:    item.snippet.channelId,
          description:  item.snippet.description,
          publishedAt:  item.snippet.publishedAt,
          likeCount:    item.statistics.likeCount    || '0',
          viewCount:    item.statistics.viewCount    || '0',
          commentCount: item.statistics.commentCount || '0',
        });
      }
    } catch (err) { console.error("Video detail error:", err); }
  };

  const fetchComments = async (vid: string) => {
    try {
      const res  = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${vid}&maxResults=15&order=relevance&key=${API_KEY}`);
      const data = await res.json();
      if (data.items) {
        setComments(data.items.map((item: any) => ({
          id:          item.id,
          author:      item.snippet.topLevelComment.snippet.authorDisplayName,
          authorImage: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
          text:        item.snippet.topLevelComment.snippet.textDisplay,
          likeCount:   item.snippet.topLevelComment.snippet.likeCount,
          publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
        })));
      }
    } catch (err) { console.error("Comments error:", err); }
  };
const fetchRelatedVideos = async (vid: string) => {
  try {
    // Step 1 — video ka title aur channel fetch karo
    const detailRes  = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${vid}&key=${API_KEY}`
    );
    const detailData = await detailRes.json();
    const item       = detailData.items?.[0];
    if (!item) return;

    const title   = item.snippet.title
      .replace(/[|#\[\]()]/g, '')   // special chars hata do
      .split(' ')
      .slice(0, 5)                   // pehle 5 words lo
      .join(' ');
    const channel = item.snippet.channelTitle;

    // Step 2 — title + channel se search karo
    const searchRes  = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(title + ' ' + channel)}&type=video&maxResults=12&key=${API_KEY}`
    );
    const searchData = await searchRes.json();

    if (searchData.items) {
      // current video ko results se hata do
      const filtered = searchData.items.filter(
        (i: any) => i.id?.videoId !== vid && i.snippet
      );
      setRelatedVideos(filtered);
    }
  } catch (err) {
    console.error("Related videos error:", err);
  }
};

  useEffect(() => {
    if (videoID) {
      fetchVideoDetail(videoID);
      fetchComments(videoID);
      fetchRelatedVideos(videoID);
    } else {
      setVideoDetail(null);
      setComments([]);
      setRelatedVideos([]);
    }
  }, [videoID]);

  // ─── ROOM HANDLERS ──────────────────────────────────────
  const handleFinalCreate = async (roomId: string) => {
    socketRef.current?.emit('create_room', { roomId, maxParticipants: 10 });
    setCreatedRoomId(roomId);
    setRoomIdCopied(false);
  };

  const handleEnterCreatedRoom = () => {
    if (createdRoomId) {
      navigate(`/dashboard/${createdRoomId}`);
      setCreatedRoomId(null);
    }
  };

  const handleCopyRoomId = () => {
    if (createdRoomId) {
      navigator.clipboard.writeText(createdRoomId).then(() => {
        setRoomIdCopied(true);
        setTimeout(() => setRoomIdCopied(false), 2000);
      });
    }
  };

  const handleJoinSubmit = (code: string) => {
    if (!code.trim()) return;
    setIsJoinOpen(false);
    navigate(`/dashboard/${code}`);
  };

  const handleAssignRole = (targetUserId: string, newRole: string) => {
    socketRef.current?.emit('change_role', { roomId: urlRoomId, targetUserId, newRole });
  };

  const handleKickUser = (targetUserId: string) => {
    socketRef.current?.emit('kick_user', { roomId: urlRoomId, targetUserId });
  };

  const handleRequestRoleUpgrade = (requestedRole: string) => {
    if (!urlRoomId || !socketRef.current) return;
    socketRef.current.emit('request_role_upgrade', { roomId: urlRoomId, requestedRole });
  };

  const handleRespondRoleRequest = (requestId: string, approved: boolean) => {
    if (!urlRoomId || !socketRef.current) return;
    socketRef.current.emit('respond_role_request', { roomId: urlRoomId, requestId, approved });
    setIncomingRequests(prev => prev.filter(r => r.requestId !== requestId));
  };

  const handleSelectVideo = (selectedVideoId: string) => {
    if (urlRoomId) {
      if (myRole !== 'HOST' && myRole !== 'MODERATOR') {
      setActionError("Only Hosts and Moderators can change the video.");
      setTimeout(() => setActionError(null), 3000);
        return;
      }
      socketRef.current?.emit('video_action', {
        roomId:  urlRoomId,
        action:  'change',
        videoId: selectedVideoId,
      });
    }
    setVideoID(selectedVideoId);
    setShowComments(false);
  };
const handleVideoStateChange = useCallback((action: 'play' | 'pause') => {
  if (isRemoteAction.current) return; // ✅ Remote action hai toh emit mat karo
  if (urlRoomId && (myRole === 'HOST' || myRole === 'MODERATOR')) {
    const currentTime = playerRef.current?.getCurrentTime?.() || 0;
    socketRef.current?.emit('video_action', { roomId: urlRoomId, action, currentTime });
  }
}, [urlRoomId, myRole]);

  const handleSeek = useCallback(() => {
    if (isRemoteAction.current || !urlRoomId) return;
    if (myRole !== 'HOST' && myRole !== 'MODERATOR') return;
    const currentTime = playerRef.current?.getCurrentTime?.() || 0;
    socketRef.current?.emit('video_seek', { roomId: urlRoomId, currentTime });
  }, [urlRoomId, myRole]);

  // YouTube states: -1=unstarted 0=ended 1=playing 2=paused 3=buffering 5=cued
  // Seek detection: buffering(3) → playing(1) = user seeked
  const handleStateChange = useCallback((e: any) => {
    const newState = e.data;
    if (newState === 1) {
      if (lastPlayerState.current === 3) {
        handleSeek();
      } else {
        handleVideoStateChange('play');
      }
    } else if (newState === 2) {
      handleVideoStateChange('pause');
    }
    lastPlayerState.current = newState;
  }, [handleSeek, handleVideoStateChange]);

  const handlePlayerReady = (e: any) => {
    playerRef.current = e.target;
    if (pendingSeek.current) {
      e.target.seekTo(pendingSeek.current.time, true);
      if (pendingSeek.current.shouldPlay) e.target.playVideo();
      pendingSeek.current = null;
    }
  };

  const handleLeaveRoom = () => {
    if (urlRoomId) {
      socketRef.current?.emit('leave_room', { roomId: urlRoomId });
      setLeavingRoomId(urlRoomId);
      setShowFeedback(true);
      setVideoID(null); setVideoDetail(null); setComments([]); setRelatedVideos([]);
    }
  };
const handleEndParty = () => {
  setShowEndConfirm(true);
};

const confirmEndParty = () => {
  setShowEndConfirm(false);
  setLeavingRoomId(urlRoomId || null);
  socketRef.current?.emit('dismiss_room', { roomId: urlRoomId });
  setShowFeedback(true);
  setVideoID(null); setVideoDetail(null); setComments([]); setRelatedVideos([]);
};

  const handleTransferHost = (targetUserId: string) => {
    if (!urlRoomId || !socketRef.current) return;
    socketRef.current.emit('transfer_host', { roomId: urlRoomId, targetUserId });
  };

  const completeFeedback = () => {
    setShowFeedback(false);
    setLeavingRoomId(null);
    navigate('/dashboard');
  };

  // ─── HELPERS ────────────────────────────────────────────
  const getVideoId   = (item: any): string => item.id?.videoId || item.id;
  const getThumbnail = (item: any): string =>
    item.snippet?.thumbnails?.medium?.url ||
    item.snippet?.thumbnails?.default?.url || '';

  const formatCount = (count: string | undefined): string => {
    if (!count) return '0';
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000)    return `${(num / 1000).toFixed(0)}K`;
    return `${num}`;
  };

  const formatTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30)  return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const canControl = !urlRoomId || myRole === 'HOST' || myRole === 'MODERATOR';
  const playerOpts = {
    width:  '100%',
    height: '100%',
    playerVars: {
      autoplay:       1,
      rel:            0,
      modestbranding: 1,
      fs:             1,
      iv_load_policy: 3,
      controls:       canControl ? 1 : 0,
      disablekb:      canControl ? 0 : 1,
    }
  };

  // --- Resize Setup ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      // The wider the dragged mouse X is from the right edge of screen, the larger the sidebar.
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 250 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // ─── JSX ────────────────────────────────────────────────
  return (
    <div className="dashboard-wrapper-full">

      {/* ═══════ HEADER ═══════ */}
      <header className="dash-header">
        <div className="brand">
          <h1 className="logo" onClick={() => { if (!urlRoomId) navigate('/dashboard'); }} style={{ cursor: 'pointer' }}>
            Watch_party
          </h1>
          {urlRoomId && (
            <p>Room: <strong style={{ color: '#a855f7' }}>{urlRoomId}</strong></p>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="nav-search-form">
          <input
            type="text"
            placeholder="Search videos..."
            value={navSearchQuery}
            onChange={(e) => setNavSearchQuery(e.target.value)}
            className="nav-search-input"
          />
          <button type="submit" className="nav-search-btn" disabled={isSearching} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={16} strokeWidth={3} />
          </button>
        </form>

        <div className="nav-actions">
          {urlRoomId ? (
            <>
              <div className="room-tag">
                <div className="pulse-dot" />
                LIVE — {participants.length} watching
              </div>
              <button
                className={`btn-theater ${theaterMode ? 'active' : ''}`}
                onClick={() => setTheaterMode(!theaterMode)}
                title={theaterMode ? 'Exit Theater' : 'Theater Mode'}
              >
                {theaterMode ? <Maximize size={18} /> : <Monitor size={18} />}
              </button>
              {myRole === 'HOST' ? (
                <button className="btn-logout" onClick={handleEndParty}>End Party</button>
              ) : (
                <button className="btn-join" onClick={handleLeaveRoom}>Leave</button>
              )}
            </>
          ) : (
            <>
              <button className="btn-create" onClick={() => setView('create')}>+ Create Room</button>
              <button className="btn-join"   onClick={() => setIsJoinOpen(true)}>Join Room</button>
            </>
          )}
          <button
            className="btn-logout"
            onClick={() => { sessionStorage.clear(); navigate('/login', { replace: true }); }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className={`main-layout ${urlRoomId ? 'room-mode' : ''} ${theaterMode ? 'theater-mode' : ''}`}>

        {/* ═══════ LEFT SIDEBAR (lobby only) ═══════ */}
        {!urlRoomId && (
          <aside className="sidebar-narrow">
            <LobbySidebar
              activeTab={activeCategory}
              setActiveTab={(tab) => { setActiveCategory(tab); clearSearch(); }}
              username={username}
            />
          </aside>
        )}

        {/* ═══════ MAIN VIDEO SECTION ═══════ */}
        <section className="video-section">
          {urlRoomId ? (
            <>
              {videoID ? (
                <>
                  <div className="player-container" style={{ position: 'relative', marginBottom: '0' }}>
                    <YouTube
                      videoId={videoID}
                      opts={playerOpts}
                      onReady={handlePlayerReady}
                      onStateChange={handleStateChange}
                      style={{ width: '100%', height: '100%' }}
                    />
                    {!canControl && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0,
                        right: 0, bottom: 0, zIndex: 10
                      }} />
                    )}
                    {canControl && (
                      <button
                        className="close-player-overlay"
                        onClick={() => {
                          setVideoID(null); setVideoDetail(null);
                          setComments([]); setRelatedVideos([]);
                        }}
                        title="Close Player"
                      >
                        <X size={28} />
                      </button>
                    )}
                  </div>

                  {videoDetail && (
                    <div className="video-detail-section">
                      <h2 className="video-detail-title">{videoDetail.title}</h2>
                      <div className="video-detail-meta">
                        <div className="video-detail-channel">
                          <div className="channel-avatar">{videoDetail.channelTitle.charAt(0)}</div>
                          <div>
                            <p className="channel-name">{videoDetail.channelTitle}</p>
                            <a
                              href={`https://www.youtube.com/channel/${videoDetail.channelId}?sub_confirmation=1`}
                              target="_blank" rel="noopener noreferrer"
                              className="subscribe-btn"
                            >
                              Subscribe
                            </a>
                          </div>
                        </div>
                        <div className="video-detail-stats">
                          <span className="stat-pill"><ThumbsUp size={16} className="icon-gap" /> {formatCount(videoDetail.likeCount)}</span>
                          <span className="stat-pill"><Eye size={16} className="icon-gap" /> {formatCount(videoDetail.viewCount)} views</span>
                          <button
                            className="stat-pill clickable"
                            onClick={() => setShowComments(!showComments)}
                          >
                            <MessageSquare size={16} className="icon-gap" /> {formatCount(videoDetail.commentCount)} comments
                          </button>
                        </div>
                      </div>

                      {showComments && (
                        <div className="comments-section">
                          <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MessageSquare size={18} /> Comments ({videoDetail.commentCount})
                          </h3>
                          {comments.map(c => (
                            <div key={c.id} className="comment-card">
                              <img src={c.authorImage} alt="" className="comment-avatar" />
                              <div className="comment-body">
                                <div className="comment-header">
                                  <span className="comment-author">{c.author}</span>
                                  <span className="comment-time">{formatTimeAgo(c.publishedAt)}</span>
                                </div>
                                <p className="comment-text" dangerouslySetInnerHTML={{ __html: c.text }} />
                                <span className="comment-likes"><ThumbsUp size={14} className="icon-gap"/> {c.likeCount}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {relatedVideos.length > 0 && (
                        <div className="related-section">
                          <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '12px' }}>▶ Up Next</h3>
                          <div className="related-grid">
                            {relatedVideos.map((item) => (
                              <div
                                key={item.id.videoId}
                                className="related-card"
                                onClick={() => handleSelectVideo(item.id.videoId)}
                              >
                                <img src={item.snippet?.thumbnails?.medium?.url} alt="" className="related-thumb" />
                                <div className="related-info">
                                  <h4 className="related-title">{item.snippet?.title}</h4>
                                  <p className="related-channel">{item.snippet?.channelTitle}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </>
              ) : (
                <>


                  {searchQuery && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '16px', padding: '8px 0'
                    }}>
                      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                        Results for <strong style={{ color: '#e2e8f0' }}>"{searchQuery}"</strong>
                      </span>
                      <button onClick={clearSearch} className="clear-search-btn">✕ Clear</button>
                    </div>
                  )}

                  <div className="room-browse-hint">
                    <span className="aesthetic-icon-wrapper"><Clapperboard size={26} className="aesthetic-icon" /></span>
                    <p>{(myRole === 'HOST' || myRole === 'MODERATOR')
                      ? 'Pick a video below to start watching together!'
                      : 'Waiting for the host to pick a video...'}
                    </p>
                  </div>

                  {!searchQuery && (
                    <div className="room-category-bar">
                      {Object.entries(CATEGORY_MAP).map(([key, item]) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={key}
                            className={`category-chip ${activeCategory === key ? 'active' : ''}`}
                            onClick={() => { setActiveCategory(key); clearSearch(); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            {Icon && <Icon size={15} style={{ opacity: 0.8 }} />}
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isLoadingVideos ? (
                    <div className="video-grid">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="skeleton-card">
                          <div className="skeleton-thumb" />
                          <div className="skeleton-text" />
                          <div className="skeleton-text short" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="video-grid">
                        {videos.map((item, idx) => {
                          const vid = getVideoId(item);
                          return (
                            <div
                              key={`${vid}-${idx}`}
                              className="video-card"
                              onClick={() => handleSelectVideo(vid)}
                            >
                              <div className="video-card-thumb">
                                <img src={getThumbnail(item)} alt={item.snippet?.title || ''} />
                                <div className="video-card-play"><span>▶</span></div>
                                {item.statistics?.viewCount && (
                                  <div className="video-card-views">
                                    {formatCount(item.statistics.viewCount)} views
                                  </div>
                                )}
                              </div>
                              <div className="video-card-info">
                                <h4 className="video-card-title">{item.snippet?.title}</h4>
                                <p className="video-card-channel">
                                  {item.snippet?.channelTitle}
                                  {item.snippet?.publishedAt && (
                                    <><span className="channel-dot" />{formatTimeAgo(item.snippet.publishedAt)}</>
                                  )}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div ref={loadMoreRef} style={{
                        height: '40px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: '20px'
                      }}>
                        {isLoadingMore && <div className="load-more-spinner" />}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <>


              {searchQuery && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '16px', padding: '8px 0'
                }}>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    Results for <strong style={{ color: '#e2e8f0' }}>"{searchQuery}"</strong>
                  </span>
                  <button onClick={clearSearch} className="clear-search-btn">✕ Clear</button>
                </div>
              )}

              {videoID && (
                <div style={{ marginBottom: '24px' }}>
                  <div className="player-container" style={{ marginBottom: '0', position: 'relative' }}>
                    <YouTube
                      videoId={videoID}
                      opts={playerOpts}
                      onReady={(e) => { playerRef.current = e.target; }}
                      style={{ width: '100%', height: '100%' }}
                    />
                    <button
                      className="close-player-overlay"
                      onClick={() => {
                        setVideoID(null); setVideoDetail(null);
                        setComments([]); setRelatedVideos([]);
                      }}
                      title="Close Player"
                    >
                      <X size={28} />
                    </button>
                  </div>
                  {videoDetail && (
                    <div className="video-detail-section">
                      <h2 className="video-detail-title">{videoDetail.title}</h2>
                      <div className="video-detail-meta">
                        <div className="video-detail-channel">
                          <div className="channel-avatar">{videoDetail.channelTitle.charAt(0)}</div>
                          <div>
                            <p className="channel-name">{videoDetail.channelTitle}</p>
                            <a
                              href={`https://www.youtube.com/channel/${videoDetail.channelId}?sub_confirmation=1`}
                              target="_blank" rel="noopener noreferrer"
                              className="subscribe-btn"
                            >
                              Subscribe
                            </a>
                          </div>
                        </div>
                        <div className="video-detail-stats">
                          <span className="stat-pill"><ThumbsUp size={16} className="icon-gap" /> {formatCount(videoDetail.likeCount)}</span>
                          <span className="stat-pill"><Eye size={16} className="icon-gap" /> {formatCount(videoDetail.viewCount)} views</span>
                          <button
                            className="stat-pill clickable"
                            onClick={() => setShowComments(!showComments)}
                          >
                            <MessageSquare size={16} className="icon-gap" /> {formatCount(videoDetail.commentCount)}
                          </button>
                        </div>
                      </div>
                      {showComments && (
                        <div className="comments-section">
                          {comments.map(c => (
                            <div key={c.id} className="comment-card">
                              <img src={c.authorImage} alt="" className="comment-avatar" />
                              <div className="comment-body">
                                <div className="comment-header">
                                  <span className="comment-author">{c.author}</span>
                                  <span className="comment-time">{formatTimeAgo(c.publishedAt)}</span>
                                </div>
                                <p className="comment-text" dangerouslySetInnerHTML={{ __html: c.text }} />
                                <span className="comment-likes"><ThumbsUp size={14} className="icon-gap" /> {c.likeCount}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isLoadingVideos ? (
                <div className="video-grid">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="skeleton-card">
                      <div className="skeleton-thumb" />
                      <div className="skeleton-text" />
                      <div className="skeleton-text short" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="video-grid">
                    {videos.map((item, idx) => {
                      const vid = getVideoId(item);
                      return (
                        <div
                          key={`${vid}-${idx}`}
                          className="video-card"
                          onClick={() => handleSelectVideo(vid)}
                        >
                          <div className="video-card-thumb">
                            <img src={getThumbnail(item)} alt={item.snippet?.title || ''} />
                            <div className="video-card-play"><span>▶</span></div>
                            {item.statistics?.viewCount && (
                              <div className="video-card-views">
                                {formatCount(item.statistics.viewCount)} views
                              </div>
                            )}
                          </div>
                          <div className="video-card-info">
                            <h4 className="video-card-title">{item.snippet?.title}</h4>
                            <p className="video-card-channel">
                              {item.snippet?.channelTitle}
                              {item.snippet?.publishedAt && (
                                <><span className="channel-dot" />{formatTimeAgo(item.snippet.publishedAt)}</>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div ref={loadMoreRef} style={{
                    height: '40px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '20px'
                  }}>
                    {isLoadingMore && <div className="load-more-spinner" />}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {/* ═══════ RIGHT SIDEBAR ═══════ */}
        {urlRoomId && !theaterMode && (
          <>
            <div
              className="resize-handle"
              onMouseDown={() => setIsResizing(true)}
              style={{
                width: '6px',
                cursor: 'col-resize',
                backgroundColor: isResizing ? 'var(--accent)' : 'transparent',
                borderLeft: '1px solid var(--border)',
                zIndex: 10,
                transition: isResizing ? 'none' : 'background-color 0.2s'
              }}
              onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.backgroundColor = 'rgba(163, 124, 88, 0.2)'; }}
              onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.backgroundColor = 'transparent'; }}
            />
            <aside className="sidebar-narrow" style={{ width: `${sidebarWidth}px`, transition: isResizing ? 'none' : 'width 0.3s ease' }}>
              <RoomSidebar
                participants={participants}
                myRole={myRole}
                myUserId={myUserId}
                handleAssignRole={handleAssignRole}
                handleKickUser={handleKickUser}
                socket={socketRef.current}
                roomId={urlRoomId || ''}
                username={username}
                onSearchVideo={handleSelectVideo}
                incomingRequests={incomingRequests}
                myPendingRequest={myPendingRequest}
                onRequestRoleUpgrade={handleRequestRoleUpgrade}
                onRespondRoleRequest={handleRespondRoleRequest}
                handleTransferHost={handleTransferHost}
                externalSearchQuery={urlRoomId ? navSearchQuery : undefined} 
              />
            </aside>
          </>
        )}

        {urlRoomId && theaterMode && (
          <button
            className="sidebar-toggle-btn"
            onClick={() => setTheaterMode(false)}
            title="Show Sidebar"
          >
            ☰
          </button>
        )}
      </main>

      {/* ═══════ MODALS ═══════ */}
      {view === 'create' && (
        <CreateRoomView onBack={() => setView('lobby')} onCreate={handleFinalCreate} />
      )}
      {isJoinOpen && (
        <JoinRoomModal onClose={() => setIsJoinOpen(false)} onJoin={handleJoinSubmit} />
      )}
      {showFeedback && leavingRoomId && (
        <FeedbackModal
          roomId={leavingRoomId}
          username={username}
          onSubmit={completeFeedback}
          onSkip={completeFeedback}
        />
      )}
      {showEndConfirm && (
  <ConfirmModal
    message="This will end the watch party for everyone in the room."
    onConfirm={confirmEndParty}
    onCancel={() => setShowEndConfirm(false)}
  />
)}

      {/* ═══════ ROOM CREATED MODAL ═══════ */}
      {createdRoomId && (
        <div className="modal-overlay" onClick={handleEnterCreatedRoom}>
          <div className="modal-content room-created-modal" onClick={(e) => e.stopPropagation()}>
            <div className="room-created-icon">
              <CheckCircle2 size={64} color="#a37c58" strokeWidth={1.5} />
            </div>
            <h2 className="modal-title" style={{ textAlign: 'center' }}>Room Created!</h2>
            <p style={{ color: '#94a3b8', textAlign: 'center', margin: '0 0 16px', fontSize: '0.88rem' }}>
              Share this code with your friends to join your watch party.
            </p>
            <div className="room-code-display">
              <span className="room-code-text">{createdRoomId}</span>
              <button className="room-code-copy" onClick={handleCopyRoomId}>
                {roomIdCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
            <button
              className="btn-create"
              onClick={handleEnterCreatedRoom}
              style={{ width: '100%', padding: '12px', fontSize: '0.92rem', borderRadius: '10px', marginTop: '16px' }}
            >
              Enter Room →
            </button>
          </div>
        </div>
      )}

      {/* ═══════ ERROR TOAST ═══════ */}
      {joinError && (
        <div className="error-toast-overlay">
          <div className="error-toast">
            <div className="error-toast-icon">⚠️</div>
            <div className="error-toast-content">
              <h4>Oops!</h4>
              <p>{joinError}</p>
            </div>
            <button
              className="error-toast-close"
              onClick={() => { setJoinError(null); navigate('/dashboard'); }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ═══════ ROLE REQUEST TOAST ═══════ */}
      {roleRequestToast && (
        <div className="role-request-toast">
          <span>{roleRequestToast}</span>
          <button
            onClick={() => setRoleRequestToast(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', marginLeft: '8px' }}
          >
            ✕
          </button>
        </div>
      )}
      {actionError && (
  <div className="role-request-toast">
    <span>⚠️ {actionError}</span>
    <button
      onClick={() => setActionError(null)}
      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', marginLeft: '8px' }}
    >✕</button>
  </div>
)}
    </div>
  );
};

export default Dashboard;
