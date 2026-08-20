'use client';

// 寫推導. The answer box alone rewards guessing; this is where you write the
// argument and get told which step first goes wrong. The grade is advisory —
// 「我覺得我對」 flags it rather than accepting it, because a grader that is
// confidently wrong about your maths is worse than no grader.

import { useEffect, useState } from 'react';
import Rich from './Rich';

export interface Grade {
  id: number;
  verdict: 'sound' | 'flawed' | 'wrong';
  score: number;
  praise: string;
  first_error: string | null;
  why: string | null;
  concept: string | null;
}

const VERDICT = {
  sound: { label: '推理成立', color: 'var(--green)' },
  flawed: { label: '有洞', color: 'var(--timer)' },
  wrong: { label: '方法不對', color: 'var(--orange)' },
} as const;

export default function DerivationPad({ attemptId }: { attemptId: number }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputed, setDisputed] = useState(false);
  // Typing runs KaTeX over the whole write-up; at one render per keystroke a
  // long derivation gets noticeably heavy to type into.
  const [preview, setPreview] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setPreview(body), 220);
    return () => clearTimeout(t);
  }, [body]);

  async function submit() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/tutor/grade', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ attemptId, derivation: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '批改失敗');
      setGrade(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function dispute() {
    if (!grade) return;
    setDisputed(true);
    await fetch('/api/tutor/dispute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: grade.id }),
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mono"
        style={{
          marginTop: 12, width: '100%', padding: '12px 0', borderRadius: 16,
          border: '1px solid rgba(255,255,255,.12)', fontSize: 11, letterSpacing: '.14em',
          textTransform: 'uppercase', color: 'var(--drill-muted)',
        }}
      >
        寫推導 · 讓助教批改
      </button>
    );
  }

  return (
    <div style={{ marginTop: 12, border: '1px solid rgba(255,255,255,.1)', borderRadius: 18, padding: '14px 16px', background: 'rgba(255,255,255,.03)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10 }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '.14em', color: 'var(--drill-muted)' }}>推導</span>
        <span style={{ flex: 1 }} />
        <button onClick={() => setOpen(false)} style={{ fontSize: 13, color: 'var(--drill-muted)' }}>收起</button>
      </div>

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => e.stopPropagation()}
        rows={7}
        placeholder={'把完整過程寫下來，數學用 LaTeX：\n\n設 $x, y \\sim U(0,1)$ 獨立…'}
        style={{
          width: '100%', resize: 'vertical', background: 'rgba(0,0,0,.28)',
          border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '11px 12px',
          color: 'var(--drill-fg-strong)', fontSize: 14, lineHeight: 1.65, fontFamily: 'inherit',
        }}
      />

      {body.trim() && (
        <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 12, border: '1px dashed rgba(255,255,255,.1)' }}>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'var(--drill-muted)', marginBottom: 6 }}>預覽</div>
          <Rich md={preview} style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--drill-hint)' }} />
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy || !body.trim()}
        style={{
          marginTop: 10, width: '100%', height: 44, borderRadius: 13,
          background: 'var(--accent)', color: '#120E24', fontWeight: 700, fontSize: 14.5,
          opacity: busy || !body.trim() ? 0.4 : 1,
        }}
      >
        {busy ? '批改中…' : '送出批改'}
      </button>

      {error && (
        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: 'var(--orange)' }}>{error}</div>
      )}

      {grade && (
        <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: VERDICT[grade.verdict].color }}>
              {VERDICT[grade.verdict].label}
            </span>
            <span className="display" style={{ fontSize: 30, color: 'var(--drill-fg-strong)', lineHeight: 1 }}>{grade.score}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--drill-muted)' }}>/100</span>
          </div>

          <Section label="做對的地方" body={grade.praise} color="var(--green)" />
          {grade.first_error && <Section label="第一個出錯的步驟" body={grade.first_error} color="var(--orange)" />}
          {grade.why && <Section label="為什麼錯" body={grade.why} />}
          {grade.concept && <Section label="要補的觀念" body={grade.concept} color="var(--accent)" />}

          <button
            onClick={dispute}
            disabled={disputed}
            className="mono"
            style={{
              marginTop: 6, width: '100%', padding: '10px 0', borderRadius: 12,
              border: '1px solid rgba(255,255,255,.12)', fontSize: 11, letterSpacing: '.1em',
              color: disputed ? 'var(--green)' : 'var(--drill-muted)',
            }}
          >
            {disputed ? '已標記 —— 之後再回來看這題' : '我覺得我對'}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ label, body, color }: { label: string; body: string; color?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: color ?? 'var(--drill-muted)', marginBottom: 5 }}>
        {label}
      </div>
      <Rich md={body} style={{ fontSize: 14, lineHeight: 1.72, color: 'var(--drill-hint)' }} />
    </div>
  );
}
