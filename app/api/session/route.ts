import { NextResponse } from 'next/server';
import { createSession } from '@/lib/queries';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = createSession(body.kind ?? 'daily', body.chapterId);
    return NextResponse.json({ sessionId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
