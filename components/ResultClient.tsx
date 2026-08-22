'use client';

// 3d 結果頁 · 角色個性「安靜」. The buddy's mood is picked from how the set
// actually went, and the three buttons under it let you page through the moods
// the way the design canvas did.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import QuantBuddy, { type Mood } from './QuantBuddy';
import { t, type Lang } from '@/lib/i18n';

interface Row { ordinal: number; seconds: number; outcome: string; title: string; title_en: string | null; topic: string | null }

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function ResultClient({
  result, percentBefore, percentAfter, streakDays, lang,
}: {
  result: { rows: Row[]; answered: number; correct: number; avgSeconds: number };
  percentBefore: number;
  percentAfter: number;
  streakDays: number;
  lang: Lang;
}) {
  const router = useRouter();
  const s = t(lang);
  const COPY: Record<Mood, { title: string; sub: string }> = {
    proud: s.moodProud, rest: s.moodRest, sorry: s.moodSorry, focus: s.moodFocus,
  };
  const allCorrect = result.correct === result.answered;
  const mostlyWrong = result.correct < result.answered / 2;
  const initial: Mood = allCorrect ? 'proud' : mostlyWrong ? 'sorry' : 'rest';
  const [mood, setMood] = useState<Mood>(initial);

  const chip = (label: string, m: Mood) => (
    <button
      key={m}
      onClick={() => setMood(m)}
      style={{
        padding: '7px 14px', borderRadius: 999, fontSize: 12.5,
        border: '2px solid var(--cream-ink)',
        background: mood === m ? 'var(--cream-ink)' : 'transparent',
        color: mood === m ? 'var(--cream)' : 'var(--cream-ink)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="shell"
      style={{ background: 'var(--cream)', color: 'var(--cream-ink)', padding: '48px 20px 34px', minHeight: '100dvh' }}
    >
      <div className="grain grain--cream" />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 22 }}>
        <QuantBuddy size={128} mood={mood} personality="quiet" tone="light" />
        <div className="round" style={{ fontSize: 24, fontWeight: 600, marginTop: 10 }}>{COPY[mood].title}</div>
        <div style={{ fontSize: 13, color: 'var(--cream-muted)', marginTop: 4, lineHeight: 1.55, maxWidth: '26ch' }}>
          {COPY[mood].sub}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 22 }}>
        {chip(s.moodAll, 'proud')}
        {chip(s.moodClose, 'sorry')}
        {chip(s.moodThinking, 'focus')}
      </div>

      <div style={{ position: 'relative', zIndex: 1, background: '#fff', border: '2px solid var(--cream-ink)', borderRadius: 22, boxShadow: '0 5px 0 var(--cream-ink)', padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--cream-muted)' }}>{s.completion}</span>
          <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--violet)' }}>
            {percentBefore}% → {percentAfter}%
          </span>
        </div>
        <div style={{ height: 12, borderRadius: 99, background: '#F1E7D6', border: '2px solid var(--cream-ink)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ width: `${percentAfter}%`, height: '100%', background: 'var(--violet)' }} />
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <Stat value={`+${result.correct}`} label={s.gotRight} />
          <Stat value={String(streakDays)} label={s.dayStreak} />
          <Stat value={clock(result.avgSeconds)} label={s.perProblem} color="var(--green)" />
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, background: '#fff', border: '2px solid var(--cream-ink)', borderRadius: 20, padding: '4px 16px', marginBottom: 14 }}>
        {result.rows.map((r, i) => (
          <div
            key={r.ordinal}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
              borderBottom: i === result.rows.length - 1 ? 'none' : '1px solid rgba(36,30,26,.1)',
            }}
          >
            <div
              style={{
                width: 10, height: 10, borderRadius: 99, flex: 'none', border: '2px solid var(--cream-ink)',
                background: r.outcome === 'correct' ? 'var(--green)' : 'var(--orange)',
              }}
            />
            <span style={{ flex: 1, fontSize: 13.5 }}>{(lang === 'en' ? r.title_en : r.title) || r.title}</span>
            <span className="mono" style={{ fontWeight: 500, fontSize: 11, color: 'var(--cream-muted)' }}>{clock(r.seconds ?? 0)}</span>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 9 }}>
        <button
          onClick={async () => {
            const res = await fetch('/api/session', { method: 'POST' });
            const body = await res.json();
            if (res.ok) router.push(`/drill/${body.sessionId}`);
            else router.push('/');
          }}
          style={{
            flex: 'none', padding: '0 18px', height: 50, borderRadius: 14, border: '2px solid var(--cream-ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600,
          }}
        >
          {s.again}
        </button>
        <button
          onClick={() => router.push('/')}
          className="round"
          style={{
            flex: 1, height: 50, borderRadius: 14, background: 'var(--cream-ink)', color: 'var(--cream)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600,
          }}
        >
          {s.home}
        </button>
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div>
      <div className="round" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: color ?? 'var(--cream-ink)' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--cream-muted)', marginTop: 3 }}>{label}</div>
    </div>
  );
}
