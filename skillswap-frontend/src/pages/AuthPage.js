import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const AuthPage = ({ signup: isSignupProp = false }) => {
  const [isSignup,  setIsSignup]  = useState(isSignupProp);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [step,      setStep]      = useState('form'); // 'form' | 'otp'
  const [pendingUser, setPendingUser] = useState(null);
  const [pendingToken, setPendingToken] = useState(null);
  const [otp,       setOtp]       = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg,    setOtpMsg]    = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', bio: '',
    skillsOffered: '', skillsWanted: '',
  });

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = isSignup ? '/signup' : '/login';
      const payload  = isSignup
        ? {
            name: form.name, email: form.email, password: form.password, bio: form.bio,
            skillsOffered: form.skillsOffered.split(',').map(s => s.trim()).filter(Boolean),
            skillsWanted:  form.skillsWanted.split(',').map(s => s.trim()).filter(Boolean),
          }
        : { email: form.email, password: form.password };

      const { data } = await API.post(endpoint, payload);

      if (isSignup) {
        setPendingUser(data.user);
        setPendingToken(data.token);
        if (data.otpSent === false) {
          // Email failed — skip OTP, go to dashboard directly
          login(data.user, data.token);
          navigate('/dashboard');
        } else {
          setStep('otp');
        }
      } else {
        login(data.user, data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) { setOtpMsg('Please enter the 6-digit OTP.'); return; }
    setOtpLoading(true);
    setOtpMsg('');
    try {
      await API.post('/verify-email', { email: pendingUser.email, otp });
      login({ ...pendingUser, isEmailVerified: true }, pendingToken);
      navigate('/dashboard');
    } catch (err) {
      setOtpMsg(err.response?.data?.message || 'Invalid OTP. Try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtpMsg('');
    try {
      await API.post('/send-otp', { email: pendingUser.email });
      setOtpMsg('✅ New OTP sent to your email!');
    } catch (_) {
      setOtpMsg('Failed to resend OTP. Try again.');
    }
  };

  // ── OTP Step ─────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div style={s.page}>
        <div style={s.left}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>⚡</div>
          <h1 style={s.heroTitle}>Verify Your Email</h1>
          <p style={s.heroSub}>We sent a 6-digit code to your email.<br/>Enter it below to activate your account.</p>
        </div>
        <div style={s.right}>
          <div style={s.card}>
            <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
              <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>📧</div>
              <h2 style={s.cardTitle}>Check your email</h2>
              <p style={{ color:'#888', fontSize:'0.88rem', margin:'0' }}>
                OTP sent to <strong>{pendingUser?.email}</strong>
              </p>
            </div>

            {otpMsg && (
              <div style={{ padding:'10px 14px', borderRadius:'10px', marginBottom:'1rem', fontSize:'0.85rem', fontWeight:'500', background: otpMsg.startsWith('✅') ? '#f0fdf4' : '#fff5f5', color: otpMsg.startsWith('✅') ? '#10b981' : '#e74c3c' }}>
                {otpMsg}
              </div>
            )}

            {/* OTP input boxes */}
            <div style={{ display:'flex', gap:'10px', justifyContent:'center', marginBottom:'1.5rem' }}>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
                placeholder="Enter 6-digit OTP"
                style={{ width:'100%', padding:'14px', textAlign:'center', fontSize:'1.5rem', letterSpacing:'12px', border:'2px solid #e0e0e0', borderRadius:'12px', outline:'none', fontFamily:"'DM Sans',sans-serif", fontWeight:'700' }}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
              />
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={otpLoading || otp.length < 6}
              style={{ width:'100%', padding:'14px', background: otp.length === 6 ? '#4361ee' : '#ccc', color:'#fff', border:'none', borderRadius:'12px', fontSize:'1rem', fontWeight:'700', cursor: otp.length === 6 ? 'pointer' : 'default', marginBottom:'1rem', fontFamily:"'DM Sans',sans-serif" }}>
              {otpLoading ? 'Verifying...' : '✅ Verify Email'}
            </button>

            <div style={{ textAlign:'center', fontSize:'0.85rem', color:'#888' }}>
              Didn't receive it?{' '}
              <button onClick={handleResendOTP} style={{ background:'none', border:'none', color:'#4361ee', cursor:'pointer', fontWeight:'600', fontFamily:"'DM Sans',sans-serif" }}>
                Resend OTP
              </button>
            </div>

            <div style={{ textAlign:'center', marginTop:'1rem', fontSize:'0.82rem', color:'#aaa' }}>
              Wrong email?{' '}
              <button onClick={() => { setStep('form'); setOtp(''); setOtpMsg(''); }} style={{ background:'none', border:'none', color:'#4361ee', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Go back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Auth Form Step ────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>⚡</div>
        <h1 style={s.heroTitle}>Learn by Teaching.</h1>
        <p style={s.heroSub}>Exchange skills with people around you.<br/>Teach what you know, learn what you don't.</p>
        <div style={s.features}>
          {['🎯 Smart Skill Matching','💬 Real-time Messaging','⭐ Peer Reviews & Ratings','🪙 Credit-based Sessions']
            .map(f => <div key={f} style={s.feat}>{f}</div>)}
        </div>
      </div>

      <div style={s.right}>
        <div style={s.card} className="animate-in">
          <div style={s.tabs}>
            <button style={{ ...s.tabBtn, ...(isSignup ? {} : s.activeTab) }} onClick={() => { setIsSignup(false); setError(''); }}>Login</button>
            <button style={{ ...s.tabBtn, ...(isSignup ? s.activeTab : {}) }}  onClick={() => { setIsSignup(true);  setError(''); }}>Sign Up</button>
          </div>

          <h2 style={s.cardTitle}>{isSignup ? 'Create your account 🚀' : 'Welcome back! 👋'}</h2>
          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            {isSignup && <Field label="Full Name"  name="name"     value={form.name}     onChange={handleChange} placeholder="John Doe"           required />}
            <Field label="Email Address"           name="email"    type="email" value={form.email}    onChange={handleChange} placeholder="john@example.com"   required />
            <Field label="Password"                name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters"  required />
            {isSignup && <>
              <Field label="Bio (optional)"        name="bio"      value={form.bio}      onChange={handleChange} placeholder="Tell us about yourself" />
              <Field label="Skills You Offer"      name="skillsOffered" value={form.skillsOffered} onChange={handleChange} placeholder="e.g. Python, Guitar, Design" />
              <Field label="Skills You Want"       name="skillsWanted"  value={form.skillsWanted}  onChange={handleChange} placeholder="e.g. Spanish, Cooking" />
            </>}

            <button type="submit" disabled={loading} style={s.btn}>
              {loading ? 'Please wait...' : (isSignup ? 'Create Account →' : 'Login ⚡')}
            </button>
          </form>

          {!isSignup && (
            <div style={{ textAlign:'center', marginTop:'1rem' }}>
              <a href="/forgot-password" style={{ color:'#4361ee', fontSize:'0.85rem', textDecoration:'none', fontWeight:'600' }}>
                🔑 Forgot Password?
              </a>
            </div>
          )}

          <p style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.8rem', color:'#aaa' }}>
            By continuing, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, name, type='text', value, onChange, placeholder, required }) => (
  <div style={{ marginBottom:'1rem' }}>
    <label style={{ display:'block', marginBottom:'6px', fontWeight:'600', fontSize:'0.85rem', color:'#555' }}>{label}</label>
    <input
      type={type} name={name} value={value} onChange={onChange}
      placeholder={placeholder} required={required}
      style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #e0e0e0', borderRadius:'10px', fontSize:'0.92rem', outline:'none', fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box' }}
    />
  </div>
);

const s = {
  page:      { display:'flex', minHeight:'100vh', fontFamily:"'DM Sans',sans-serif" },
  left:      { flex:1, background:'linear-gradient(135deg,#4361ee,#7209b7)', color:'#fff', display:'flex', flexDirection:'column', justifyContent:'center', padding:'3rem', minHeight:'100vh' },
  right:     { flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', background:'#f7f8fc' },
  card:      { background:'#fff', borderRadius:'20px', padding:'2.5rem', width:'100%', maxWidth:'460px', boxShadow:'0 8px 40px rgba(0,0,0,0.1)' },
  heroTitle: { fontSize:'2.5rem', fontWeight:'800', marginBottom:'1rem', lineHeight:1.2 },
  heroSub:   { fontSize:'1.05rem', opacity:0.85, lineHeight:1.7, marginBottom:'2rem' },
  features:  { display:'flex', flexDirection:'column', gap:'12px' },
  feat:      { background:'rgba(255,255,255,0.15)', borderRadius:'12px', padding:'12px 16px', fontSize:'0.95rem', backdropFilter:'blur(8px)' },
  tabs:      { display:'flex', background:'#f0f2f5', borderRadius:'12px', padding:'4px', marginBottom:'1.5rem' },
  tabBtn:    { flex:1, padding:'10px', border:'none', borderRadius:'10px', background:'transparent', cursor:'pointer', fontWeight:'600', fontSize:'0.9rem', color:'#888', fontFamily:"'DM Sans',sans-serif" },
  activeTab: { background:'#fff', color:'#4361ee', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' },
  cardTitle: { fontSize:'1.4rem', fontWeight:'800', marginBottom:'1.5rem', color:'#1a1a2e', textAlign:'center' },
  btn:       { width:'100%', padding:'14px', background:'linear-gradient(135deg,#4361ee,#7209b7)', color:'#fff', border:'none', borderRadius:'12px', fontSize:'1rem', fontWeight:'700', cursor:'pointer', marginTop:'0.5rem', fontFamily:"'DM Sans',sans-serif" },
};

export default AuthPage;