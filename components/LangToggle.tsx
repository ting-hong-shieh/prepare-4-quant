'use client';

// One language at a time. The setting lives in the database, not in local
// storage, so the tutor on the server answers in the same language the screen
// is showing.

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { Lang } from '@/lib/i18n';

export default function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(next: Lang) {
    if (next === lang || pending) return;
    startTransition(async () => {
      await fetch('/api/language', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang: next }),
      });
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label="language"
      style={{ display: 'flex', border: '1px solid var(--rule)', borderRadius: 999, overflow: 'hidden', opacity: pending ? 0.5 : 1 }}
    >
      {(['en', 'zh'] as const).map(l => (
        <button
          key={l}
          onClick={() => pick(l)}
          aria-pressed={lang === l}
          className="mono"
          style={{
            padding: '5px 11px',
            fontSize: 9.5,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            background: lang === l ? 'var(--paper)' : 'transparent',
            color: lang === l ? 'var(--ink)' : 'var(--muted)',
          }}
        >
          {l === 'en' ? 'EN' : '中'}
        </button>
      ))}
    </div>
  );
}
