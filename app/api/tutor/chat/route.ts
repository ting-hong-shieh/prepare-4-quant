import { appendChat, getAttemptContext, getChat } from '@/lib/queries';
import { hasCredentials, systemFor, TUTOR_MODEL, tutorClient } from '@/lib/tutor';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Lets the whole UI path be exercised without credentials: TUTOR_MOCK=1 npm run dev.
 *  Persists the reply exactly like the real path so multi-turn history is
 *  identical under mock — otherwise the mock would hide a broken history. */
function mockStream(message: string, onDone: (full: string) => void): ReadableStream<Uint8Array> {
  const reply = [
    '（mock）收到你說的：「', message.slice(0, 40), '」\n\n',
    '先確認一件事：你手上已知的是什麼？把 $P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}$ ',
    '裡的 $A$ 和 $B$ 分別對應到題目的哪個事件？\n\n',
    '設定 `ANTHROPIC_API_KEY` 之後這裡就會是真的助教。',
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
    appendChat(ctx.attemptId, 'user', text, ctx.phase);

    const history = getChat(ctx.attemptId)
      .filter(t => t.content.trim())
      .map(t => ({ role: t.role, content: t.content }));

    if (process.env.TUTOR_MOCK === '1' || !hasCredentials()) {
      if (!hasCredentials() && process.env.TUTOR_MOCK !== '1') {
        return Response.json(
          { error: '沒有 Claude API 憑證。設定 ANTHROPIC_API_KEY，或用 TUTOR_MOCK=1 跑假的助教。' },
          { status: 503 },
        );
      }
      return new Response(
        mockStream(text, full => appendChat(ctx.attemptId, 'assistant', full, ctx.phase)),
        { headers: { 'content-type': 'text/plain; charset=utf-8' } },
      );
    }

    const client = tutorClient();
    const stream = client.messages.stream({
      model: TUTOR_MODEL,
      max_tokens: 4000,
      system: systemFor(ctx.problem, ctx.phase),
      // Adaptive thinking is the default on Opus 5; effort medium keeps a
      // back-and-forth tutor snappy without making it careless about the maths.
      output_config: { effort: 'medium' },
      messages: history as any,
    });

    const enc = new TextEncoder();
    let full = '';
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              full += event.delta.text;
              controller.enqueue(enc.encode(event.delta.text));
            }
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
