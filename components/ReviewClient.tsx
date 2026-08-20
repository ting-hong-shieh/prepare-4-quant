'use client';

// 校對台. Extraction is ~90–95% right on maths, which means one page in ten
// carries a wrong subscript — and a wrong subscript is a problem that teaches
// you the wrong thing. Nothing counts as part of the bank until it has been
// through here: scan on the left, fields on the right, keyboard-driven.

import { useEffect, useMemo, useState } from 'react';
import Rich from './Rich';
import type { ReviewRow } from '@/lib/reviewQueries';

const FIELD_LABEL: Record<string, string> = {
  title: '標題',
  statement_zh: '題目（中文）',
  statement_en: '題目（原文）',
  answer: '答案',
  solution_md: '解答',
};

export default function ReviewClient({
  rows, counts, showAll,
}: { rows: ReviewRow[]; counts: { total: number; pending: number }; showAll: boolean }) {
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState<ReviewRow | null>(rows[0] ?? null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());

  const row = rows[idx];
  useEffect(() => { setDraft(row ?? null); }, [row]);

  const preview = useMemo(
    () => [draft?.statement_zh, draft?.solution_md].filter(Boolean).join('\n\n'),
    [draft],
  );

  async function save(verified: boolean) {
    if (!draft) return;
    setSaving(true);
    await fetch('/api/problem', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...draft, verified }),
    });
    setSaving(false);
    if (verified) setDone(d => new Set(d).add(draft.id));
    if (idx + 1 < rows.length) setIdx(i => i + 1);
  }

  if (!rows.length) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 40 }}>
        <h1 className="display" style={{ fontSize: 44, margin: '0 0 10px' }}>NOTHING TO REVIEW</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
          題庫裡 {counts.total} 題，全部校對過了。跑 <code>ingest/extract.py</code> 之後再回來。
        </p>
        <a className="mono" href="/" style={{ fontSize: 11, color: 'var(--muted)' }}>← 回首頁</a>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100dvh', padding: '18px 20px 40px' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <a className="mono" href="/" style={{ fontSize: 11, color: 'var(--muted)' }}>←</a>
        <span className="eyebrow">review</span>
        <span className="display" style={{ fontSize: 30 }}>
          {idx + 1}/{rows.length}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
          待校對 {Math.max(0, counts.pending - done.size)} · 全庫 {counts.total}
        </span>
        <span style={{ flex: 1 }} />
        <a className="mono" href={showAll ? '/review' : '/review?all=1'} style={{ fontSize: 11, color: 'var(--muted)' }}>
          {showAll ? '只看待校對' : '看全部'}
        </a>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.15fr)', gap: 20, alignItems: 'start' }}>
        {/* the scan */}
        <div style={{ position: 'sticky', top: 18 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
            {row.chapter_no != null ? `ch${row.chapter_no} · ` : ''}掃描頁 {row.page ?? '—'}
          </div>
          {row.page ? (
            <img
              src={`/api/page/${row.page}`}
              alt={`掃描第 ${row.page} 頁`}
              style={{ width: '100%', border: '1px solid var(--rule)', borderRadius: 6, background: '#fff' }}
            />
          ) : (
            <div style={{ padding: 24, border: '1px dashed var(--rule)', borderRadius: 6, color: 'var(--dim)', fontSize: 13 }}>
              這題沒有對應的掃描頁（種子題庫）
            </div>
          )}
        </div>

        {/* the fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(['title', 'statement_zh', 'statement_en', 'answer', 'solution_md'] as const).map(f => (
            <label key={f} style={{ display: 'block' }}>
              <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>{FIELD_LABEL[f]}</span>
              <textarea
                value={(draft?.[f] as string) ?? ''}
                onChange={e => setDraft(d => (d ? { ...d, [f]: e.target.value } : d))}
                rows={f === 'solution_md' ? 12 : f === 'title' || f === 'answer' ? 1 : 4}
                spellCheck={false}
                className="mono"
                style={{
                  width: '100%', background: '#111', color: 'var(--paper)', border: '1px solid var(--rule)',
                  borderRadius: 6, padding: '9px 11px', fontSize: 13, lineHeight: 1.6, resize: 'vertical',
                }}
              />
            </label>
          ))}

          <div>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>渲染後</span>
            <div style={{ border: '1px solid var(--rule)', borderRadius: 6, padding: '12px 14px', fontSize: 14, lineHeight: 1.7 }}>
              <Rich md={preview} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 9, position: 'sticky', bottom: 0, background: 'var(--ink)', paddingTop: 10 }}>
            <button
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="mono"
              style={{ padding: '0 16px', height: 44, borderRadius: 8, border: '1px solid var(--rule)', fontSize: 12, opacity: idx === 0 ? 0.4 : 1 }}
            >
              ←
            </button>
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="mono"
              style={{ padding: '0 16px', height: 44, borderRadius: 8, border: '1px solid var(--rule)', fontSize: 12 }}
            >
              存草稿
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              style={{ flex: 1, height: 44, borderRadius: 8, background: 'var(--paper)', color: 'var(--ink)', fontWeight: 700, fontSize: 14 }}
            >
              {saving ? '儲存中…' : '校對完成 →'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
