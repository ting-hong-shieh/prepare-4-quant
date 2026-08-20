import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const FIELDS = ['title', 'topic', 'difficulty', 'statement_zh', 'statement_en', 'answer', 'solution_md'] as const;

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!Number.isInteger(id)) throw new Error('缺少 id');

    const sets: string[] = [];
    const args: unknown[] = [];
    for (const f of FIELDS) {
      if (f in body) { sets.push(`${f} = ?`); args.push(body[f] ?? null); }
    }
    if ('hints' in body) { sets.push('hints = ?'); args.push(JSON.stringify(body.hints ?? [])); }
    if ('verified' in body) { sets.push('verified = ?'); args.push(body.verified ? 1 : 0); }
    if (!sets.length) throw new Error('沒有要更新的欄位');

    args.push(id);
    getDb().prepare(`UPDATE problems SET ${sets.join(', ')} WHERE id = ?`).run(...args);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
