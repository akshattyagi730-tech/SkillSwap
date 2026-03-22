import React, { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth }   from '../context/AuthContext';
import { useTheme }  from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications, showBrowserNotification } from '../utils/notifications';
import NotificationBell from './NotificationBell';

let _notifId = 1;
const makeNotif = (icon, title, body, url) => ({
  id: _notifId++, icon, title, body, url,
  time: 'Just now', read: false,
});

const Navbar = () => {
  const { user, logout }  = useAuth();
  const { dark, toggle }  = useTheme();
  const { onReceiveMessage } = useSocket();
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  const [notifications, setNotifications] = useState([]);

  const addNotif = useCallback((n) => {
    setNotifications(prev => [n, ...prev].slice(0, 20));
  }, []);

  // ── Listen to socket for real-time browser + bell notifs ──
  React.useEffect(() => {
    const cleanup = onReceiveMessage((msg) => {
      const senderName = msg.sender?.name || 'Someone';
      const preview    = msg.content || '';

      // Browser notification (only if tab not focused)
      if (document.visibilityState !== 'visible') {
        showBrowserNotification(`💬 New message from ${senderName}`, {
          body: preview.slice(0, 80),
          tag: 'message',
          url: '/chat',
        });
      }

      // Bell notification (always)
      addNotif(makeNotif('💬', `New message from ${senderName}`, preview.slice(0, 60), '/chat'));
    });
    return cleanup;
  }, [onReceiveMessage, addNotif]);

  // Expose addNotif globally so other pages can fire notifications
  React.useEffect(() => {
    window._skillswapNotify = {
      match:   (name)           => addNotif(makeNotif('🔥', `New match: ${name}!`, 'You have a new skill match!', '/matches')),
      review:  (name, rating)   => addNotif(makeNotif('⭐', `${name} rated you ${rating}/5`, 'Check your profile to see the review.', '/profile')),
      session: (skill, name)    => addNotif(makeNotif('⏰', `Session: ${skill}`, `With ${name}`, '/chat')),
    };
    return () => { window._skillswapNotify = null; };
  }, [addNotif]);

  const clearNotif = (id) => {
    if (id === 'all') setNotifications([]);
    else setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLinks = [
    { to: '/dashboard', label: 'Home',    icon: '🏠' },
    { to: '/matches',   label: 'Matches', icon: '🔍' },
    { to: '/chat',      label: 'Chat',    icon: '💬' },
    { to: '/profile',   label: 'Profile', icon: '👤' },
  ];

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2rem', height: '60px', background: dark ? 'rgba(26,29,39,0.88)' : 'rgba(255,255,255,0.88)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1.5px solid var(--border)`, position: 'sticky', top: 0, zIndex: 100, boxShadow: `0 2px 12px var(--shadow)` }}>

      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <span style={{ fontSize: '1.4rem' }}>⚡</span>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: '700', color: 'var(--text)', letterSpacing: '-0.5px' }}>SkillSwap</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {navLinks.map(({ to, label, icon }) => (
          <Link key={to} to={to} style={{ padding: '7px 13px', borderRadius: '8px', textDecoration: 'none', color: pathname.startsWith(to) ? '#4361ee' : 'var(--text3)', fontWeight: '500', fontSize: '0.85rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px', background: pathname.startsWith(to) ? 'var(--accent-light)' : 'transparent' }}>
            <span style={{ fontSize: '14px' }}>{icon}</span> {label}
          </Link>
        ))}

        <div style={{ marginLeft: '8px', padding: '5px 12px', background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#fff', borderRadius: '20px', fontWeight: '700', fontSize: '0.82rem' }}>
          🪙 {user?.credits ?? 0}
        </div>

        {/* Notification Bell */}
        <NotificationBell notifications={notifications} onClear={clearNotif} />

        {/* Dark / Light toggle */}
        <button className="theme-toggle" onClick={toggle} title="Toggle theme">
          {dark ? '☀️' : '🌙'}
        </button>

        <button onClick={handleLogout} style={{ marginLeft: '4px', padding: '7px 16px', background: dark ? '#2a1a1a' : '#fff', color: '#e74c3c', border: '1.5px solid #fdd', borderRadius: '8px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: '600', fontSize: '0.82rem', transition: 'all 0.2s' }}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;