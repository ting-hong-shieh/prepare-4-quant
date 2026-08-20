'use client';

// 3c 作答 · 深色專注模式. One problem at a time, a timer that keeps running,
// hints revealed one at a time (each one costs you on the review schedule),
// and a maths keypad so the phone keyboard never covers the question.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Rich from './Rich';
import TutorSheet from './TutorSheet';
import DerivationPad from './DerivationPad';
import { isCorrect } from '@/lib/answer';
import { t, type Lang, type LocalisedProblem } from '@/lib/i18n';

const KEYS = ['7', '8', '9', '(', '⌫', '4', '5', '6', ')', '√', '1', '2', '3', '/', '^', '0', '.', 'π', '*', '-'];

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

type Phase = 'answering' | 'feedback';

export default function DrillClient({
  sessionId, items, lang,
}: {
  sessionId: number;
  items: { attemptId: number; ordinal: number; problem: LocalisedProblem }[];
  lang: Lang;
}) {
  const router = useRouter();
  const s = t(lang);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | 'revealed' | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [tutorOpen, setTutorOpen] = useState(false);
  const startedAt = useRef(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  const item = items[idx];
  // Already reduced to one language on the server.
  const text = item?.problem ?? null;
  const problem = text;

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [idx]);

  const press = useCallback((k: string) => {
    if (phase !== 'answering') return;
    if (k === '⌫') setAnswer(a => a.slice(0, -1));
    else if (k === '√') setAnswer(a => a + 'sqrt(');
    else setAnswer(a => a + k);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable)) return;
      if (tutorOpen) return;
      if (phase !== 'answering') { if (e.key === 'Enter') next(); return; }
      if (e.key === 'Enter') { submit(); return; }
      if (e.key === 'Backspace') { setAnswer(a => a.slice(0, -1)); return; }
      if (e.key.length === 1 && /[0-9a-zA-Z+\-*/^().]/.test(e.key)) setAnswer(a => a + e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, tutorOpen, answer, idx]);

  async function record(outcome: 'correct' | 'wrong' | 'revealed' | 'skipped') {
    await fetch('/api/attempt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        attemptId: item.attemptId,
        answer,
        outcome,
        seconds: Math.floor((Date.now() - startedAt.current) / 1000),
        hintsUsed,
      }),
    });
  }

  async function submit() {
    if (phase !== 'answering' || !answer.trim()) return;
    const ok = isCorrect(answer, problem.answer);
    setVerdict(ok ? 'correct' : 'wrong');
    setPhase('feedback');
    await record(ok ? 'correct' : 'wrong');
  }

  async function reveal() {
    if (phase !== 'answering') return;
    setVerdict('revealed');
    setPhase('feedback');
    await record('revealed');
  }

  async function next() {
    if (idx + 1 >= items.length) {
      await fetch('/api/session/end', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      router.push(`/result/${sessionId}`);
      return;
    }
    setIdx(i => i + 1);
    setAnswer('');
    setHintsUsed(0);
    setPhase('answering');
    setVerdict(null);
    setTutorOpen(false);
    startedAt.current = Date.now();
    setElapsed(0);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  if (!problem || !text) return null;
  const difficultyLabel = s.difficulty[problem.difficulty] ?? problem.difficulty;

  return (
    <div
      className="shell"
      style={{
        display: 'flex', flexDirection: 'column', height: '100dvh',
        background: 'var(--drill-bg)', color: 'var(--drill-fg)', overflow: 'hidden',
      }}
    >
      <div className="grain grain--drill" />

      {/* header: quit, per-problem progress bars, running clock */}
      <div style={{ position: 'relative', zIndex: 2, flex: 'none', padding: '28px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => router.push('/')}
          aria-label={s.leaveSet}
          style={{
            width: 32, height: 32, borderRadius: 99, background: 'rgba(255,255,255,.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#9A93B0',
          }}
        >
          ✕
        </button>
        <div style={{ flex: 1, display: 'flex', gap: 5 }}>
          {items.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 4, borderRadius: 99,
                background: i < idx ? 'var(--accent)' : i === idx ? 'var(--drill-fg)' : 'rgba(255,255,255,.14)',
              }}
            />
          ))}
        </div>
        <button
          onClick={() => setTutorOpen(true)}
          className="mono"
          style={{
            flex: 'none', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase',
            padding: '6px 10px', borderRadius: 99, border: '1px solid rgba(141,123,255,.45)',
            color: 'var(--accent)',
          }}
        >
          助教
        </button>
        <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--drill-bg)', background: 'var(--timer)', padding: '6px 11px', borderRadius: 99 }}>
          {clock(elapsed)}
        </div>
      </div>

      {/* the problem */}
      <div ref={scrollRef} style={{ position: 'relative', zIndex: 2, flex: 1, overflow: 'auto', padding: '8px 20px 16px' }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--drill-muted)', marginBottom: 14 }}>
          {problem.topic ?? '—'} · {difficultyLabel} · {s.problemOf(idx + 1, items.length)}
        </div>

        <Rich
          md={text.statement}
          style={{
            fontSize: 19, lineHeight: 1.62, fontWeight: 500, color: 'var(--drill-fg-strong)',
            paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,.08)',
          }}
        />

        <div style={{ marginTop: 18, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '.14em', color: 'var(--drill-muted)' }}>{s.answer}</span>
            <span style={{ fontSize: 11, color: '#6B6488' }}>{s.answerHint}</span>
          </div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 500, color: 'var(--drill-fg-strong)', wordBreak: 'break-all', minHeight: 40 }}>
            {answer}
            {phase === 'answering' && <span style={{ color: 'var(--accent)' }}>▌</span>}
          </div>
        </div>

        {text.hints.slice(0, hintsUsed).map((h, i) => (
          <div
            key={i}
            style={{
              marginTop: 12, border: '1px dashed rgba(141,123,255,.4)', borderRadius: 16,
              padding: '13px 15px', display: 'flex', gap: 11, alignItems: 'center',
            }}
          >
            <span className="mono" style={{ fontWeight: 700, fontSize: 11, color: 'var(--accent)' }}>H{i + 1}</span>
            <Rich md={h} style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--drill-hint)' }} />
          </div>
        ))}

        {phase === 'answering' && hintsUsed < text.hints.length && (
          <button
            onClick={() => setHintsUsed(n => n + 1)}
            className="mono"
            style={{
              marginTop: 12, width: '100%', padding: '11px 0', borderRadius: 16,
              border: '1px dashed rgba(141,123,255,.28)', fontSize: 11, letterSpacing: '.14em',
              textTransform: 'uppercase', color: 'var(--drill-muted)',
            }}
          >
            {s.hintN(hintsUsed + 1, text.hints.length)}
          </button>
        )}

        <DerivationPad key={`d-${item.attemptId}`} attemptId={item.attemptId} lang={lang} />

        {phase === 'feedback' && (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                display: 'flex', alignItems: 'baseline', gap: 10, padding: '12px 16px', borderRadius: 14,
                background: verdict === 'correct' ? 'rgba(51,192,140,.12)' : 'rgba(255,138,91,.12)',
                border: `1px solid ${verdict === 'correct' ? 'rgba(51,192,140,.4)' : 'rgba(255,138,91,.4)'}`,
              }}
            >
              <span className="mono" style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: verdict === 'correct' ? 'var(--green)' : 'var(--orange)' }}>
                {verdict === 'correct' ? s.correct : verdict === 'revealed' ? s.revealed : s.wrong}
              </span>
              <span className="mono" style={{ fontSize: 15, color: 'var(--drill-fg-strong)' }}>{problem.answer}</span>
            </div>

            {text.solution && (
              <Rich
                md={text.solution}
                style={{ marginTop: 16, fontSize: 15, lineHeight: 1.72, color: 'var(--drill-hint)' }}
              />
            )}
          </div>
        )}
      </div>

      {/* keypad + actions */}
      <div style={{ position: 'relative', zIndex: 2, flex: 'none', background: 'rgba(255,255,255,.03)', borderTop: '1px solid rgba(255,255,255,.08)', padding: '12px 12px 24px' }}>
        {phase === 'answering' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 7, marginBottom: 11 }}>
            {KEYS.map(k => (
              <button
                key={k}
                onClick={() => press(k)}
                className="mono"
                style={{
                  height: 44, borderRadius: 11, background: 'rgba(255,255,255,.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, color: 'var(--drill-fg)',
                }}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 9 }}>
          {phase === 'answering' ? (
            <>
              <button
                onClick={reveal}
                style={{
                  flex: 'none', padding: '0 18px', height: 50, borderRadius: 14,
                  border: '1px solid rgba(255,255,255,.16)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--drill-hint)',
                }}
              >
                {s.reveal}
              </button>
              <button
                onClick={submit}
                disabled={!answer.trim()}
                style={{
                  flex: 1, height: 50, borderRadius: 14, background: 'var(--accent)', color: '#120E24',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15.5, fontWeight: 700, opacity: answer.trim() ? 1 : 0.4,
                }}
              >
                {s.submit}
              </button>
            </>
          ) : (
            <button
              onClick={next}
              style={{
                flex: 1, height: 50, borderRadius: 14, background: 'var(--accent)', color: '#120E24',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15.5, fontWeight: 700,
              }}
            >
              {idx + 1 >= items.length ? s.seeScore : s.next}
            </button>
          )}
        </div>
      </div>

      <TutorSheet
        key={`t-${item.attemptId}`}
        attemptId={item.attemptId}
        phase={phase === 'feedback' ? 'reviewing' : 'thinking'}
        lang={lang}
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
      />
    </div>
  );
}
