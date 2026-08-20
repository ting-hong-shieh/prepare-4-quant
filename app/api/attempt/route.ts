import { NextResponse } from 'next/server';
import { submitAttempt } from '@/lib/queries';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { grade } = submitAttempt({
      attemptId: Number(body.attemptId),
      answer: String(body.answer ?? ''),
      outcome: body.outcome,
      seconds: Number(body.seconds ?? 0),
      hintsUsed: Number(body.hintsUsed ?? 0),
    });
    return NextResponse.json({ ok: true, grade });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
