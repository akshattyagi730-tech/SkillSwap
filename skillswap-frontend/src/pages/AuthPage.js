import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const AuthPage = ({ signup: isSignupProp = false }) => {
  const [isSignup, setIsSignup] = useState(isSignupProp);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', bio: '',
    skillsOffered: '', skillsWanted: '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isSignup ? '/signup' : '/login';
      const payload  = isSignup
        ? {
            name: form.name,
            email: form.email,
            password: form.password,
            bio: form.bio,
            skillsOffered: form.skillsOffered.split(',').map(s => s.trim()).filter(Boolean),
            skillsWanted:  form.skillsWanted.split(',').map(s => s.trim()).filter(Boolean),
          }
        : { email: form.email, password: form.password };

      const { data } = await API.post(endpoint, payload);
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Left panel */}
      <div style={s.left}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
        <h1 style={s.heroTitle}>Learn by Teaching.</h1>
        <p style={s.heroSub}>
          Exchange skills with people around you.<br />
          Teach what you know, learn what you don't.
        </p>
        <div style={s.features}>
          {['🎯 Smart Skill Matching', '💬 Real-time Messaging', '⭐ Peer Reviews & Ratings', '🪙 Credit-based Sessions']
            .map(f => <div key={f} style={s.feat}>{f}</div>)}
        </div>
      </div>

      {/* Right panel */}
      <div style={s.right}>
        <div style={s.card} className="animate-in">
          {/* Tab switcher */}
          <div style={s.tabs}>
            <button style={{ ...s.tabBtn, ...(isSignup ? {} : s.activeTab) }} onClick={() => { setIsSignup(false); setError(''); }}>Login</button>
            <button style={{ ...s.tabBtn, ...(isSignup ? s.activeTab : {}) }}  onClick={() => { setIsSignup(true);  setError(''); }}>Sign Up</button>
          </div>

          <h2 style={s.cardTitle}>{isSignup ? 'Create your account 🚀' : 'Welcome back! 👋'}</h2>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            {isSignup && <Field label="Full Name" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required />}
            <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@example.com" required />
            <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" required />

            {isSignup && (
              <>
                <Field label="Bio (optional)" name="bio" value={form.bio} onChange={handleChange} placeholder="Tell others about yourself..." />
                <Field label="Skills I Can Teach" name="skillsOffered" value={form.skillsOffered} onChange={handleChange} placeholder="Python, Guitar, Design" />
                <Field label="Skills I Want to Learn" name="skillsWanted" value={form.skillsWanted} onChange={handleChange} placeholder="Spanish, Chess, Cooking" />
                <p style={{ fontSize: '0.78rem', color: '#aaa', marginBottom: '1rem' }}>💡 Separate skills with commas</p>
              </>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Please wait...' : isSignup ? 'Create Account 🚀' : 'Login ⚡'}
            </button>
          </form>

          {!isSignup && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link to="/forgot-password" style={{ color: '#4361ee', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
                🔑 Forgot Password?
              </Link>
            </div>
          )}
          <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.8rem', color: '#bbb' }}>
            By continuing, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, name, type = 'text', value, onChange, placeholder, required }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#555', marginBottom: '6px' }}>{label}</label>
    <input className="form-input" type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} />
  </div>
);

const s = {
  page:      { display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' },
  left:      { background: 'linear-gradient(135deg, #4361ee, #7c3aed)', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' },
  heroTitle: { fontFamily: "'Playfair Display', serif", fontSize: '2.6rem', marginBottom: '0.75rem', lineHeight: 1.15 },
  heroSub:   { fontSize: '1rem', opacity: 0.85, lineHeight: 1.6, marginBottom: '2rem' },
  features:  { display: 'flex', flexDirection: 'column', gap: '12px' },
  feat:      { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.9rem' },
  right:     { padding: '3rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' },
  card:      { width: '100%', maxWidth: '400px' },
  tabs:      { display: 'flex', background: '#f4f5f7', borderRadius: '10px', padding: '4px', marginBottom: '2rem' },
  tabBtn:    { flex: 1, padding: '10px', border: 'none', background: 'transparent', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', color: '#888', transition: 'all 0.2s' },
  activeTab: { background: '#fff', color: '#4361ee', boxShadow: '0 2px 8px rgba(67,97,238,0.12)' },
  cardTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#1a1a2e', marginBottom: '1.5rem' },
};

export default AuthPage;
