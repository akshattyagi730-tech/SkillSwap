import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Step 1 = enter email, Step 2 = enter OTP + new password, Step 3 = success
  const [step,        setStep]        = useState(1);
  const [email,       setEmail]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [showPass,    setShowPass]    = useState(false);

  // Step 1 — Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await API.post('/forgot-password', { email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Verify OTP + Reset Password
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPass) {
      setError('Passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await API.post('/reset-password', { email, otp, newPassword });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
        <h1 style={s.heroTitle}>Reset Your Password</h1>
        <p style={s.heroSub}>
          Don't worry! It happens to the best of us.<br />
          We'll send you a secure OTP to reset your password.
        </p>
        <div style={s.steps}>
          {[
            { n: 1, label: 'Enter your email' },
            { n: 2, label: 'Enter OTP + new password' },
            { n: 3, label: 'Login with new password' },
          ].map(({ n, label }) => (
            <div key={n} style={s.stepItem}>
              <div style={{ ...s.stepNum, ...(step >= n ? s.stepActive : {}) }}>{n}</div>
              <span style={{ opacity: step >= n ? 1 : 0.5 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={s.right}>
        <div style={s.card} className="animate-in">

          {/* ── Step 1: Email ───────────────────── */}
          {step === 1 && (
            <>
              <h2 style={s.cardTitle}>Forgot Password? 🔑</h2>
              <p style={s.cardSub}>Enter your registered email and we'll send you an OTP.</p>
              {error && <div className="error-msg">{error}</div>}
              <form onSubmit={handleSendOTP}>
                <div style={s.formGroup}>
                  <label style={s.label}>Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Send Reset OTP 📧'}
                </button>
              </form>
              <div style={s.backLink}>
                Remember your password? <Link to="/login" style={s.link}>Login</Link>
              </div>
            </>
          )}

          {/* ── Step 2: OTP + New Password ────── */}
          {step === 2 && (
            <>
              <h2 style={s.cardTitle}>Enter OTP 🔐</h2>
              <div style={s.emailSentBox}>
                📧 OTP sent to <strong>{email}</strong>
                <br />
                <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>Check your inbox (valid 10 mins)</span>
              </div>
              {error && <div className="error-msg">{error}</div>}
              <form onSubmit={handleReset}>
                <div style={s.formGroup}>
                  <label style={s.label}>6-Digit OTP</label>
                  <input
                    className="form-input"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                    style={{ letterSpacing: '8px', fontSize: '1.2rem', fontWeight: '700', textAlign: 'center' }}
                  />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      style={s.eyeBtn}
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Confirm New Password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    required
                  />
                  {confirmPass && newPassword !== confirmPass && (
                    <div style={{ color: '#e74c3c', fontSize: '0.78rem', marginTop: '4px' }}>
                      ❌ Passwords do not match
                    </div>
                  )}
                  {confirmPass && newPassword === confirmPass && (
                    <div style={{ color: '#10b981', fontSize: '0.78rem', marginTop: '4px' }}>
                      ✅ Passwords match
                    </div>
                  )}
                </div>

                {/* Password strength indicator */}
                {newPassword && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '4px' }}>Password strength</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1,2,3,4].map(n => (
                        <div key={n} style={{
                          flex: 1, height: '4px', borderRadius: '2px',
                          background: getStrength(newPassword) >= n
                            ? ['','#e74c3c','#f59e0b','#4361ee','#10b981'][getStrength(newPassword)]
                            : '#e8eaf0'
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '3px' }}>
                      {['','Weak','Fair','Good','Strong'][getStrength(newPassword)]}
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading || otp.length < 6}>
                  {loading ? 'Resetting...' : 'Reset Password 🔐'}
                </button>
              </form>
              <div style={s.backLink}>
                Didn't receive OTP?{' '}
                <span style={s.link} onClick={() => { setStep(1); setOtp(''); setError(''); }}>
                  Resend
                </span>
              </div>
            </>
          )}

          {/* ── Step 3: Success ──────────────── */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
              <h2 style={{ ...s.cardTitle, marginBottom: '0.5rem' }}>Password Reset!</h2>
              <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                Your password has been reset successfully.<br />
                Please login with your new password.
              </p>
              <button className="btn-primary" onClick={() => navigate('/login')}>
                Go to Login ⚡
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Password strength checker
const getStrength = (pass) => {
  let score = 0;
  if (pass.length >= 6)  score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return score;
};

const s = {
  page:        { display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' },
  left:        { background: 'linear-gradient(135deg, #4361ee, #7c3aed)', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' },
  heroTitle:   { fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', marginBottom: '0.75rem', lineHeight: 1.2 },
  heroSub:     { fontSize: '1rem', opacity: 0.85, lineHeight: 1.6, marginBottom: '2.5rem' },
  steps:       { display: 'flex', flexDirection: 'column', gap: '16px' },
  stepItem:    { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' },
  stepNum:     { width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0, transition: 'all 0.3s' },
  stepActive:  { background: '#fff', color: '#4361ee' },
  right:       { padding: '3rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' },
  card:        { width: '100%', maxWidth: '400px' },
  cardTitle:   { fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#1a1a2e', marginBottom: '8px' },
  cardSub:     { color: '#888', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.5 },
  formGroup:   { marginBottom: '1rem' },
  label:       { display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#555', marginBottom: '6px' },
  emailSentBox:{ background: '#eef2ff', color: '#4361ee', border: '1.5px solid #c7d2fe', borderRadius: '10px', padding: '12px 14px', fontSize: '0.85rem', marginBottom: '1.2rem', lineHeight: 1.5 },
  eyeBtn:      { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' },
  backLink:    { textAlign: 'center', marginTop: '1.2rem', fontSize: '0.85rem', color: '#888' },
  link:        { color: '#4361ee', fontWeight: '600', cursor: 'pointer', textDecoration: 'none' },
};

export default ForgotPassword;
