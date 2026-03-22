import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

const BADGE_META = {
  expert:     { emoji: '🏆', label: 'Expert',     color: '#f59e0b' },
  proficient: { emoji: '⭐', label: 'Proficient', color: '#4361ee' },
  beginner:   { emoji: '🌱', label: 'Beginner',   color: '#10b981' },
};

const SkillTestModal = ({ skill, onClose, onPassed }) => {
  const { dark } = useTheme();

  const [phase,     setPhase]     = useState('intro');    // intro | loading | quiz | result
  const [questions, setQuestions] = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [result,    setResult]    = useState(null);
  const [err,       setErr]       = useState('');
  const [showExp,   setShowExp]   = useState(false);

  // ── Styles ──────────────────────────────────────────
  const bg     = dark ? 'rgba(22,25,38,0.98)' : 'rgba(255,255,255,0.98)';
  const border = 'var(--border)';
  const text   = 'var(--text)';
  const muted  = 'var(--text3)';
  const card   = { background: dark ? 'rgba(30,34,50,0.9)' : '#f7f8fc', border: `1.5px solid ${border}`, borderRadius: '12px', padding: '1rem' };

  // ── Generate questions ───────────────────────────────
  const startTest = async () => {
    setPhase('loading');
    setErr('');
    try {
      const { data } = await API.post('/skill-test/generate', { skill });
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(null));
      setCurrent(0);
      setSelected(null);
      setPhase('quiz');
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to generate test. Check ANTHROPIC_API_KEY in .env');
      setPhase('intro');
    }
  };

  // ── Select answer ────────────────────────────────────
  const handleSelect = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    const newAnswers = [...answers];
    newAnswers[current] = idx;
    setAnswers(newAnswers);
  };

  // ── Next question ────────────────────────────────────
  const handleNext = () => {
    setSelected(null);
    setShowExp(false);
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
    } else {
      submitTest();
    }
  };

  // ── Submit test ──────────────────────────────────────
  const submitTest = async () => {
    setPhase('loading');
    try {
      const { data } = await API.post('/skill-test/submit', {
        skill, answers, questions,
      });
      setResult(data);
      setPhase('result');
      if (data.passed) onPassed?.(skill, data.badge, data.score);
    } catch (e) {
      setErr(e.response?.data?.message || 'Submission failed.');
      setPhase('quiz');
    }
  };

  const q = questions[current];
  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="modal-in" style={{ background: bg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', border: `1.5px solid ${border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>

        {/* ── INTRO ──────────────────────────────── */}
        {phase === 'intro' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', color: text, marginBottom: '8px' }}>
              Skill Verification Test
            </h2>
            <p style={{ color: muted, fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Prove your <strong style={{ color: '#4361ee' }}>{skill}</strong> skills with an AI-generated test.
              10 questions, pass at 60% to earn a verified badge on your profile!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '1.5rem' }}>
              {[['10', 'Questions'], ['60%', 'Pass mark'], ['AI', 'Generated']].map(([val, lbl]) => (
                <div key={lbl} style={{ ...card, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#4361ee' }}>{val}</div>
                  <div style={{ fontSize: '0.72rem', color: muted, marginTop: '2px' }}>{lbl}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '1.5rem' }}>
              {Object.values(BADGE_META).map(b => (
                <div key={b.label} style={{ ...card, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem' }}>{b.emoji}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: b.color, marginTop: '2px' }}>{b.label}</div>
                </div>
              ))}
            </div>

            {err && <div className="error-msg">{err}</div>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, padding: '12px', background: 'var(--bg3)', color: muted, border: `1px solid ${border}`, borderRadius: '10px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', cursor: 'pointer' }}
                onClick={onClose}>Skip for now</button>
              <button className="btn-primary btn-press" style={{ flex: 2 }} onClick={startTest}>
                🚀 Start Test
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING ────────────────────────────── */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⚙️</div>
            <div style={{ color: text, fontWeight: '600', marginBottom: '6px' }}>AI is generating your test...</div>
            <div style={{ color: muted, fontSize: '0.85rem' }}>Crafting 10 questions for <strong>{skill}</strong></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── QUIZ ───────────────────────────────── */}
        {phase === 'quiz' && q && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4361ee', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {skill} Test
              </span>
              <span style={{ fontSize: '0.8rem', color: muted }}>
                {current + 1} / {questions.length}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '6px', background: 'var(--border2)', borderRadius: '3px', marginBottom: '1.5rem', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#4361ee,#7c3aed)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
            </div>

            {/* Question */}
            <div style={{ fontSize: '1rem', fontWeight: '600', color: text, lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {q.question}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.2rem' }}>
              {q.options.map((opt, idx) => {
                let bg2 = dark ? 'rgba(30,34,50,0.8)' : '#f7f8fc';
                let borderCol = border;
                let textCol = text;

                if (selected !== null) {
                  if (idx === q.correct) {
                    bg2 = dark ? '#0d2e1e' : '#f0fdf4';
                    borderCol = '#10b981';
                    textCol = '#10b981';
                  } else if (idx === selected && idx !== q.correct) {
                    bg2 = dark ? '#2a1a1a' : '#fff5f5';
                    borderCol = '#e74c3c';
                    textCol = '#e74c3c';
                  }
                }

                return (
                  <button key={idx}
                    onClick={() => handleSelect(idx)}
                    style={{ padding: '12px 16px', background: bg2, border: `1.5px solid ${borderCol}`, borderRadius: '12px', color: textCol, fontFamily: "'DM Sans',sans-serif", fontSize: '0.9rem', cursor: selected !== null ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: borderCol === border ? 'var(--bg3)' : borderCol, color: borderCol === border ? muted : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0, transition: 'all 0.2s' }}>
                      {['A','B','C','D'][idx]}
                    </span>
                    {opt}
                    {selected !== null && idx === q.correct && <span style={{ marginLeft: 'auto' }}>✅</span>}
                    {selected !== null && idx === selected && idx !== q.correct && <span style={{ marginLeft: 'auto' }}>❌</span>}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {selected !== null && q.explanation && (
              <div style={{ marginBottom: '1rem' }}>
                <button onClick={() => setShowExp(v => !v)}
                  style={{ background: 'none', border: 'none', color: '#4361ee', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  {showExp ? '▲ Hide' : '▼ Show'} explanation
                </button>
                {showExp && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', background: dark ? 'rgba(67,97,238,0.1)' : '#eef2ff', borderRadius: '10px', fontSize: '0.85rem', color: text, lineHeight: 1.6, border: '1px solid rgba(67,97,238,0.2)' }}>
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            )}

            {selected !== null && (
              <button className="btn-primary btn-press" onClick={handleNext}>
                {current + 1 < questions.length ? 'Next Question →' : 'Submit Test 🎯'}
              </button>
            )}

            {err && <div className="error-msg" style={{ marginTop: '10px' }}>{err}</div>}
          </div>
        )}

        {/* ── RESULT ─────────────────────────────── */}
        {phase === 'result' && result && (
          <div>
            {/* Score circle */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: result.passed ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#e74c3c,#c0392b)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: `0 8px 24px ${result.passed ? 'rgba(16,185,129,0.4)' : 'rgba(231,76,60,0.4)'}` }}>
                <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff' }}>{result.score}%</span>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', color: text, marginBottom: '6px' }}>
                {result.passed ? '🎉 Test Passed!' : '😔 Not Passed'}
              </h2>
              <p style={{ color: muted, fontSize: '0.88rem', marginBottom: '1rem' }}>
                {result.correct} / {result.total} correct answers
              </p>

              {result.badge && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', background: dark ? 'rgba(30,34,50,0.9)' : '#f7f8fc', border: `2px solid ${BADGE_META[result.badge]?.color}`, borderRadius: '20px', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{BADGE_META[result.badge]?.emoji}</span>
                  <span style={{ fontWeight: '700', color: BADGE_META[result.badge]?.color, fontSize: '0.9rem' }}>
                    {BADGE_META[result.badge]?.label} Badge Earned!
                  </span>
                </div>
              )}

              {!result.passed && (
                <p style={{ color: muted, fontSize: '0.82rem' }}>Need 60% to pass. You can retake the test anytime.</p>
              )}
            </div>

            {/* Per-question breakdown */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Question Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {result.results.map((r, i) => (
                  <div key={i} style={{ ...card, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>{r.isCorrect ? '✅' : '❌'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', color: text, fontWeight: '500', marginBottom: '2px' }}>{r.question}</div>
                      {!r.isCorrect && (
                        <div style={{ fontSize: '0.75rem', color: '#e74c3c' }}>Your answer: {r.chosen}</div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Correct: {r.correct}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {!result.passed && (
                <button style={{ flex: 1, padding: '12px', background: 'var(--bg3)', color: text, border: `1px solid ${border}`, borderRadius: '10px', fontFamily: "'DM Sans',sans-serif", fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => { setPhase('intro'); setResult(null); setAnswers([]); setCurrent(0); setSelected(null); }}>
                  🔄 Retake Test
                </button>
              )}
              <button className="btn-primary btn-press" style={{ flex: 1 }} onClick={onClose}>
                {result.passed ? '🎉 Done!' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillTestModal;