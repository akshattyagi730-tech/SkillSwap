import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

const avatarColors = [
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
];

const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const Dashboard = () => {
  const { user }     = useAuth();
  const { dark }     = useTheme();
  const navigate     = useNavigate();
  const [matches,  setMatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    API.get('/matches')
      .then(({ data }) => setMatches(data.matches.slice(0, 3)))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const card  = { background: dark ? 'rgba(26,29,39,0.82)' : 'rgba(255,255,255,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1.5px solid var(--border)`, borderRadius: '16px' };
  const text  = { color: 'var(--text)' };
  const muted = { color: 'var(--text3)' };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '920px', margin: '0 auto' }} className="animate-in">

      {/* ── Welcome Card ─────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#4361ee,#7c3aed)',
        borderRadius: '20px', padding: '2rem 2.5rem',
        color: '#fff', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 8px 32px rgba(67,97,238,0.35)',
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1.5px', opacity: 0.75, marginBottom: '6px', textTransform: 'uppercase' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', marginBottom: '6px' }}>
            {greeting}, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p style={{ opacity: 0.85, fontSize: '0.9rem', marginBottom: '1rem' }}>
            {matches.length > 0
              ? `You have ${matches.length} skill match${matches.length > 1 ? 'es' : ''} waiting!`
              : 'Add skills to your profile to find matches!'}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', padding: '5px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
              🪙 {user?.credits ?? 0} Credits
            </span>
            <span style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', padding: '5px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
              ⚡ Active
            </span>
            {user?.isEmailVerified && (
              <span style={{ background: 'rgba(16,185,129,0.3)', backdropFilter: 'blur(8px)', padding: '5px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
                ✅ Verified
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>🚀</div>
      </div>

      {/* ── Stats Row ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { num: user?.skillsOffered?.length ?? 0, label: 'Skills Offered', icon: '🎯', color: '#4361ee' },
          { num: user?.skillsWanted?.length  ?? 0, label: 'Skills Wanted',  icon: '🌱', color: '#7c3aed' },
          { num: user?.credits ?? 0,               label: 'Credits',        icon: '🪙', color: '#f59e0b' },
        ].map(({ num, label, icon, color }) => (
          <div key={label} style={{ ...card, padding: '1.4rem', textAlign: 'center', transition: 'transform 0.2s', cursor: 'default' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{icon}</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', color, fontVariantNumeric: 'tabular-nums' }}>{num}</div>
            <div style={{ fontSize: '0.78rem', ...muted, fontWeight: '500', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Your Skills ───────────────────────────────── */}
      {(user?.skillsOffered?.length > 0 || user?.skillsWanted?.length > 0) && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '1.5px', ...muted, textTransform: 'uppercase', marginBottom: '10px' }}>Your Skills</div>
          <div style={{ ...card, padding: '1.3rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {user?.skillsOffered?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#4361ee', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>I Can Teach</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {user.skillsOffered.map(sk => <span key={sk} className="skill-tag tag-offer">{sk}</span>)}
                </div>
              </div>
            )}
            {user?.skillsWanted?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9333ea', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>I Want to Learn</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {user.skillsWanted.map(sk => <span key={sk} className="skill-tag tag-want">{sk}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Suggested Matches ─────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '1.5px', ...muted, textTransform: 'uppercase' }}>🔥 Suggested Matches</div>
          <button onClick={() => navigate('/matches')}
            style={{ background: 'none', border: 'none', color: '#4361ee', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            See All →
          </button>
        </div>

        {loading ? (
          <div style={{ ...card, padding: '3rem', textAlign: 'center', ...muted }}>Loading matches...</div>
        ) : matches.length === 0 ? (
          <div style={{ ...card, padding: '3rem', textAlign: 'center', ...muted }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🤝</div>
            <div style={{ fontWeight: '600', marginBottom: '4px', ...text }}>No matches yet</div>
            <div style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Update your profile with skills to start matching!</div>
            <button onClick={() => navigate('/profile')} className="btn-primary" style={{ maxWidth: '200px', margin: '0 auto' }}>
              Update Profile
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: '1rem' }}>
            {matches.map((match, i) => (
              <div key={match.user._id} style={{
                ...card, padding: '1.3rem', cursor: 'pointer',
                boxShadow: `0 2px 12px var(--shadow)`,
              }}
                className="card-hover"
                onClick={() => navigate(`/chat/${match.user._id}`)}
              >
                {/* Card top */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.1rem', color: '#fff', flexShrink: 0 }}>
                    {initials(match.user.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', ...text }}>{match.user.name}</div>
                    <div style={{ fontSize: '0.75rem', ...muted, marginTop: '1px' }}>{match.user.bio?.slice(0, 36) || 'No bio yet'}</div>
                  </div>
                </div>

                {/* Skills */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#4361ee', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '5px' }}>Offers</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {match.youCanLearnFrom.map(sk => <span key={sk} className="skill-tag tag-offer">{sk}</span>)}
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#9333ea', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '5px' }}>Wants</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {match.youCanTeach.map(sk => <span key={sk} className="skill-tag tag-want">{sk}</span>)}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ flex: 1, padding: '9px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' }}
                    className="btn-press"
                    onClick={e => { e.stopPropagation(); navigate(`/chat/${match.user._id}`); }}>
                    💬 Message
                  </button>
                  <button style={{ flex: 1, padding: '9px', background: dark ? 'var(--bg3)' : '#f4f5f7', color: 'var(--text2)', border: 'none', borderRadius: '10px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' }}
                    className="btn-press"
                    onClick={e => { e.stopPropagation(); navigate('/matches'); }}>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;