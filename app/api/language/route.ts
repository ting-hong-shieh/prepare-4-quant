import { NextResponse } from 'next/server';
import { setLanguage } from '@/lib/queries';

export async function POST(req: Request) {
  try {
    const { lang } = await req.json();
    if (lang !== 'en' && lang !== 'zh') throw new Error(`unknown language: ${lang}`);
    setLanguage(lang);
    return NextResponse.json({ ok: true, lang });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
