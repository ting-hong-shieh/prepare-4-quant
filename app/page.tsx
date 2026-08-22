import HomeScene from '@/components/HomeScene';
import LangToggle from '@/components/LangToggle';
import StartDrill from '@/components/StartDrill';
import { t } from '@/lib/i18n';
import { getLanguage, getOverview } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const pad2 = (n: number) => String(n).padStart(2, '0');

function formatDate(iso: string, lang: 'en' | 'zh') {
  const d = new Date(iso);
  return lang === 'zh'
    ? `${d.getMonth() + 1} 月 ${d.getDate()} 日`
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

export default function Home() {
  const lang = getLanguage();
  const s = t(lang);
  const o = getOverview();
  const chaptersDone = o.chapters.filter(c => c.total > 0 && c.done >= c.total).length;

  const slack =
    o.projectedFinish && o.daysToInterview !== null
      ? Math.max(0, o.daysToInterview - Math.round((new Date(o.projectedFinish).getTime() - Date.now()) / 86400000))
      : null;
  const pace = o.projectedFinish
    ? s.pace(o.doneProblems, o.totalProblems, formatDate(o.projectedFinish, lang), slack)
    : s.noPace(o.doneProblems, o.totalProblems);

  const chips = [
    `streak ${o.streakDays}d`,
    `due ${o.dueCount}`,
    o.daysToInterview !== null ? `interview ${o.daysToInterview >= 0 ? '−' : '+'}${Math.abs(o.daysToInterview)}d` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="shell" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
      <div className="grain grain--dark" />

      <div style={{ position: 'relative' }}>
        <HomeScene done={chaptersDone} total={Math.max(1, o.chapters.length)} sky={o.percent / 100} />
        <div
          style={{
            position: 'absolute', inset: '0 0 auto 0', height: 330, pointerEvents: 'none',
            background:
              'linear-gradient(#0A0A0A 0%, rgba(10,10,10,0) 34%, rgba(10,10,10,.35) 78%, #0A0A0A 100%)',
          }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 2, marginTop: -58, padding: '0 22px 34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <span className="eyebrow">{s.progress} / {pad2(o.chapters.length)} {s.chaptersLabel}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--rule-strong)' }} />
          <LangToggle lang={lang} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 4 }}>
          <span className="display" style={{ fontSize: 104, lineHeight: 0.82, letterSpacing: '.01em' }}>
            {o.percent}%
          </span>
          <span className="display" style={{ flex: 'none', whiteSpace: 'nowrap', fontSize: 62, lineHeight: 1.1, color: '#2E2E2E' }}>
            /100
          </span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--muted)', maxWidth: '30ch', marginBottom: 26 }}>
          {pace}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 26 }}>
          {chips.map(c => (
            <span
              key={c}
              className="mono"
              style={{
                padding: '6px 12px', border: '1px solid var(--rule)', borderRadius: 999,
                fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)',
              }}
            >
              {c}
            </span>
          ))}
        </div>

        <StartDrill label={s.todaySet(o.todayPlan.total)} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 2 }}>
          <span className="eyebrow">{s.chapters}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        </div>

        {o.chapters.map((c, i) => {
          const started = c.done > 0;
          const finished = c.total > 0 && c.done >= c.total;
          const inProgress = started && !finished;
          const faded = !started;
          const last = i === o.chapters.length - 1;
          return (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '15px 0',
                borderBottom: last ? 'none' : '1px solid var(--rule)',
                color: faded ? 'var(--dim)' : 'var(--paper)',
              }}
            >
              <span className="display" style={{ fontSize: 20, width: 22, color: faded ? 'inherit' : finished ? 'var(--dim)' : 'var(--paper)' }}>
                {pad2(c.no)}
              </span>
              <span style={{ flex: 1, fontSize: 14 }}>
                {lang === 'zh' ? c.title_zh : c.title_en}
                {inProgress && (
                  <div style={{ height: 1, background: 'var(--rule)', marginTop: 9, position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute', left: 0, top: 0, height: 1,
                        width: `${Math.round((c.done / c.total) * 100)}%`, background: 'var(--paper)',
                      }}
                    />
                  </div>
                )}
              </span>
              <span className="mono" style={{ fontSize: 10, color: faded ? 'inherit' : inProgress ? 'var(--paper)' : 'var(--muted)' }}>
                {c.done}/{c.total}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 22px 40px', display: 'flex', gap: 16 }}>
        <a className="mono" href="/review" style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)' }}>
          {s.reviewDesk} →
        </a>
      </div>

      {/* corner ticks — the frame that makes the monochrome read as a viewfinder */}
      <div style={{ position: 'absolute', top: 14, left: 14, width: 16, height: 16, borderTop: '1px solid var(--rule-strong)', borderLeft: '1px solid var(--rule-strong)', opacity: 0.6, zIndex: 7 }} />
      <div style={{ position: 'absolute', top: 14, right: 14, width: 16, height: 16, borderTop: '1px solid var(--rule-strong)', borderRight: '1px solid var(--rule-strong)', opacity: 0.6, zIndex: 7 }} />
    </div>
  );
}
