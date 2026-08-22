'use client';

// Just enough markdown for problem statements and solutions: $…$ / $$…$$ maths
// through KaTeX, **bold**, `code`, blank-line paragraphs and "- " bullets.
// Deliberately not a full markdown engine — the corpus is ours and this keeps
// the render path small enough to reason about.

import { memo, useMemo } from 'react';
import katex from 'katex';

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function renderMath(src: string, display: boolean) {
  try {
    return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: false });
  } catch {
    return `<code>${escapeHtml(src)}</code>`;
  }
}

function inline(text: string) {
  // Maths first, so **bold** never eats a \textbf-looking fragment inside $…$.
  const parts: string[] = [];
  const re = /\$([^$\n]+?)\$/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    parts.push(prose(text.slice(last, m.index)));
    parts.push(renderMath(m[1], false));
    last = m.index + m[0].length;
  }
  parts.push(prose(text.slice(last)));
  return parts.join('');
}

function prose(text: string) {
  return escapeHtml(text)
    // Bold first: **x** must not be eaten by the single-asterisk rule below.
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

export function toHtml(md: string): string {
  const out: string[] = [];
  // Pull display maths out whole; everything left is paragraphs and bullets.
  const chunks = md.split(/\$\$([\s\S]+?)\$\$/g);
  chunks.forEach((chunk, i) => {
    if (i % 2 === 1) { out.push(renderMath(chunk.trim(), true)); return; }
    chunk.split(/\n{2,}/).forEach(block => {
      const trimmed = block.trim();
      if (!trimmed) return;
      const lines = trimmed.split('\n');
      if (lines.every(l => /^\s*[-*]\s+/.test(l))) {
        out.push('<ul>' + lines.map(l => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('') + '</ul>');
      } else if (lines.every(l => /^\s*\d+\.\s+/.test(l))) {
        out.push('<ol>' + lines.map(l => `<li>${inline(l.replace(/^\s*\d+\.\s+/, ''))}</li>`).join('') + '</ol>');
      } else {
        out.push(`<p>${inline(trimmed.replace(/\n/g, '<br/>'))}</p>`);
      }
    });
  });
  return out.join('');
}

function RichImpl({ md, className, style }: { md: string; className?: string; style?: React.CSSProperties }) {
  const html = useMemo(() => toHtml(md), [md]);
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

// The drill screen re-renders once a second for the clock. Without this, every
// tick walks the whole rendered KaTeX tree of the statement and the solution.
export default memo(RichImpl);
