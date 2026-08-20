import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getAttemptContext, saveDerivation } from '@/lib/queries';
import { GRADER_SYSTEM, hasCredentials, TUTOR_MODEL, tutorClient } from '@/lib/tutor';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const Grade = z.object({
  verdict: z.enum(['sound', 'flawed', 'wrong']),
  score: z.number().int().min(0).max(100),
  praise: z.string().describe('具體指出哪一步做對了、為什麼那步是關鍵'),
  first_error: z.string().nullable().describe('第一個真正出錯的步驟，引用使用者的原話；沒有錯就 null'),
  why: z.string().nullable().describe('那一步為什麼錯'),
  concept: z.string().nullable().describe('要回去補的觀念，一句話'),
});

const MOCK = {
  verdict: 'flawed' as const,
  score: 68,
  praise: '（mock）你把樣本空間展開成 8 種等機率結果是對的，這題的難點就在有沒有老實列出來。',
  first_error: '「所以機率是 $1/8$」',
  why: '這裡把條件忘掉了。分母不是全部 8 種，而是「至少一正」的 7 種。',
  concept: '條件機率的分母是條件事件，不是整個樣本空間。',
};

export async function POST(req: Request) {
  try {
    const { attemptId, derivation } = await req.json();
    const body = String(derivation ?? '').trim();
    if (!body) throw new Error('推導是空的');

    const ctx = getAttemptContext(Number(attemptId));

    if (process.env.TUTOR_MOCK === '1') {
      const id = saveDerivation(ctx.attemptId, body, MOCK);
      return Response.json({ id, ...MOCK });
    }
    if (!hasCredentials()) {
      return Response.json(
        { error: '沒有 Claude API 憑證。設定 ANTHROPIC_API_KEY，或用 TUTOR_MOCK=1 跑假的批改。' },
        { status: 503 },
      );
    }

    const p = ctx.problem;
    const prompt = [
      `題目：\n${p.statement_zh}`,
      p.answer ? `標準答案：${p.answer}` : '（這題沒有單一數值答案）',
      p.solution_md ? `書上的標準解答：\n${p.solution_md}` : '',
      `使用者寫的推導：\n${body}`,
    ].filter(Boolean).join('\n\n---\n\n');

    const res = await tutorClient().messages.parse({
      model: TUTOR_MODEL,
      max_tokens: 8000,
      system: GRADER_SYSTEM,
      // Grading is the one place where being wrong is expensive: a false
      // "you're wrong" teaches the wrong lesson and costs trust in the tool.
      output_config: { effort: 'high', format: zodOutputFormat(Grade) },
      messages: [{ role: 'user', content: prompt }],
    });

    const g = res.parsed_output;
    if (!g) throw new Error('批改結果解析失敗，再試一次');

    const id = saveDerivation(ctx.attemptId, body, g);
    return Response.json({ id, ...g });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
