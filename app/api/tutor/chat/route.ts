import { appendChat, getAttemptContext, getChat, getLanguage } from '@/lib/queries';
import { provider, providerReady } from '@/lib/llm';
import type { Lang } from '@/lib/i18n';
import { systemFor } from '@/lib/tutor';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Lets the whole UI path be exercised without credentials: TUTOR_MOCK=1 npm run dev.
 *  Persists the reply exactly like the real path so multi-turn history is
 *  identical under mock — otherwise the mock would hide a broken history. */
function mockStream(message: string, lang: Lang, onDone: (full: string) => void): ReadableStream<Uint8Array> {
  const reply = lang === 'zh'
    ? [
        '（mock）收到你說的：「', message.slice(0, 40), '」\n\n',
        '先確認一件事：你手上已知的是什麼？把 $P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}$ ',
        '裡的 $A$ 和 $B$ 分別對應到題目的哪個事件？\n\n',
        '設定 `GEMINI_API_KEY` 之後這裡就會是真的助教。',
      ]
    : [
        '(mock) You said: "', message.slice(0, 40), '"\n\n',
        'First, what do you actually have? In $P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}$, ',
        'which event in the problem is $A$ and which is $B$?\n\n',
        'Set `GEMINI_API_KEY` and this becomes the real tutor.',
      ];
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= reply.length) {
        onDone(reply.join(''));
        controller.close();
        return;
      }
      controller.enqueue(enc.encode(reply[i++]));
    },
  });
}

export async function POST(req: Request) {
  try {
    const { attemptId, message } = await req.json();
    const text = String(message ?? '').trim();
    if (!text) throw new Error('訊息是空的');

    const ctx = getAttemptContext(Number(attemptId));
    const lang = getLanguage();
    appendChat(ctx.attemptId, 'user', text, ctx.phase);

    const history = getChat(ctx.attemptId)
      .filter(t => t.content.trim())
      .map(t => ({ role: t.role, content: t.content }));

    const ready = providerReady();
    if (process.env.TUTOR_MOCK === '1' || !ready.ok) {
      if (!ready.ok && process.env.TUTOR_MOCK !== '1') {
        return Response.json({ error: ready.message }, { status: 503 });
      }
      return new Response(
        mockStream(text, lang, full => appendChat(ctx.attemptId, 'assistant', full, ctx.phase)),
        { headers: { 'content-type': 'text/plain; charset=utf-8' } },
      );
    }

    const { system, context } = systemFor(ctx.problem, ctx.phase, lang);
    const chunks = provider().streamChat({ system, context, turns: history });

    const enc = new TextEncoder();
    let full = '';
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const text of chunks) {
            full += text;
            controller.enqueue(enc.encode(text));
          }
          appendChat(ctx.attemptId, 'assistant', full, ctx.phase);
        } catch (e) {
          controller.enqueue(enc.encode(`\n\n[助教中斷：${(e as Error).message}]`));
          if (full) appendChat(ctx.attemptId, 'assistant', full, ctx.phase);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
