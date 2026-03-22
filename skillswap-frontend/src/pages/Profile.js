import React, { useState } from 'react';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';
import SkillTestModal from '../components/SkillTestModal';

const getStrength = (pass) => {
  let score = 0;
  if (pass.length >= 6)  score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return score;
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { dark } = useTheme();

  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' });
  const [skillsOffered, setSkillsOffered] = useState(user?.skillsOffered || []);
  const [skillsWanted,  setSkillsWanted]  = useState(user?.skillsWanted  || []);
  const [offerInput, setOfferInput] = useState('');
  const [wantInput,  setWantInput]  = useState('');
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  // Skill Test state
  const [testSkill,    setTestSkill]    = useState(null);
  const [verifiedSkills, setVerifiedSkills] = useState(user?.verifiedSkills || {});

  const [otpSent,    setOtpSent]    = useState(false);
  const [otp,        setOtp]        = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg,     setOtpMsg]     = useState('');

  const [phone,        setPhone]        = useState(user?.phone || '');
  const [phoneSent,    setPhoneSent]    = useState(false);
  const [phoneOtp,     setPhoneOtp]     = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneMsg,     setPhoneMsg]     = useState('');

  const [passForm,    setPassForm]    = useState({ oldPassword: '', newPassword: '', confirmPass: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg,     setPassMsg]     = useState('');
  const [passError,   setPassError]   = useState(false);
  const [showPass,    setShowPass]    = useState(false);

  // When skill is added → trigger test
  const addSkill = (type, value) => {
    const skill = value.trim();
    if (!skill) return;
    if (type === 'offer' && !skillsOffered.includes(skill)) {
      setSkillsOffered(p => [...p, skill]);
      setOfferInput('');
      setTestSkill(skill); // 🚀 trigger test for offered skills
    }
    if (type === 'want' && !skillsWanted.includes(skill)) {
      setSkillsWanted(p => [...p, skill]);
      setWantInput('');
    }
  };
  const removeSkill = (type, skill) => {
    if (type === 'offer') setSkillsOffered(p => p.filter(s => s !== skill));
    if (type === 'want')  setSkillsWanted(p  => p.filter(s => s !== skill));
  };

  const handleSave = async () => {
    setLoading(true); setError(''); setSaved(false);
    try {
      const { data } = await API.put('/profile/update', { name: form.name, bio: form.bio, skillsOffered, skillsWanted });
      updateUser(data.user);
      setSkillsOffered(data.user.skillsOffered || []);
      setSkillsWanted(data.user.skillsWanted   || []);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { setError(err.response?.data?.message || 'Failed to save.'); }
    finally { setLoading(false); }
  };

  const sendEmailOTP = async () => {
    setOtpLoading(true); setOtpMsg('');
    try { await API.post('/auth/send-otp'); setOtpSent(true); setOtpMsg('OTP sent to your inbox!'); }
    catch (err) { setOtpMsg(err.response?.data?.message || 'Failed.'); }
    finally { setOtpLoading(false); }
  };
  const verifyEmailOTP = async () => {
    setOtpLoading(true); setOtpMsg('');
    try { const { data } = await API.post('/auth/verify-email', { otp }); updateUser(data.user); setOtpMsg('✅ Email verified!'); setOtpSent(false); setOtp(''); }
    catch (err) { setOtpMsg(err.response?.data?.message || 'Invalid OTP.'); }
    finally { setOtpLoading(false); }
  };
  const sendPhoneOTP = async () => {
    setPhoneLoading(true); setPhoneMsg('');
    try { await API.post('/auth/send-phone-otp', { phone }); setPhoneSent(true); setPhoneMsg('OTP sent!'); }
    catch (err) { setPhoneMsg(err.response?.data?.message || 'Failed.'); }
    finally { setPhoneLoading(false); }
  };
  const verifyPhoneOTP = async () => {
    setPhoneLoading(true); setPhoneMsg('');
    try { const { data } = await API.post('/auth/verify-phone', { otp: phoneOtp }); updateUser(data.user); setPhoneMsg('✅ Phone verified!'); setPhoneSent(false); setPhoneOtp(''); }
    catch (err) { setPhoneMsg(err.response?.data?.message || 'Invalid OTP.'); }
    finally { setPhoneLoading(false); }
  };
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPass) { setPassMsg('Passwords do not match!'); setPassError(true); return; }
    if (passForm.newPassword.length < 6) { setPassMsg('Min 6 characters required.'); setPassError(true); return; }
    setPassLoading(true); setPassMsg(''); setPassError(false);
    try { await API.post('/change-password', { oldPassword: passForm.oldPassword, newPassword: passForm.newPassword }); setPassMsg('✅ Password changed!'); setPassForm({ oldPassword: '', newPassword: '', confirmPass: '' }); }
    catch (err) { setPassMsg(err.response?.data?.message || 'Failed.'); setPassError(true); }
    finally { setPassLoading(false); }
  };

  const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const checks = [
    { label: 'Email verified',  done: user?.isEmailVerified },
    { label: 'Name set',        done: user?.name?.trim().length > 0 },
    { label: 'Bio (10+ chars)', done: user?.bio?.trim().length >= 10 },
    { label: 'Skills offered',  done: skillsOffered.length >= 1 },
    { label: 'Skills wanted',   done: skillsWanted.length  >= 1 },
    { label: 'Phone verified',  done: user?.isPhoneVerified },
  ];
  const score = Math.round((checks.filter(c => c.done).length / checks.length) * 100);

  // ── Style helpers ──
  const card = { background: dark ? 'rgba(26,29,39,0.82)' : 'rgba(255,255,255,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.2rem' };
  const sectionHead = { fontSize: '0.72rem', fontWeight: '700', color: 'var(--accent)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1rem' };
  const label = { display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text2)', marginBottom: '6px' };
  const tagsWrap = { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px', border: '1.5px solid var(--border2)', borderRadius: '10px', minHeight: '46px', background: 'var(--bg3)' };
  const verifyBtn = { padding: '10px 20px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer', marginTop: '4px' };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '680px', margin: '0 auto' }} className="animate-in">

      {/* ── Header ────────────────────────────────── */}
      <div style={{ ...card, textAlign: 'center', background: dark ? 'var(--bg2)' : '#fff' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#4361ee,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: '700', color: '#fff', margin: '0 auto 1rem' }}>
          {initials(user?.name)}
        </div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', color: 'var(--text)', marginBottom: '4px' }}>{user?.name}</div>
        <div style={{ color: 'var(--text3)', fontSize: '0.88rem', marginBottom: '12px' }}>{user?.email}</div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#fff', padding: '5px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '0.82rem' }}>
            🪙 {user?.credits ?? 0} Credits
          </span>
          {user?.isEmailVerified && <span style={{ background: dark ? '#0d2e1e' : '#f0fdf4', color: '#10b981', padding: '5px 14px', borderRadius: '20px', fontWeight: '600', fontSize: '0.82rem', border: '1px solid #10b98140' }}>✅ Email Verified</span>}
          {user?.isPhoneVerified && <span style={{ background: dark ? '#0d2e1e' : '#f0fdf4', color: '#10b981', padding: '5px 14px', borderRadius: '20px', fontWeight: '600', fontSize: '0.82rem', border: '1px solid #10b98140' }}>📱 Phone Verified</span>}
        </div>
      </div>

      {/* ── Profile Completeness ──────────────────── */}
      <div style={card}>
        <div style={sectionHead}>📊 Profile Completeness — {score}%</div>
        <div style={{ height: '8px', background: 'var(--border2)', borderRadius: '4px', marginBottom: '1rem', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#10b981' : score >= 50 ? '#4361ee' : '#f59e0b', borderRadius: '4px', transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {checks.map(({ label: lbl, done }) => (
            <div key={lbl} style={{ fontSize: '0.8rem', color: done ? '#10b981' : 'var(--text3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{done ? '✅' : '⬜'}</span> {lbl}
            </div>
          ))}
        </div>
      </div>

      {/* ── Edit Info ─────────────────────────────── */}
      <div style={card}>
        <div style={sectionHead}>✏️ Edit Profile</div>
        {error && <div className="error-msg">{error}</div>}
        {saved && <div style={{ background: dark ? '#0d2e1e' : '#f0fdf4', color: '#10b981', border: '1px solid #10b98140', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', marginBottom: '1rem' }}>✅ Profile saved!</div>}
        <div style={{ marginBottom: '1rem' }}>
          <label style={label}>Display Name</label>
          <input className="form-input" placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div style={{ marginBottom: '0' }}>
          <label style={label}>Bio</label>
          <textarea className="form-input" rows={3} placeholder="Tell others what you're about..." style={{ resize: 'vertical', minHeight: '80px' }}
            value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
          <div style={{ fontSize: '0.72rem', color: form.bio.trim().length >= 10 ? '#10b981' : 'var(--text4)', marginTop: '4px' }}>
            {form.bio.trim().length}/500 — {form.bio.trim().length >= 10 ? '✅ Good' : `Need ${10 - form.bio.trim().length} more chars`}
          </div>
        </div>
      </div>

      {/* ── Email Verification ────────────────────── */}
      <div style={card}>
        <div style={sectionHead}>📧 Email Verification</div>
        {user?.isEmailVerified ? (
          <div style={{ background: dark ? '#0d2e1e' : '#f0fdf4', color: '#10b981', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', fontWeight: '500' }}>
            ✅ {user?.email} is verified!
          </div>
        ) : (
          <>
            <div style={{ background: dark ? '#2a1f0a' : '#fffbeb', color: dark ? '#fbbf24' : '#92400e', border: `1px solid ${dark ? '#fbbf2440' : '#fde68a'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', marginBottom: '12px' }}>
              ⚠️ Your email is not verified yet.
            </div>
            {!otpSent ? (
              <button style={verifyBtn} onClick={sendEmailOTP} disabled={otpLoading}>
                {otpLoading ? 'Sending...' : '📧 Send Verification OTP'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="form-input" placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)}
                  style={{ flex: 1, letterSpacing: '8px', fontWeight: '700', textAlign: 'center', fontSize: '1.1rem' }} maxLength={6} />
                <button style={verifyBtn} onClick={verifyEmailOTP} disabled={otpLoading || otp.length < 6}>
                  {otpLoading ? '...' : 'Verify'}
                </button>
              </div>
            )}
            {otpMsg && <div style={{ marginTop: '8px', fontSize: '0.82rem', color: otpMsg.includes('✅') ? '#10b981' : 'var(--error-color)' }}>{otpMsg}</div>}
          </>
        )}
      </div>

      {/* ── Phone Verification ────────────────────── */}
      <div style={card}>
        <div style={sectionHead}>📱 Phone Verification</div>
        {user?.isPhoneVerified ? (
          <div style={{ background: dark ? '#0d2e1e' : '#f0fdf4', color: '#10b981', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', fontWeight: '500' }}>
            ✅ {user?.phone} is verified!
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={label}>Phone Number</label>
              <input className="form-input" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            {!phoneSent ? (
              <button style={verifyBtn} onClick={sendPhoneOTP} disabled={phoneLoading || !phone.trim()}>
                {phoneLoading ? 'Sending...' : '📱 Send Phone OTP'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="form-input" placeholder="Enter OTP" value={phoneOtp} onChange={e => setPhoneOtp(e.target.value)}
                  style={{ flex: 1, letterSpacing: '6px', fontWeight: '700', textAlign: 'center' }} maxLength={6} />
                <button style={verifyBtn} onClick={verifyPhoneOTP} disabled={phoneLoading || phoneOtp.length < 6}>
                  {phoneLoading ? '...' : 'Verify'}
                </button>
              </div>
            )}
            {phoneMsg && <div style={{ marginTop: '8px', fontSize: '0.82rem', color: phoneMsg.includes('✅') ? '#10b981' : 'var(--error-color)' }}>{phoneMsg}</div>}
          </>
        )}
      </div>

      {/* ── Skills Offered ────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={sectionHead}>🎯 Skills I Can Teach</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text4)' }}>Press Enter to add</span>
        </div>
        <div style={tagsWrap}>
          {skillsOffered.map(skill => {
            const vkey = skill.toLowerCase();
            const v = verifiedSkills?.[vkey];
            const badgeEmoji = v?.badge === 'expert' ? '🏆' : v?.badge === 'proficient' ? '⭐' : v?.badge === 'beginner' ? '🌱' : null;
            return (
              <span key={skill} style={{ padding: '4px 10px', background: v ? (dark ? 'rgba(67,97,238,0.25)' : '#eef2ff') : 'var(--tag-offer-bg)', color: '#4361ee', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', border: v ? '1.5px solid #4361ee' : '1.5px solid transparent' }}>
                {badgeEmoji && <span title={`${v.badge} — ${v.score}%`}>{badgeEmoji}</span>}
                {skill}
                {!v && (
                  <span title="Take test to verify" style={{ cursor: 'pointer', fontSize: '0.7rem', background: 'rgba(67,97,238,0.15)', padding: '1px 5px', borderRadius: '8px', color: '#4361ee' }}
                    onClick={() => setTestSkill(skill)}>verify</span>
                )}
                <span style={{ cursor: 'pointer', opacity: 0.6, fontWeight: '700' }} onClick={() => removeSkill('offer', skill)}>×</span>
              </span>
            );
          })}
          {skillsOffered.length === 0 && <span style={{ color: 'var(--text4)', fontSize: '0.82rem', padding: '4px' }}>No skills added yet</span>}
        </div>
        <input className="form-input" style={{ marginTop: '8px' }} placeholder="Type a skill and press Enter to add + get verified..."
          value={offerInput} onChange={e => setOfferInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill('offer', offerInput); } }} />
      </div>

      {/* ── Skills Wanted ─────────────────────────── */}
      <div style={card}>
        <div style={sectionHead}>🌱 Skills I Want to Learn</div>
        <div style={tagsWrap}>
          {skillsWanted.map(skill => (
            <span key={skill} style={{ padding: '4px 10px', background: 'var(--tag-want-bg)', color: '#9333ea', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {skill}
              <span style={{ cursor: 'pointer', opacity: 0.6, fontWeight: '700' }} onClick={() => removeSkill('want', skill)}>×</span>
            </span>
          ))}
          {skillsWanted.length === 0 && <span style={{ color: 'var(--text4)', fontSize: '0.82rem', padding: '4px' }}>No skills added yet</span>}
        </div>
        <input className="form-input" style={{ marginTop: '8px' }} placeholder="Type a skill and press Enter..."
          value={wantInput} onChange={e => setWantInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill('want', wantInput); } }} />
      </div>

      <button className="btn-primary" style={{ maxWidth: '320px', margin: '0 auto 1.5rem', display: 'block' }}
        onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : saved ? '✅ Saved!' : 'Save Profile'}
      </button>

      {/* ── Change Password ───────────────────────── */}
      <div style={card}>
        <div style={sectionHead}>🔐 Change Password</div>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Current Password</label>
            <input className="form-input" type="password" placeholder="Your current password"
              value={passForm.oldPassword} onChange={e => setPassForm({ ...passForm, oldPassword: e.target.value })} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Min 6 characters"
                value={passForm.newPassword} onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })} required />
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            {passForm.newPassword && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '3px' }}>
                  {[1,2,3,4].map(n => (
                    <div key={n} style={{ flex: 1, height: '4px', borderRadius: '2px',
                      background: getStrength(passForm.newPassword) >= n
                        ? ['','#e74c3c','#f59e0b','#4361ee','#10b981'][getStrength(passForm.newPassword)]
                        : 'var(--border2)' }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{['','Weak','Fair','Good','Strong'][getStrength(passForm.newPassword)]}</span>
              </div>
            )}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Confirm New Password</label>
            <input className="form-input" type="password" placeholder="Repeat new password"
              value={passForm.confirmPass} onChange={e => setPassForm({ ...passForm, confirmPass: e.target.value })} required />
            {passForm.confirmPass && (
              <div style={{ fontSize: '0.75rem', marginTop: '4px', color: passForm.newPassword === passForm.confirmPass ? '#10b981' : 'var(--error-color)' }}>
                {passForm.newPassword === passForm.confirmPass ? '✅ Passwords match' : '❌ Do not match'}
              </div>
            )}
          </div>
          {passMsg && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem',
              background: passError ? 'var(--error-bg)' : (dark ? '#0d2e1e' : '#f0fdf4'),
              color: passError ? 'var(--error-color)' : '#10b981',
              border: `1px solid ${passError ? 'var(--error-border)' : '#10b98140'}` }}>
              {passMsg}
            </div>
          )}
          <button type="submit" style={verifyBtn} disabled={passLoading}>
            {passLoading ? 'Changing...' : '🔐 Change Password'}
          </button>
        </form>
      </div>

      {/* ── Skill Test Modal ──────────────────────── */}
      {testSkill && (
        <SkillTestModal
          skill={testSkill}
          onClose={() => setTestSkill(null)}
          onPassed={(skill, badge, score) => {
            setVerifiedSkills(prev => ({
              ...prev,
              [skill.toLowerCase()]: { badge, score, verifiedAt: new Date() },
            }));
          }}
        />
      )}
    </div>
  );
};

export default Profile;