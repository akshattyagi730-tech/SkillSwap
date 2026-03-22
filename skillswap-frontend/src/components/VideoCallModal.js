import React, { useState, useEffect, useRef } from 'react';

// ── Uses Jitsi Meet directly via URL (most reliable) ──
// No API key needed, works on localhost + production
// Both users join same room via sorted room name

const VideoCallModal = ({ roomName, displayName, otherUserName, onClose }) => {
  const [duration, setDuration] = useState(0);
  const [loaded,   setLoaded]   = useState(false);
  const timerRef = useRef(null);

  // Clean room name — alphanumeric only, max 50 chars
  const safeRoom = `SkillSwap${roomName}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50);

  // Jitsi URL with all settings in fragment (works without external_api.js)
  const jitsiUrl = `https://meet.jit.si/${safeRoom}#` + [
    `userInfo.displayName="${encodeURIComponent(displayName)}"`,
    `config.prejoinPageEnabled=false`,
    `config.startWithAudioMuted=false`,
    `config.startWithVideoMuted=false`,
    `config.disableDeepLinking=true`,
    `config.enableWelcomePage=false`,
    `config.disableInviteFunctions=true`,
    `interfaceConfig.SHOW_JITSI_WATERMARK=false`,
    `interfaceConfig.SHOW_BRAND_WATERMARK=false`,
    `interfaceConfig.MOBILE_APP_PROMO=false`,
    `interfaceConfig.HIDE_INVITE_MORE_HEADER=true`,
    `interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","desktop","chat","fullscreen","tileview","hangup"]`,
  ].join('&');

  useEffect(() => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#0a0c14' }}>

      {/* ── Top bar ─────────────────────────────── */}
      <div style={{
        height: '52px', flexShrink: 0,
        background: 'rgba(14,16,26,0.98)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem' }}>⚡</span>
          <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.9rem' }}>SkillSwap Call</span>
          <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8rem' }}>with {otherUserName}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: loaded ? '#10b981' : '#f59e0b', animation: 'vcPulse 1.5s ease-in-out infinite' }} />
            <span style={{ color: loaded ? '#10b981' : '#f59e0b', fontSize: '0.78rem', fontWeight: '600' }}>
              {loaded ? fmt(duration) : 'Connecting...'}
            </span>
          </div>
          <button onClick={() => onClose(duration)} style={{
            padding: '7px 18px',
            background: 'linear-gradient(135deg,#e74c3c,#c0392b)',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontFamily: "'DM Sans',sans-serif", fontWeight: '700',
            fontSize: '0.82rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 12px rgba(231,76,60,0.35)',
          }}>
            📵 End Call
          </button>
        </div>
      </div>

      {/* ── Video iframe ────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Loading hint */}
        {!loaded && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#0a0c14', gap: '12px',
          }}>
            <div style={{ fontSize: '2.5rem', animation: 'vcSpin 1.2s linear infinite', display: 'inline-block' }}>📡</div>
            <div style={{ color: '#fff', fontWeight: '600' }}>Loading call room...</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', textAlign: 'center', maxWidth: '280px' }}>
              Both you and {otherUserName} will join room:<br/>
              <code style={{ color: '#4361ee', fontSize: '0.78rem' }}>{safeRoom}</code>
            </div>
          </div>
        )}

        <iframe
          key={safeRoom}
          src={jitsiUrl}
          allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            border: 'none', zIndex: loaded ? 2 : 0,
          }}
          title="SkillSwap Video Call"
        />
      </div>

      <style>{`
        @keyframes vcPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes vcSpin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};

export default VideoCallModal;