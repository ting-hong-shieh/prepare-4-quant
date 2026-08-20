'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function StartDrill({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/session', { method: 'POST' });
    const body = await res.json();
    if (!res.ok) { setError(body.error ?? '無法建立題組'); setBusy(false); return; }
    router.push(`/drill/${body.sessionId}`);
  }

  return (
    <>
      <button
        onClick={start}
        disabled={busy}
        className="mono"
        style={{
          width: '100%', height: 38, borderRadius: 6, background: 'var(--paper)', color: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
          opacity: busy ? 0.6 : 1, marginBottom: error ? 10 : 30,
        }}
      >
        {busy ? 'loading…' : label} <span>→</span>
      </button>
      {error && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>{error}</div>
      )}
    </>
  );
}
