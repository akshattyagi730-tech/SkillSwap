import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';

const Rating = () => {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [rating,   setRating]   = useState(0);
  const [hovered,  setHovered]  = useState(0);
  const [comment,  setComment]  = useState('');
  const [skill,    setSkill]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');
  const [userName, setUserName] = useState('');

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent! 🌟'];

  useEffect(() => {
    // Try to get user name from matches
    API.get('/matches').then(({ data }) => {
      const match = data.matches.find(m => m.user._id === userId);
      if (match) setUserName(match.user.name);
    }).catch(() => {});
  }, [userId]);

  const handleSubmit = async () => {
    if (!rating) { setError('Please select a rating!'); return; }
    if (!skill.trim()) { setError('Please enter the skill you reviewed.'); return; }
    setLoading(true);
    setError('');

    try {
      await API.post('/review', {
        revieweeId: userId,
        rating,
        comment,
        skill: skill.trim(),
      });
      // Bell notification for the reviewer
      if (window._skillswapNotify) {
        window._skillswapNotify.review(userName || 'User', rating);
      }
      setSuccess(true);
      setTimeout(() => navigate('/chat'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (success) {
    return (
      <div style={s.successWrap} className="animate-in">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={s.successTitle}>Review Submitted!</h2>
        <p style={{ color: '#888', marginBottom: '0.5rem' }}>Credits have been transferred.</p>
        <p style={{ color: '#aaa', fontSize: '0.85rem' }}>Redirecting to chat...</p>
      </div>
    );
  }

  return (
    <div style={s.wrap} className="animate-in">
      <button onClick={() => navigate(-1)} style={s.backBtn}>← Back</button>

      <div style={s.card}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={s.avatar}>{initials(userName)}</div>
          <h2 style={s.title}>Rate {userName || 'User'}</h2>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>Share your experience from the session</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {/* Stars */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={s.label}>Overall Rating</label>
          <div style={s.stars}>
            {[1, 2, 3, 4, 5].map(n => (
              <span
                key={n}
                style={{
                  ...s.star,
                  color: n <= (hovered || rating) ? '#f59e0b' : '#e2e8f0',
                  transform: n <= (hovered || rating) ? 'scale(1.15)' : 'scale(1)',
                }}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
              >
                ★
              </span>
            ))}
          </div>
          {(hovered || rating) > 0 && (
            <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: '600', marginTop: '4px' }}>
              {ratingLabels[hovered || rating]}
            </div>
          )}
        </div>

        {/* Skill */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={s.label}>Skill Reviewed</label>
          <input className="form-input" value={skill} onChange={e => setSkill(e.target.value)} placeholder="e.g. Guitar, Python, Spanish" required />
        </div>

        {/* Comment */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={s.label}>Your Feedback (optional)</label>
          <textarea
            className="form-input"
            style={{ resize: 'vertical', minHeight: '120px' }}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="How was the session? What did you enjoy? What could be improved?"
          />
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={loading || !rating}>
          {loading ? 'Submitting...' : 'Submit Review ⭐'}
        </button>
      </div>
    </div>
  );
};

const s = {
  wrap:        { padding: '1.5rem', maxWidth: '600px', margin: '0 auto' },
  backBtn:     { background: 'none', border: 'none', color: '#4361ee', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'block' },
  card:        { background: '#fff', borderRadius: '16px', padding: '2rem', border: '1.5px solid #f0f0f0' },
  avatar:      { width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg,#f093fb,#f5576c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700', color: '#fff', margin: '0 auto 1rem' },
  title:       { fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#1a1a2e', marginBottom: '4px' },
  label:       { display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#555', marginBottom: '8px' },
  stars:       { display: 'flex', gap: '8px', marginBottom: '4px' },
  star:        { fontSize: '2.5rem', cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none' },
  successWrap: { padding: '4rem 2rem', textAlign: 'center', maxWidth: '400px', margin: '0 auto' },
  successTitle:{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#1a1a2e', marginBottom: '0.5rem' },
};

export default Rating;