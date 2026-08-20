'use client';

// 助教. Slides up over the drill screen so the problem stays where it was.
// Before you submit it will not hand you the answer — that rule lives in the
// system prompt on the server, and the phase it runs in comes from whether the
// attempt has ended, not from anything the client claims.

import { useEffect, useRef, useState } from 'react';
import Rich from './Rich';

const LATEX_KEYS = ['\\frac{}{}', '\\int', '\\sum', '^{}', '_{}', '\\sqrt{}', '\\infty', '$$'];

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

export default function TutorSheet({
  attemptId, phase, open, onClose, initial,
}: {
  attemptId: number;
  phase: 'thinking' | 'reviewing';
  open: boolean;
  onClose: () => void;
  initial?: ChatTurn[];
}) {
  const [turns, setTurns] = useState<ChatTurn[]>(initial ?? []);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 220);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, streaming]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setError(null);
    setInput('');
    setTurns(t => [...t, { role: 'user', content: message }, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ attemptId, message }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `助教沒有回應（${res.status}）`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setTurns(t => {
          const next = [...t];
          next[next.length - 1] = { role: 'assistant', content: acc };
          return next;
        });
      }
    } catch (e) {
      setError((e as Error).message);
      setTurns(t => t.slice(0, -1)); // drop the empty assistant bubble
    } finally {
      setStreaming(false);
    }
  }

  const suggestions = phase === 'thinking'
    ? ['我卡住了，給我一個方向', '我想用這個設法，對嗎？', '這題在考什麼觀念？']
    : ['我當初錯在哪一步？', '有沒有更快的做法？', '下次遇到什麼特徵要想到這招？'];

  return (
    <div
      aria-hidden={!open}
      style={{
        position: 'fixed', inset: 0, zIndex: 40, pointerEvents: open ? 'auto' : 'none',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(6,4,14,.62)',
          opacity: open ? 1 : 0, transition: 'opacity .22s ease',
        }}
      />

      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 460, margin: '0 auto',
          height: '86dvh', display: 'flex', flexDirection: 'column',
          background: '#171327', borderTopLeftRadius: 22, borderTopRightRadius: 22,
          border: '1px solid rgba(255,255,255,.09)', borderBottom: 'none',
          transform: open ? 'translateY(0)' : 'translateY(102%)',
          transition: 'transform .26s cubic-bezier(.22,1,.36,1)',
        }}
      >
        <div style={{ flex: 'none', padding: '12px 18px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--drill-muted)' }}>
            助教
          </span>
          <span
            className="mono"
            style={{
              fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: 99,
              border: `1px solid ${phase === 'thinking' ? 'rgba(141,123,255,.45)' : 'rgba(51,192,140,.45)'}`,
              color: phase === 'thinking' ? 'var(--accent)' : 'var(--green)',
            }}
          >
            {phase === 'thinking' ? '不給答案' : '完整討論'}
          </span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} aria-label="收起助教" style={{ fontSize: 15, color: '#9A93B0', padding: 4 }}>✕</button>
        </div>

        <div ref={listRef} style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>
          {turns.length === 0 && (
            <div style={{ color: 'var(--drill-muted)', fontSize: 13.5, lineHeight: 1.7 }}>
              {phase === 'thinking'
                ? '卡住的時候問這裡。這個階段助教不會直接給答案，只會問你問題把你推下一步。'
                : '答案已經揭曉了，這裡可以完整討論 —— 問你錯在哪、問有沒有更快的做法。'}
            </div>
          )}

          {turns.map((t, i) => (
            <div
              key={i}
              style={{
                marginBottom: 14, display: 'flex',
                justifyContent: t.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: t.role === 'user' ? '82%' : '100%',
                  padding: t.role === 'user' ? '10px 13px' : 0,
                  borderRadius: 14,
                  background: t.role === 'user' ? 'rgba(141,123,255,.16)' : 'transparent',
                  border: t.role === 'user' ? '1px solid rgba(141,123,255,.28)' : 'none',
                  color: t.role === 'user' ? 'var(--drill-fg-strong)' : 'var(--drill-hint)',
                  fontSize: 14.5, lineHeight: 1.72,
                }}
              >
                {t.content
                  ? <Rich md={t.content} />
                  : <span className="mono" style={{ color: 'var(--drill-muted)', fontSize: 12 }}>思考中…</span>}
              </div>
            </div>
          ))}

          {error && (
            <div style={{ padding: '10px 13px', borderRadius: 12, border: '1px solid rgba(255,138,91,.4)', background: 'rgba(255,138,91,.1)', color: 'var(--orange)', fontSize: 13, lineHeight: 1.6 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ flex: 'none', borderTop: '1px solid rgba(255,255,255,.07)', padding: '10px 12px 22px' }}>
          {turns.length === 0 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 9 }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    flex: 'none', padding: '7px 12px', borderRadius: 99, fontSize: 12.5,
                    border: '1px solid rgba(255,255,255,.14)', color: 'var(--drill-hint)', whiteSpace: 'nowrap',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
            {LATEX_KEYS.map(k => (
              <button
                key={k}
                onClick={() => {
                  setInput(v => v + k);
                  inputRef.current?.focus();
                }}
                className="mono"
                style={{
                  flex: 'none', padding: '5px 9px', borderRadius: 7, fontSize: 11.5,
                  background: 'rgba(255,255,255,.06)', color: 'var(--drill-fg)', whiteSpace: 'nowrap',
                }}
              >
                {k}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(input); }
                e.stopPropagation(); // the drill screen's own key handler must not eat this
              }}
              rows={1}
              placeholder="可以直接寫 LaTeX，例如 $P(A\mid B)$"
              style={{
                flex: 1, minHeight: 44, maxHeight: 140, resize: 'none',
                background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 13, padding: '12px 13px', color: 'var(--drill-fg-strong)',
                fontSize: 14.5, lineHeight: 1.5, fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              style={{
                flex: 'none', width: 52, height: 44, borderRadius: 13,
                background: 'var(--accent)', color: '#120E24', fontWeight: 700, fontSize: 15,
                opacity: streaming || !input.trim() ? 0.35 : 1,
              }}
            >
              {streaming ? '…' : '↑'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
