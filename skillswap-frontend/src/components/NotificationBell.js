import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { requestNotificationPermission } from '../utils/notifications';

const NotificationBell = ({ notifications, onClear }) => {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [permDenied, setPermDenied] = useState(false);
  const ref = useRef(null);

  const unread = notifications.filter(n => !n.read).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ask permission when bell is clicked
  const handleOpen = async () => {
    const perm = await requestNotificationPermission();
    setPermDenied(perm === 'denied');
    setOpen(v => !v);
  };

  const handleClick = (n) => {
    onClear(n.id);
    setOpen(false);
    navigate(n.url || '/dashboard');
  };

  const bg     = dark ? 'var(--bg2)' : '#fff';
  const border = 'var(--border)';

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{ width: '38px', height: '38px', borderRadius: '10px', border: `1.5px solid ${border}`, background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.2s', fontSize: '1.1rem' }}
        className="theme-toggle"
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', minWidth: '18px', height: '18px', background: '#e74c3c', color: '#fff', borderRadius: '9px', fontSize: '0.65rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: `2px solid var(--bg)` }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="modal-in" style={{ position: 'absolute', right: 0, top: '46px', width: '320px', background: bg, border: `1.5px solid ${border}`, borderRadius: '14px', boxShadow: '0 12px 40px var(--shadow2)', zIndex: 500, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text)' }}>Notifications</span>
            {notifications.length > 0 && (
              <button onClick={() => onClear('all')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                Clear all
              </button>
            )}
          </div>

          {/* Permission warning */}
          {permDenied && (
            <div style={{ padding: '10px 16px', background: dark ? '#2a1a1a' : '#fff5f5', color: 'var(--error-color)', fontSize: '0.78rem', borderBottom: `1px solid ${border}` }}>
              ⚠️ Browser notifications are blocked. Enable them in your browser settings.
            </div>
          )}

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '0.85rem' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔔</div>
                You're all caught up!
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id}
                  onClick={() => handleClick(n)}
                  style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'flex-start', background: n.read ? 'transparent' : (dark ? 'var(--accent-light)' : '#f4f6ff'), transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = dark ? '#1e2450' : '#eef2ff'}
                  onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : (dark ? 'var(--accent-light)' : '#f4f6ff')}
                >
                  <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '1px' }}>{n.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: n.read ? '400' : '600', color: 'var(--text)', marginBottom: '2px' }}>{n.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text4)', marginTop: '3px' }}>{n.time}</div>
                  </div>
                  {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4361ee', flexShrink: 0, marginTop: '4px' }} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;