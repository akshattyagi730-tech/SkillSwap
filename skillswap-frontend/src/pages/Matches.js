import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

const avatarColors = [
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#fccb90,#d57eeb)',
];

const REPORT_REASONS = [
  { value: 'fake_profile',           label: '🎭 Fake Profile' },
  { value: 'spam',                   label: '📢 Spam' },
  { value: 'inappropriate_behavior', label: '🚫 Inappropriate Behavior' },
  { value: 'wrong_skills_listed',    label: '❌ Wrong Skills Listed' },
];

const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const Matches = () => {
  const { dark } = useTheme();
  const [matches,  setMatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [accepted, setAccepted] = useState(new Set());
  const [rejected, setRejected] = useState(new Set());
  const navigate = useNavigate();

  const [targetUser,      setTargetUser]      = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal,  setShowBlockModal]  = useState(false);
  const [reportReason,    setReportReason]    = useState('');
  const [reportDesc,      setReportDesc]      = useState('');
  const [safetyLoading,   setSafetyLoading]   = useState(false);
  const [safetyMsg,       setSafetyMsg]       = useState('');
  const [blocked,         setBlocked]         = useState(new Set());

  useEffect(() => {
    API.get('/matches').then(({ data }) => setMatches(data.matches)).catch(() => setMatches([])).finally(() => setLoading(false));
  }, []);

  const handleAccept = (id) => {
    setAccepted(p => new Set([...p, id]));
    const match = matches.find(m => m.user._id === id);
    if (match && window._skillswapNotify) {
      window._skillswapNotify.match(match.user.name);
    }
  };
  const handleReject = (id) => setRejected(p => new Set([...p, id]));
  const openReport   = (u)  => { setTargetUser(u); setReportReason(''); setReportDesc(''); setSafetyMsg(''); setShowReportModal(true); };
  const openBlock    = (u)  => { setTargetUser(u); setSafetyMsg(''); setShowBlockModal(true); };

  const handleReport = async () => {
    if (!reportReason) { setSafetyMsg('Please select a reason.'); return; }
    setSafetyLoading(true);
    try { await API.post('/report', { reportedUserId: targetUser._id, reason: reportReason, description: reportDesc }); setShowReportModal(false); setSafetyMsg(`✅ Report submitted for ${targetUser.name}.`); }
    catch (err) { setSafetyMsg(err.response?.data?.message || 'Failed.'); }
    finally { setSafetyLoading(false); }
  };

  const handleBlock = async () => {
    setSafetyLoading(true);
    try { await API.post('/block', { blockedUserId: targetUser._id }); setBlocked(p => new Set([...p, targetUser._id])); setRejected(p => new Set([...p, targetUser._id])); setShowBlockModal(false); setSafetyMsg(`🚫 ${targetUser.name} blocked.`); }
    catch (err) { setSafetyMsg(err.response?.data?.message || 'Failed.'); }
    finally { setSafetyLoading(false); }
  };

  const visible = matches.filter(m => !rejected.has(m.user._id) && !blocked.has(m.user._id));

  const card  = { background: dark ? 'rgba(26,29,39,0.82)' : 'rgba(255,255,255,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1.5px solid var(--border)', borderRadius: '16px' };
  const modal = { background: dark ? 'var(--bg2)' : '#fff', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }} className="animate-in">

      {/* ── Header ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', color: 'var(--text)' }}>Find Your Match 🔍</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.88rem', marginTop: '4px' }}>People who match your skill interests</p>
        </div>
        <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem' }}>
          {visible.length} matches
        </div>
      </div>

      {/* ── Safety Banner ──────────────────────────── */}
      {safetyMsg && !showReportModal && !showBlockModal && (
        <div style={{ background: dark ? '#0d2e1e' : '#f0fdf4', color: '#10b981', padding: '10px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
          {safetyMsg}
          <span style={{ marginLeft: '8px', cursor: 'pointer', opacity: 0.7 }} onClick={() => setSafetyMsg('')}>×</span>
        </div>
      )}

      {/* ── Cards ──────────────────────────────────── */}
      {loading ? (
        <div style={{ ...card, padding: '4rem', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>Finding your matches...
        </div>
      ) : visible.length === 0 ? (
        <div style={{ ...card, padding: '4rem', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🤝</div>
          <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>No matches found</div>
          <div style={{ fontSize: '0.88rem', marginBottom: '1.5rem' }}>Add more skills to your profile!</div>
          <button className="btn-primary" style={{ maxWidth: '200px', margin: '0 auto' }} onClick={() => navigate('/profile')}>Update Profile</button>
        </div>
      ) : (
        visible.map((match, i) => {
          const id = match.user._id;
          const isAccepted = accepted.has(id);
          return (
            <div key={id} style={{
              ...card,
              padding: '1.5rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              ...(isAccepted ? { borderColor: '#10b981', background: dark ? '#0d2e1e' : '#f0fdf4' } : {}),
            }}
              className={isAccepted ? '' : 'card-hover'}
            >
              {/* Avatar */}
              <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                {initials(match.user.name)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)', marginBottom: '2px' }}>{match.user.name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text3)', marginBottom: '8px' }}>{match.user.bio || 'No bio yet'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {match.youCanLearnFrom.map(sk => <span key={sk} className="skill-tag tag-offer">🎯 {sk}</span>)}
                  {match.youCanTeach.map(sk => <span key={sk} className="skill-tag tag-want">🌱 {sk}</span>)}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0, minWidth: '110px' }}>
                {isAccepted ? (
                  <>
                    <div style={{ padding: '8px 16px', background: '#10b981', color: '#fff', borderRadius: '8px', fontWeight: '600', fontSize: '0.82rem', textAlign: 'center' }}>✓ Connected!</div>
                    <button className="btn-press" style={{ padding: '9px', background: 'var(--accent-light)', color: 'var(--accent)', border: 'none', borderRadius: '8px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' }}
                      onClick={() => navigate(`/chat/${id}`)}>💬 Message</button>
                  </>
                ) : (
                  <>
                    <button className="btn-press" style={{ padding: '9px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
                      onClick={() => handleAccept(id)}>✓ Accept</button>
                    <button className="btn-press" style={{ padding: '9px', background: dark ? 'var(--bg3)' : '#f4f5f7', color: 'var(--text3)', border: `1.5px solid var(--border2)`, borderRadius: '8px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
                      onClick={() => handleReject(id)}>✕ Skip</button>
                  </>
                )}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button style={{ flex: 1, padding: '5px 6px', background: 'transparent', color: 'var(--text4)', border: `1px solid var(--border)`, borderRadius: '6px', fontFamily: "'DM Sans',sans-serif", fontWeight: '500', fontSize: '0.72rem', cursor: 'pointer' }}
                    onClick={() => openReport(match.user)}>🚩</button>
                  <button style={{ flex: 1, padding: '5px 6px', background: 'transparent', color: '#e74c3c', border: `1px solid var(--border)`, borderRadius: '6px', fontFamily: "'DM Sans',sans-serif", fontWeight: '500', fontSize: '0.72rem', cursor: 'pointer' }}
                    onClick={() => openBlock(match.user)}>🚫</button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* ── Report Modal ─────────────────────────────── */}
      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} className="overlay-fade" onClick={() => setShowReportModal(false)}>
          <div style={modal} className="modal-in" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', color: 'var(--text)', marginBottom: '6px' }}>🚩 Report {targetUser?.name}</h3>
            <p style={{ color: 'var(--text3)', fontSize: '0.88rem', marginBottom: '1.2rem' }}>Select a reason:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
              {REPORT_REASONS.map(r => (
                <label key={r.value} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', border: `1.5px solid ${reportReason === r.value ? '#4361ee' : 'var(--border2)'}`, borderRadius: '10px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '500', color: reportReason === r.value ? '#4361ee' : 'var(--text)', background: reportReason === r.value ? 'var(--accent-light)' : 'transparent', transition: 'all 0.15s' }}>
                  <input type="radio" name="reason" value={r.value} checked={reportReason === r.value} onChange={e => setReportReason(e.target.value)} style={{ marginRight: '8px' }} />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea style={{ width: '100%', padding: '12px', border: '1.5px solid var(--border2)', borderRadius: '10px', fontFamily: "'DM Sans',sans-serif", fontSize: '0.88rem', resize: 'vertical', minHeight: '80px', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', marginBottom: '1rem' }}
              placeholder="Additional details (optional)..." value={reportDesc} onChange={e => setReportDesc(e.target.value)} />
            {safetyMsg && <div style={{ color: 'var(--error-color)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{safetyMsg}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, padding: '11px', background: 'var(--bg3)', color: 'var(--text2)', border: 'none', borderRadius: '10px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', cursor: 'pointer' }} onClick={() => setShowReportModal(false)}>Cancel</button>
              <button style={{ flex: 1, padding: '11px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', cursor: 'pointer' }} onClick={handleReport} disabled={safetyLoading || !reportReason}>{safetyLoading ? 'Submitting...' : 'Submit Report'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Block Modal ───────────────────────────────── */}
      {showBlockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} className="overlay-fade" onClick={() => setShowBlockModal(false)}>
          <div style={modal} className="modal-in" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', color: 'var(--text)', marginBottom: '1rem' }}>🚫 Block {targetUser?.name}?</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem', padding: '1rem', background: dark ? '#2a1a1a' : '#fff5f5', borderRadius: '10px', fontSize: '0.88rem', color: 'var(--text2)', lineHeight: 1.6 }}>
              <li>🔇 They cannot send you messages</li>
              <li>👻 They won't appear in your matches</li>
              <li>↩️ You can unblock them from Chat</li>
            </ul>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, padding: '11px', background: 'var(--bg3)', color: 'var(--text2)', border: 'none', borderRadius: '10px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', cursor: 'pointer' }} onClick={() => setShowBlockModal(false)}>Cancel</button>
              <button style={{ flex: 1, padding: '11px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', cursor: 'pointer' }} onClick={handleBlock} disabled={safetyLoading}>{safetyLoading ? 'Blocking...' : '🚫 Block User'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;