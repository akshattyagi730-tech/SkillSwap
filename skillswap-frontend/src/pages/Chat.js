import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth }   from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme }  from '../context/ThemeContext';
import VideoCallModal from '../components/VideoCallModal';
import API from '../api/axios';

const avatarColors = [
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
];

const REPORT_REASONS = [
  { value: 'fake_profile',           label: '🎭 Fake Profile' },
  { value: 'spam',                   label: '📢 Spam' },
  { value: 'inappropriate_behavior', label: '🚫 Inappropriate Behavior' },
  { value: 'wrong_skills_listed',    label: '❌ Wrong Skills Listed' },
];

const initials   = (n = '') => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
const formatTime = (iso) => { const d = new Date(iso); return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0'); };

const Ticks = ({ temp, read }) => {
  if (temp) return <span style={{ marginLeft:'3px', fontSize:'0.65rem', opacity:0.6 }}>🕐</span>;
  const c = read ? '#60a5fa' : 'rgba(255,255,255,0.5)';
  return (
    <span style={{ marginLeft:'3px', display:'inline-flex', alignItems:'center', verticalAlign:'middle' }}>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
        <path d="M1 5.5L4.5 9L9 1"  stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 5.5L8.5 9L15 1" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
};

const Chat = () => {
  const { userId }  = useParams();
  const { user }    = useAuth();
  const { dark }    = useTheme();
  const myId        = user?._id || user?.id;
  const navigate    = useNavigate();
  const { isConnected, onlineUsers, sendMessage, onReceiveMessage, emitTyping, onTyping, markRead, emitCallEnd, onCallEnd, onCallMsgUpdated } = useSocket();

  const [matches,       setMatches]       = useState([]);
  const [messages,      setMessages]      = useState([]);
  const [activeUser,    setActiveUser]    = useState(null);
  const [text,          setText]          = useState('');
  const [isTyping,      setIsTyping]      = useState(false);
  const [unread,        setUnread]        = useState({});
  const [isBlocked,     setIsBlocked]     = useState(false);
  const [safetyMsg,     setSafetyMsg]     = useState('');
  const [readSet,       setReadSet]       = useState(new Set());
  const [showSafetyMenu,  setShowSafetyMenu]  = useState(false);
  const [safetyMenuPos,   setSafetyMenuPos]   = useState({ top:0, right:0 });
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal,  setShowBlockModal]  = useState(false);
  const [reportReason,    setReportReason]    = useState('');
  const [reportDesc,      setReportDesc]      = useState('');
  const [safetyLoading,   setSafetyLoading]   = useState(false);
  const [showCall,      setShowCall]      = useState(false);
  const [callRoomName,  setCallRoomName]  = useState('');
  const [callMsgId,     setCallMsgId]     = useState(null);
  const [callToast,     setCallToast]     = useState(null);
  const [ctxMenu,       setCtxMenu]       = useState(null);
  const [hoveredMsg,    setHoveredMsg]    = useState(null);
  const [chatCtxMenu,   setChatCtxMenu]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const messagesRef   = useRef(null);
  const typingTimer   = useRef(null);
  const menuRef       = useRef(null);
  const activeUserRef = useRef(null);
  const callToastTimer = useRef(null);

  useEffect(() => { activeUserRef.current = activeUser; }, [activeUser]);

  useEffect(() => {
    API.get('/matches').then(({ data }) => {
      const users = data.matches.map(m => m.user);
      setMatches(users);
      if (userId) {
        const found = users.find(u => u._id === userId);
        if (found) loadChat(found);
        else if (users.length > 0) loadChat(users[0]);
      } else if (users.length > 0) loadChat(users[0]);
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    const cleanup = onReceiveMessage((msg) => {
      const sid = msg.sender?._id || msg.sender;
      const cur = activeUserRef.current;
      if (cur && sid?.toString() === cur._id?.toString()) {
        setMessages(prev => [...prev, msg]);
        markRead(sid);
      } else {
        setUnread(prev => ({ ...prev, [sid]: (prev[sid] || 0) + 1 }));
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    const cleanup = onTyping(({ senderId, isTyping: t }) => {
      if (activeUserRef.current?._id === senderId) setIsTyping(t);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    const cleanup = onCallEnd(({ roomName, callMsgId: mId, duration }) => {
      setShowCall(false);
      setCallRoomName('');
      setCallMsgId(null);
      if (mId) {
        const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
        setMessages(prev => prev.map(m => m._id === mId
          ? { ...m, callStatus:'ended', content:`📹 Video call ended${duration ? ` · ${fmt(duration)}` : ''}|ROOM:` }
          : m));
      }
      showToast(`${activeUserRef.current?.name || 'Other user'} ended the call`, duration);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (!onCallMsgUpdated) return;
    const cleanup = onCallMsgUpdated(({ callMsgId: mId, duration }) => {
      if (mId) {
        const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
        setMessages(prev => prev.map(m => m._id === mId
          ? { ...m, callStatus:'ended', content:`📹 Video call ended${duration ? ` · ${fmt(duration)}` : ''}|ROOM:` }
          : m));
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    const h = e => {
      // Close safety menu only if click outside menuRef
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowSafetyMenu(false);
      }
      // Close context menus only if click is not inside them
      const isInsideMenu = e.target.closest('[data-ctx]');
      if (!isInsideMenu) {
        setTimeout(() => {
          setCtxMenu(null);
          setChatCtxMenu(null);
        }, 100);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  const loadChat = async (otherUser) => {
    setActiveUser(otherUser);
    setIsTyping(false);
    setSafetyMsg('');
    setIsBlocked(false);
    setUnread(prev => { const n = { ...prev }; delete n[otherUser._id]; return n; });
    try {
      const { data } = await API.get(`/chat/${otherUser._id}`);
      setMessages(data.messages);
      const rs = new Set(data.messages.filter(m => m.read && (m.sender?._id || m.sender)?.toString() === myId?.toString()).map(m => m._id));
      setReadSet(rs);
      markRead(otherUser._id);
    } catch (err) {
      if (err.response?.status === 403) { setIsBlocked(true); setMessages([]); }
    }
    try {
      const { data } = await API.get(`/block/check/${otherUser._id}`);
      setIsBlocked(data.isBlocked);
    } catch (_) {}
  };

  const handleSend = useCallback(() => {
    if (!text.trim() || !activeUser || isBlocked) return;
    const content = text.trim();
    setText('');
    const tmp = { _id:`tmp-${Date.now()}`, sender:{ _id:myId, name:user.name }, receiver:{ _id:activeUser._id }, content, createdAt:new Date().toISOString(), temp:true };
    setMessages(prev => [...prev, tmp]);
    sendMessage(activeUser._id, content,
      (confirmed) => setMessages(prev => prev.map(m => m._id === tmp._id ? { ...confirmed, delivered:true } : m)),
      () => { setMessages(prev => prev.filter(m => m._id !== tmp._id)); setText(content); }
    );
    emitTyping(activeUser._id, false);
  }, [text, activeUser, isBlocked, user]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!activeUser) return;
    emitTyping(activeUser._id, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(activeUser._id, false), 1500);
  };

  const handleReport = async () => {
    if (!reportReason) return;
    setSafetyLoading(true);
    try { await API.post('/report', { reportedUserId:activeUser._id, reason:reportReason, description:reportDesc }); setShowReportModal(false); setSafetyMsg('✅ Report submitted.'); }
    catch (err) { setSafetyMsg(err.response?.data?.message || 'Failed.'); }
    finally { setSafetyLoading(false); }
  };

  const handleBlock = async () => {
    setSafetyLoading(true);
    try { await API.post('/block', { blockedUserId:activeUser._id }); setIsBlocked(true); setShowBlockModal(false); setMessages([]); setSafetyMsg(`🚫 ${activeUser.name} blocked.`); }
    catch (err) { setSafetyMsg(err.response?.data?.message || 'Failed.'); }
    finally { setSafetyLoading(false); }
  };

  const handleUnblock = async () => {
    setSafetyLoading(true);
    try { await API.delete(`/block/${activeUser._id}`); setIsBlocked(false); setSafetyMsg('✅ Unblocked.'); loadChat(activeUser); }
    catch (err) { setSafetyMsg(err.response?.data?.message || 'Failed.'); }
    finally { setSafetyLoading(false); }
  };

  const isOnline = uid => onlineUsers.has(uid);

  const showToast = (msg, duration) => {
    clearTimeout(callToastTimer.current);
    setCallToast({ msg, duration });
    callToastTimer.current = setTimeout(() => setCallToast(null), 4000);
  };

  const startCall = async () => {
    if (showCall) return;
    const room = [myId?.toString(), activeUser._id?.toString()].sort().join('').slice(-14);
    setCallRoomName(room);
    setShowCall(true);
    try {
      const { data } = await API.post('/chat/send', { receiverId:activeUser._id, content:`📹 Video call started.|ROOM:${room}`, type:'call', callStatus:'started' });
      const msgId = data.data?._id;
      setCallMsgId(msgId);
      setMessages(prev => [...prev, data.data]);
    } catch (_) {}
  };

  const joinCall = (room) => { setCallRoomName(room); setShowCall(true); };

  const handleDeleteMsg = async (msgId, deleteFor) => {
    setCtxMenu(null);
    setDeleteConfirm(null);
    if (!msgId || msgId.startsWith('tmp-')) {
      setMessages(prev => prev.filter(m => m._id !== msgId));
      return;
    }
    // Optimistic update first
    if (deleteFor === 'everyone') {
      setMessages(prev => prev.map(m => m._id === msgId
        ? { ...m, content: '🚫 This message was deleted', deletedFor: true } : m));
    } else {
      setMessages(prev => prev.filter(m => m._id !== msgId));
    }
    try {
      await API.request({ method:'DELETE', url:`/chat/message/${msgId}`, data:{ deleteFor } });
    } catch (_) { if (activeUser) loadChat(activeUser); }
  };

  const handleDeleteChat = async (userId, forEveryone) => {
    setDeleteConfirm(null);
    setChatCtxMenu(null);
    const uid = userId != null ? String(userId) : '';
    if (!uid) { setSafetyMsg('❌ No user ID found'); return; }
    try {
      await API.get(`/chat/deleteall/${encodeURIComponent(uid)}/${forEveryone}`);
      const activeId = activeUser?._id != null ? String(activeUser._id) : '';
      if (activeId && activeId === uid) {
        await loadChat(activeUser);
      }
      setSafetyMsg(forEveryone ? '🗑️ Chat deleted for everyone.' : '🗑️ Chat deleted for you.');
      setTimeout(() => setSafetyMsg(''), 3000);
    } catch (err) {
      setSafetyMsg(`❌ ${err?.response?.data?.message || err.message}`);
    }
  };

  // ── Delete ALL chats at once ──────────────────────────
  const handleDeleteAllChats = async () => {
    setDeleteConfirm(null);
    try {
      await API.get('/chat/deleteallmine');
      const { data } = await API.get('/matches');
      const users = (data.matches || []).map((m) => m.user);
      setMatches(users);
      if (activeUser) await loadChat(activeUser);
      setSafetyMsg('🗑️ All chats cleared.');
      setTimeout(() => setSafetyMsg(''), 3000);
    } catch (err) {
      setSafetyMsg(`❌ ${err?.response?.data?.message || 'Could not clear chats.'}`);
    }
  };

  // ── Styles ──────────────────────────────────────────
  const border      = 'var(--border)';
  const textCol     = 'var(--text)';
  const muted       = 'var(--text3)';
  const bg3         = 'var(--bg3)';
  const glassNav    = dark ? 'rgba(18,20,30,0.94)'   : 'rgba(255,255,255,0.94)';
  const glassSide   = dark ? 'rgba(16,18,28,0.96)'   : 'rgba(250,251,255,0.96)';
  const glassMsgArea= dark ? 'rgba(10,11,20,0.45)'   : 'rgba(235,240,255,0.45)';
  const glassInput  = dark ? 'rgba(18,20,30,0.95)'   : 'rgba(255,255,255,0.95)';
  const bubbleMe    = dark ? 'rgba(67,97,238,0.38)'  : 'rgba(67,97,238,0.14)';
  const bubbleThem  = dark ? 'rgba(255,255,255,0.07)': 'rgba(255,255,255,0.88)';
  const inputField  = dark ? 'rgba(255,255,255,0.07)': 'rgba(240,244,255,0.9)';
  const sideActive  = dark ? 'rgba(67,97,238,0.18)'  : 'rgba(67,97,238,0.09)';

  return (
    <>
      <div style={{ maxWidth:'960px', margin:'0 auto', display:'grid', gridTemplateColumns:'300px 1fr', height:'calc(100vh - 62px)', overflow:'hidden', position:'fixed', top:'62px', left:'50%', transform:'translateX(-50%)', width:'100%' }}>

        {/* ══ SIDEBAR ══════════════════════════════════ */}
        <div style={{ background:glassSide, backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderRight:`1px solid ${border}`, display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

          <div style={{ padding:'0.9rem 1.2rem', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:glassNav }}>
            <span style={{ fontWeight:'700', fontSize:'0.95rem', color:textCol }}>Messages</span>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <button
                onClick={() => setDeleteConfirm({ type:'allchats' })}
                title="Clear all chats"
                style={{ background:'none', border:'none', cursor:'pointer', color:muted, fontSize:'0.78rem', padding:'3px 7px', borderRadius:'6px', fontFamily:"'DM Sans',sans-serif", opacity:0.7 }}>
                🗑️ All
              </button>
              <span style={{ fontSize:'0.7rem', color:'#fff', padding:'2px 9px', borderRadius:'20px', fontWeight:'700', background:isConnected ? '#10b981' : '#e74c3c' }}>
                {isConnected ? '● Live' : '○ Offline'}
              </span>
            </div>
          </div>

          <div style={{ padding:'8px 12px', borderBottom:`1px solid ${border}`, background:glassSide }}>
            <div style={{ background:inputField, borderRadius:'10px', padding:'7px 12px', fontSize:'0.82rem', color:muted, display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ opacity:0.6 }}>🔍</span> Search conversations...
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto' }}>
            {matches.length === 0 && (
              <div style={{ padding:'2rem 1rem', textAlign:'center', color:muted, fontSize:'0.85rem' }}>
                No matches yet.
                <button onClick={() => navigate('/matches')} style={{ display:'block', margin:'8px auto 0', color:'#4361ee', background:'none', border:'none', cursor:'pointer', fontWeight:'600', fontFamily:"'DM Sans',sans-serif" }}>
                  Find Matches →
                </button>
              </div>
            )}
            {matches.map((u, i) => {
              const isActive = activeUser?._id === u._id;
              const unreadCount = unread[u._id] || 0;
              return (
                <div key={u._id}
                  onClick={() => loadChat(u)}
                  onContextMenu={e => { e.preventDefault(); setChatCtxMenu({ userId:u._id, name:u.name, x:e.clientX, y:e.clientY }); }}
                  style={{ padding:'11px 1rem', display:'flex', alignItems:'center', gap:'11px', cursor:'pointer', borderBottom:`1px solid ${border}`, background:isActive ? sideActive : 'transparent', transition:'background 0.15s' }}>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <div style={{ width:'46px', height:'46px', borderRadius:'50%', background:avatarColors[i % avatarColors.length], display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'0.88rem', color:'#fff' }}>
                      {initials(u.name)}
                    </div>
                    {isOnline(u._id) && <div style={{ position:'absolute', bottom:'1px', right:'1px', width:'12px', height:'12px', borderRadius:'50%', background:'#10b981', border:`2px solid ${dark ? '#10121c' : '#fff'}` }} />}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2px' }}>
                      <span style={{ fontWeight:'600', fontSize:'0.88rem', color:isActive ? '#4361ee' : textCol }}>{u.name}</span>
                      {unreadCount > 0 && (
                        <span style={{ minWidth:'20px', height:'20px', borderRadius:'10px', background:'#4361ee', color:'#fff', fontSize:'0.68rem', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:'0.73rem', color:muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {isOnline(u._id) ? '● Online' : u.bio?.slice(0,26) || 'Tap to chat'}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setChatCtxMenu({ userId:u._id, name:u.name, x:e.clientX, y:e.clientY }); }}
                    style={{ background:'none', border:'none', color:muted, cursor:'pointer', fontSize:'1rem', padding:'4px', borderRadius:'6px', flexShrink:0, opacity:0.5 }}>⋮</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ MAIN CHAT ════════════════════════════════ */}
        {activeUser ? (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:glassMsgArea, backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}>

            {/* Header */}
            <div style={{ padding:'0.7rem 1rem', background:glassNav, backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:'12px', flexShrink:0 }}>
              <div style={{ position:'relative' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:avatarColors[matches.findIndex(m => m._id === activeUser._id) % avatarColors.length], display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'0.88rem', color:'#fff' }}>
                  {initials(activeUser.name)}
                </div>
                {isOnline(activeUser._id) && <div style={{ position:'absolute', bottom:'0', right:'0', width:'11px', height:'11px', borderRadius:'50%', background:'#10b981', border:`2px solid ${dark ? '#12141e' : '#fff'}` }} />}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:'700', fontSize:'0.92rem', color:textCol }}>{activeUser.name}</div>
                <div style={{ fontSize:'0.72rem', color:isTyping ? '#10b981' : muted, marginTop:'1px' }}>
                  {isBlocked ? '🚫 Blocked' : isTyping ? 'typing...' : isOnline(activeUser._id) ? 'online' : 'offline'}
                </div>
              </div>
              <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                {!isBlocked && (
                  <>
                    <button onClick={startCall} className="btn-press"
                      style={{ padding:'6px 12px', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', borderRadius:'8px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'0.75rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px' }}>
                      📹 Call
                    </button>
                    <button onClick={() => navigate(`/rating/${activeUser._id}`)} className="btn-press"
                      style={{ padding:'6px 12px', background:'var(--accent-light)', color:'#4361ee', border:'none', borderRadius:'8px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'0.75rem', cursor:'pointer' }}>
                      ⭐ Rate
                    </button>
                  </>
                )}
                <div style={{ position:'relative' }} ref={menuRef}>
                  <button
                    style={{ width:'32px', height:'32px', background:'transparent', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'1.3rem', color:muted, display:'flex', alignItems:'center', justifyContent:'center' }}
                    onClick={e => {
                      e.stopPropagation();
                      if (showSafetyMenu) { setShowSafetyMenu(false); return; }
                      const rect = e.currentTarget.getBoundingClientRect();
                      setSafetyMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                      setShowSafetyMenu(true);
                    }}>⋮</button>
                </div>
              </div>
            </div>

            {/* Safety banner */}
            {safetyMsg && (
              <div style={{ padding:'6px 1.2rem', background:dark ? 'rgba(16,185,129,0.1)' : '#f0fdf4', color:'#10b981', fontSize:'0.8rem', fontWeight:'600', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${border}` }}>
                {safetyMsg}
                <span style={{ cursor:'pointer', opacity:0.7 }} onClick={() => setSafetyMsg('')}>×</span>
              </div>
            )}

            {isBlocked ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'2rem', textAlign:'center' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🚫</div>
                <div style={{ fontWeight:'700', color:textCol, marginBottom:'4px' }}>You blocked {activeUser.name}</div>
                <div style={{ fontSize:'0.85rem', color:muted, marginBottom:'1.5rem' }}>Unblock to send messages.</div>
                <button style={{ padding:'10px 24px', background:'#4361ee', color:'#fff', border:'none', borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }} onClick={handleUnblock} disabled={safetyLoading}>
                  {safetyLoading ? '...' : '✅ Unblock'}
                </button>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div ref={messagesRef} className="chat-bg-glass" style={{ flex:1, padding:'12px 16px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'2px', minHeight:0 }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign:'center', marginTop:'4rem' }}>
                      <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>👋</div>
                      <div style={{ color:muted, fontSize:'0.88rem' }}>Say hi to <strong style={{ color:textCol }}>{activeUser.name}</strong>!</div>
                    </div>
                  )}

                  {messages.map((msg, idx) => {
                    const isMe      = (msg.sender?._id || msg.sender)?.toString() === myId?.toString();
                    const showDate  = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[idx-1]?.createdAt).toDateString();
                    const isCallMsg = msg.content?.startsWith('📹');
                    const callRoom  = isCallMsg ? (msg.content.split('|ROOM:')[1] || '') : '';
                    const callText  = isCallMsg ? msg.content.split('|ROOM:')[0] : msg.content;
                    const callEnded = isCallMsg && (msg.callStatus === 'ended' || callRoom === '');
                    const isRead    = readSet.has(msg._id) || msg.read;

                    return (
                      <React.Fragment key={msg._id}>
                        {showDate && (
                          <div style={{ textAlign:'center', margin:'10px 0 6px', alignSelf:'center' }}>
                            <span style={{ background:dark ? 'rgba(255,255,255,0.08)' : 'rgba(67,97,238,0.08)', color:muted, fontSize:'0.68rem', fontWeight:'600', padding:'3px 12px', borderRadius:'20px' }}>
                              {new Date(msg.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                            </span>
                          </div>
                        )}

                        {isCallMsg ? (
                          <div className={isMe ? 'bubble-me' : 'bubble-them'}
                            onContextMenu={e => { e.preventDefault(); setCtxMenu({ msgId:msg._id, x:e.clientX, y:e.clientY, isMe }); }}
                            style={{ display:'flex', justifyContent:isMe ? 'flex-end' : 'flex-start', marginBottom:'4px' }}>
                            <div style={{ background:callEnded ? (dark ? 'rgba(231,76,60,0.15)' : 'rgba(231,76,60,0.08)') : (isMe ? bubbleMe : bubbleThem), backdropFilter:'blur(12px)', border:`1px solid ${callEnded ? 'rgba(231,76,60,0.25)' : (dark ? 'rgba(67,97,238,0.2)' : 'rgba(67,97,238,0.12)')}`, borderRadius:isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding:'10px 14px', maxWidth:'260px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                <div style={{ width:'38px', height:'38px', borderRadius:'50%', background:callEnded ? 'linear-gradient(135deg,#e74c3c,#c0392b)' : 'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>
                                  {callEnded ? '📵' : '📹'}
                                </div>
                                <div>
                                  <div style={{ fontSize:'0.82rem', fontWeight:'700', color:textCol, marginBottom:'2px' }}>
                                    {callEnded ? (isMe ? 'You ended the call' : `${activeUser.name} ended the call`) : (isMe ? 'You started a call' : `${activeUser.name} is calling`)}
                                  </div>
                                  <div style={{ fontSize:'0.72rem', color:muted, marginBottom:callEnded ? 0 : '5px' }}>
                                    {callEnded ? (callText.includes('·') ? callText.split('·')[1]?.trim() : 'Call ended') : 'Video call'}
                                  </div>
                                  {!callEnded && (
                                    <button onClick={() => joinCall(callRoom)}
                                      style={{ padding:'5px 14px', background:'#4361ee', color:'#fff', border:'none', borderRadius:'20px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'0.73rem', cursor:'pointer', marginTop:'2px' }}>
                                      📹 Join
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize:'0.62rem', color:muted, textAlign:'right', marginTop:'5px' }}>
                                {msg.createdAt ? formatTime(msg.createdAt) : 'now'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={isMe ? 'bubble-me' : 'bubble-them'}
                            onContextMenu={e => { e.preventDefault(); setCtxMenu({ msgId:msg._id, x:e.clientX, y:e.clientY, isMe }); }}
                            onMouseEnter={() => setHoveredMsg(msg._id)}
                            onMouseLeave={() => setHoveredMsg(null)}
                            style={{ display:'flex', justifyContent:isMe ? 'flex-end' : 'flex-start', marginBottom:'1px', alignItems:'center', gap:'4px' }}>

                            {isMe && hoveredMsg === msg._id && (
                              <div style={{ display:'flex', gap:'3px', flexShrink:0 }}>
                                <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm({ type:'msg', id:msg._id, isMe:true, forEveryone:false }); }}
                                  style={{ background:dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)', border:'none', cursor:'pointer', padding:'5px 8px', borderRadius:'8px', color:'var(--text2)', fontSize:'0.78rem', flexShrink:0 }} title="Delete for me">🗑️</button>
                                <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm({ type:'msg', id:msg._id, isMe:true, forEveryone:true }); }}
                                  style={{ background:dark ? 'rgba(231,76,60,0.15)' : 'rgba(231,76,60,0.1)', border:'none', cursor:'pointer', padding:'5px 8px', borderRadius:'8px', color:'#e74c3c', fontSize:'0.78rem', flexShrink:0 }} title="Delete for everyone">🚫</button>
                              </div>
                            )}

                            <div style={{ maxWidth:'72%' }}>
                              <div style={{
                                padding:'8px 12px 6px', fontSize:'0.88rem', lineHeight:1.5, wordBreak:'break-word',
                                backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', boxShadow:'0 1px 4px rgba(0,0,0,0.1)',
                                ...(isMe ? { background:bubbleMe, color:dark ? '#e8eaf6' : '#1a1a2e', borderRadius:'16px 16px 4px 16px', border:'1px solid rgba(67,97,238,0.25)' }
                                         : { background:bubbleThem, color:textCol, borderRadius:'16px 16px 16px 4px', border:`1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(67,97,238,0.1)'}` })
                              }}>
                                <span style={{ opacity:msg.deletedFor ? 0.5 : 1, fontStyle:msg.deletedFor ? 'italic' : 'normal' }}>{callText}</span>
                                <span style={{ float:'right', marginLeft:'8px', marginTop:'3px', display:'inline-flex', alignItems:'center', gap:'1px' }}>
                                  <span style={{ fontSize:'0.63rem', color:dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)', whiteSpace:'nowrap' }}>
                                    {msg.createdAt ? formatTime(msg.createdAt) : 'now'}
                                  </span>
                                  {isMe && <Ticks temp={!!msg.temp} read={isRead} />}
                                </span>
                              </div>
                            </div>

                            {!isMe && hoveredMsg === msg._id && (
                              <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm({ type:'msg', id:msg._id, isMe:false, forEveryone:false }); }}
                                style={{ background:dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)', border:'none', cursor:'pointer', padding:'5px 8px', borderRadius:'8px', color:'var(--text2)', fontSize:'0.78rem', flexShrink:0 }} title="Delete for me">🗑️</button>
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {isTyping && (
                    <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:'4px' }}>
                      <div style={{ background:bubbleThem, backdropFilter:'blur(12px)', borderRadius:'16px 16px 16px 4px', padding:'10px 14px', border:`1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(67,97,238,0.1)'}` }}>
                        <div style={{ display:'flex', gap:'4px', alignItems:'center', height:'14px' }}>
                          {[0,180,360].map(d => (
                            <span key={d} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--text3)', display:'inline-block', animation:'typingBounce 1.2s infinite', animationDelay:`${d}ms` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input bar */}
                <div style={{ padding:'8px 12px', background:glassInput, backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderTop:`1px solid ${border}`, display:'flex', gap:'8px', alignItems:'center', flexShrink:0 }}>
                  <div style={{ flex:1, background:inputField, borderRadius:'24px', display:'flex', alignItems:'center', padding:'0 14px', border:`1px solid ${border}` }}>
                    <input
                      style={{ flex:1, background:'transparent', border:'none', outline:'none', fontFamily:"'DM Sans',sans-serif", fontSize:'0.9rem', color:textCol, padding:'9px 0' }}
                      placeholder={`Message ${activeUser.name}...`}
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    />
                  </div>
                  <button onClick={handleSend} disabled={!text.trim()}
                    style={{ width:'42px', height:'42px', borderRadius:'50%', background:text.trim() ? '#4361ee' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(67,97,238,0.15)'), border:'none', cursor:text.trim() ? 'pointer' : 'default', color:text.trim() ? '#fff' : 'var(--text3)', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}>
                    ➤
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:muted, background:glassMsgArea }}>
            <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:dark ? 'rgba(67,97,238,0.15)' : 'rgba(67,97,238,0.08)', border:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', marginBottom:'1.5rem' }}>💬</div>
            <div style={{ fontWeight:'700', color:textCol, marginBottom:'6px', fontSize:'1.1rem' }}>SkillSwap Chat</div>
            <div style={{ fontSize:'0.85rem', marginBottom:'1.5rem', textAlign:'center', maxWidth:'220px', color:muted }}>Select a conversation to start chatting</div>
            <button className="btn-primary" style={{ maxWidth:'180px', borderRadius:'20px' }} onClick={() => navigate('/matches')}>Find Matches</button>
          </div>
        )}

        {/* ── Call ended toast ─────────────────────────── */}
        {callToast && (
          <div className="modal-in" style={{ position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)', zIndex:9998, background:dark ? 'rgba(20,22,35,0.97)' : 'rgba(255,255,255,0.97)', backdropFilter:'blur(16px)', border:`1px solid ${border}`, borderRadius:'16px', padding:'14px 22px', display:'flex', alignItems:'center', gap:'14px', boxShadow:'0 8px 32px rgba(0,0,0,0.25)', minWidth:'260px' }}>
            <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#e74c3c,#c0392b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>📵</div>
            <div>
              <div style={{ fontWeight:'700', fontSize:'0.9rem', color:textCol, marginBottom:'2px' }}>{callToast.msg}</div>
              {callToast.duration > 0 && (
                <div style={{ fontSize:'0.75rem', color:muted }}>
                  Duration: {String(Math.floor(callToast.duration/60)).padStart(2,'0')}:{String(callToast.duration%60).padStart(2,'0')}
                </div>
              )}
            </div>
            <button onClick={() => setCallToast(null)} style={{ marginLeft:'auto', background:'none', border:'none', color:muted, cursor:'pointer', fontSize:'1.1rem', flexShrink:0 }}>×</button>
          </div>
        )}

        {/* ── Safety menu (fixed position — no overflow clip) ── */}
        {showSafetyMenu && activeUser && (
          <div data-ctx="true" style={{ position:'fixed', top:safetyMenuPos.top, right:safetyMenuPos.right, background:dark ? 'rgba(22,25,38,0.98)' : '#fff', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:`1px solid ${border}`, borderRadius:'12px', boxShadow:'0 8px 28px rgba(0,0,0,0.22)', zIndex:9990, minWidth:'190px', overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', fontSize:'0.85rem', fontWeight:'600', color:textCol, cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}
              onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#f4f6ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => { setShowReportModal(true); setShowSafetyMenu(false); }}>
              🚩 Report
            </div>
            {isBlocked
              ? <div style={{ padding:'10px 16px', fontSize:'0.85rem', fontWeight:'600', color:'#10b981', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}
                  onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { handleUnblock(); setShowSafetyMenu(false); }}>✅ Unblock</div>
              : <div style={{ padding:'10px 16px', fontSize:'0.85rem', fontWeight:'600', color:'#e74c3c', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}
                  onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(231,76,60,0.1)' : '#fff5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { setShowBlockModal(true); setShowSafetyMenu(false); }}>🚫 Block</div>
            }
            <div style={{ borderTop:`1px solid ${border}` }}>
              <div style={{ padding:'10px 16px', fontSize:'0.85rem', fontWeight:'600', color:'#e74c3c', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(231,76,60,0.1)' : '#fff5f5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => { setDeleteConfirm({ type:'chat', userId:activeUser._id, name:activeUser.name, forEveryone:false }); setShowSafetyMenu(false); }}>
                🗑️ Delete for me
              </div>
              <div style={{ padding:'10px 16px', fontSize:'0.85rem', fontWeight:'600', color:'#e74c3c', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(231,76,60,0.1)' : '#fff5f5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => { setDeleteConfirm({ type:'chat', userId:activeUser._id, name:activeUser.name, forEveryone:true }); setShowSafetyMenu(false); }}>
                🚫 Delete for everyone
              </div>
            </div>
          </div>
        )}

        {/* ── Sidebar chat context menu ────────────────── */}
        {chatCtxMenu && (
          <div data-ctx="true" style={{ position:'fixed', top:Math.min(chatCtxMenu.y, window.innerHeight-120), left:Math.min(chatCtxMenu.x, window.innerWidth-200), zIndex:9998, background:dark ? 'rgba(22,25,40,0.98)' : '#fff', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:`1px solid ${border}`, borderRadius:'12px', boxShadow:'0 8px 28px rgba(0,0,0,0.3)', overflow:'hidden', minWidth:'200px' }}>
            <div style={{ padding:'7px 14px 5px', fontSize:'0.7rem', fontWeight:'700', color:muted, letterSpacing:'1px', textTransform:'uppercase', borderBottom:`1px solid ${border}` }}>{chatCtxMenu.name}</div>
            <div style={{ padding:'5px 4px' }}>
              {[
                { icon:'🗑️', label:'Delete for me',      sub:"Only you won't see this", color:textCol,   fe:false },
                { icon:'🚫', label:'Delete for everyone', sub:'Removes for both sides',  color:'#e74c3c', fe:true  },
              ].map(item => (
                <div key={item.label} onClick={() => { setChatCtxMenu(null); setDeleteConfirm({ type:'chat', userId:chatCtxMenu.userId, name:chatCtxMenu.name, forEveryone:item.fe }); }}
                  style={{ padding:'9px 12px', fontSize:'0.85rem', color:item.color, cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', borderRadius:'8px', margin:'0 4px' }}
                  onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : '#f4f6ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight:'600' }}>{item.label}</div>
                    <div style={{ fontSize:'0.7rem', opacity:0.6 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Message right-click context menu ─────────── */}
        {ctxMenu && (
          <div data-ctx="true" style={{ position:'fixed', top:Math.min(ctxMenu.y, window.innerHeight-140), left:Math.min(ctxMenu.x, window.innerWidth-200), zIndex:9998, background:dark ? 'rgba(22,25,40,0.98)' : '#fff', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:`1px solid ${border}`, borderRadius:'14px', boxShadow:'0 8px 32px rgba(0,0,0,0.3)', overflow:'hidden', minWidth:'190px' }}>
            <div style={{ padding:'9px 16px 7px', fontSize:'0.7rem', fontWeight:'700', color:muted, letterSpacing:'1px', textTransform:'uppercase', borderBottom:`1px solid ${border}` }}>Message options</div>
            <div style={{ padding:'6px 4px' }}>
              <div style={{ padding:'9px 14px', fontSize:'0.88rem', color:textCol, cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', borderRadius:'8px', margin:'0 4px' }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : '#f4f6ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={e => { e.stopPropagation(); handleDeleteMsg(ctxMenu.msgId, 'me'); }}>
                <span>🗑️</span><div><div style={{ fontWeight:'600' }}>Delete for me</div><div style={{ fontSize:'0.72rem', color:muted }}>Only you won't see this</div></div>
              </div>
              {ctxMenu.isMe && (
                <div style={{ padding:'9px 14px', fontSize:'0.88rem', color:'#e74c3c', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', borderRadius:'8px', margin:'0 4px' }}
                  onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(231,76,60,0.1)' : '#fff5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={e => { e.stopPropagation(); handleDeleteMsg(ctxMenu.msgId, 'everyone'); }}>
                  <span>🚫</span><div><div style={{ fontWeight:'600' }}>Delete for everyone</div><div style={{ fontSize:'0.72rem', opacity:0.7 }}>Removes for both sides</div></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Delete confirm modal ──────────────────────── */}
        {deleteConfirm && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} onClick={() => setDeleteConfirm(null)}>
            <div className="modal-in" style={{ background:dark ? 'rgba(22,25,40,0.98)' : '#fff', backdropFilter:'blur(20px)', borderRadius:'16px', padding:'1.8rem', width:'100%', maxWidth:'380px', boxShadow:'0 20px 60px rgba(0,0,0,0.4)', border:`1px solid ${border}` }} onClick={e => e.stopPropagation()}>
              <div style={{ textAlign:'center', marginBottom:'1.2rem' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'10px' }}>
                  {deleteConfirm.type === 'allchats' ? '🗑️' : deleteConfirm.forEveryone ? '🚫' : '🗑️'}
                </div>
                <div style={{ fontWeight:'700', fontSize:'1.05rem', color:textCol, marginBottom:'6px' }}>
                  {deleteConfirm.type === 'allchats'
                    ? 'Clear all chats?'
                    : deleteConfirm.type === 'chat'
                    ? `Delete chat with ${deleteConfirm.name}?`
                    : 'Delete this message?'}
                </div>
                <div style={{ fontSize:'0.83rem', color:muted, lineHeight:1.5 }}>
                  {deleteConfirm.type === 'allchats'
                    ? 'All your conversations will be cleared from your side only. Cannot be undone.'
                    : deleteConfirm.forEveryone
                    ? 'Permanently deleted for everyone. Cannot be undone.'
                    : 'Only deleted from your side.'}
                </div>
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button style={{ flex:1, padding:'11px', background:'var(--bg3)', color:'var(--text2)', border:'none', borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }}
                  onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#e74c3c,#c0392b)', color:'#fff', border:'none', borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:'pointer' }}
                  onClick={() => {
                    if (deleteConfirm.type === 'allchats') handleDeleteAllChats();
                    else if (deleteConfirm.type === 'chat') {
                      const uid = deleteConfirm.userId || activeUser?._id;
                      handleDeleteChat(uid, deleteConfirm.forEveryone);
                    } else {
                      handleDeleteMsg(deleteConfirm.id, deleteConfirm.forEveryone ? 'everyone' : 'me');
                    }
                  }}>
                  {deleteConfirm.type === 'allchats' ? '🗑️ Clear All' : deleteConfirm.forEveryone ? '🚫 Delete for Everyone' : '🗑️ Delete for Me'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Report Modal ──────────────────────────────── */}
        {showReportModal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} className="overlay-fade" onClick={() => setShowReportModal(false)}>
            <div style={{ background:dark ? 'rgba(22,25,40,0.98)' : '#fff', backdropFilter:'blur(20px)', borderRadius:'16px', padding:'1.5rem', width:'100%', maxWidth:'400px', boxShadow:'0 20px 60px rgba(0,0,0,0.4)', border:`1px solid ${border}` }} className="modal-in" onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize:'1.1rem', color:textCol, marginBottom:'1rem' }}>🚩 Report {activeUser?.name}</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'1rem' }}>
                {REPORT_REASONS.map(r => (
                  <label key={r.value} style={{ display:'flex', alignItems:'center', padding:'10px 14px', border:`1.5px solid ${reportReason === r.value ? '#4361ee' : border}`, borderRadius:'10px', cursor:'pointer', fontSize:'0.88rem', color:reportReason === r.value ? '#4361ee' : textCol, background:reportReason === r.value ? 'var(--accent-light)' : 'transparent' }}>
                    <input type="radio" name="reason" value={r.value} checked={reportReason === r.value} onChange={e => setReportReason(e.target.value)} style={{ marginRight:'8px' }} />
                    {r.label}
                  </label>
                ))}
              </div>
              <textarea style={{ width:'100%', padding:'12px', border:`1.5px solid ${border}`, borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontSize:'0.88rem', resize:'vertical', minHeight:'70px', background:bg3, color:textCol, outline:'none', marginBottom:'1rem' }} placeholder="Details (optional)..." value={reportDesc} onChange={e => setReportDesc(e.target.value)} />
              <div style={{ display:'flex', gap:'10px' }}>
                <button style={{ flex:1, padding:'11px', background:bg3, color:'var(--text2)', border:'none', borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }} onClick={() => setShowReportModal(false)}>Cancel</button>
                <button style={{ flex:1, padding:'11px', background:'#4361ee', color:'#fff', border:'none', borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }} onClick={handleReport} disabled={safetyLoading || !reportReason}>{safetyLoading ? '...' : 'Submit'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Block Modal ───────────────────────────────── */}
        {showBlockModal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} className="overlay-fade" onClick={() => setShowBlockModal(false)}>
            <div style={{ background:dark ? 'rgba(22,25,40,0.98)' : '#fff', backdropFilter:'blur(20px)', borderRadius:'16px', padding:'1.5rem', width:'100%', maxWidth:'380px', boxShadow:'0 20px 60px rgba(0,0,0,0.4)', border:`1px solid ${border}` }} className="modal-in" onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize:'1.1rem', color:textCol, marginBottom:'1rem' }}>🚫 Block {activeUser?.name}?</h3>
              <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:'8px', marginBottom:'1.5rem', padding:'1rem', background:dark ? 'rgba(231,76,60,0.08)' : '#fff5f5', borderRadius:'10px', fontSize:'0.85rem', color:'var(--text2)', lineHeight:1.6 }}>
                <li>🔇 They cannot message you</li>
                <li>👻 Won't appear in matches</li>
                <li>↩️ Unblock anytime</li>
              </ul>
              <div style={{ display:'flex', gap:'10px' }}>
                <button style={{ flex:1, padding:'11px', background:bg3, color:'var(--text2)', border:'none', borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }} onClick={() => setShowBlockModal(false)}>Cancel</button>
                <button style={{ flex:1, padding:'11px', background:'#e74c3c', color:'#fff', border:'none', borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }} onClick={handleBlock} disabled={safetyLoading}>{safetyLoading ? '...' : '🚫 Block'}</button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes typingBounce {
            0%,60%,100%{transform:translateY(0);opacity:0.4}
            30%{transform:translateY(-5px);opacity:1}
          }
        `}</style>
      </div>

      {showCall && activeUser && (
        <VideoCallModal
          roomName={callRoomName}
          displayName={user?.name || 'You'}
          otherUserName={activeUser.name}
          onClose={(duration) => {
            emitCallEnd(activeUser._id, callRoomName, callMsgId, duration);
            setShowCall(false);
            setCallRoomName('');
            setCallMsgId(null);
            showToast('Call ended', duration);
          }}
        />
      )}
    </>
  );
};

export default Chat;