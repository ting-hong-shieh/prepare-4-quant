import { NextResponse } from 'next/server';
import { endSession } from '@/lib/queries';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    endSession(Number(sessionId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
