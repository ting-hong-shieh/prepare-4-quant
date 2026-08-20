import { z } from 'zod';
import { provider, providerReady } from '@/lib/llm';
import { getAttemptContext, getLanguage, saveDerivation } from '@/lib/queries';
import { graderSystem } from '@/lib/tutor';
import { localise } from '@/lib/i18n';

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
  en: {
    verdict: 'flawed' as const,
    score: 68,
    praise: '(mock) Writing out all 8 equally likely outcomes is the right move — that is the whole difficulty here.',
    first_error: '"so the probability is $1/8$"',
    why: 'The condition got dropped. The denominator is not all 8 outcomes but the 7 with at least one head.',
    concept: 'In conditional probability the denominator is the conditioning event, not the whole sample space.',
  },
  zh: {
    verdict: 'flawed' as const,
    score: 68,
    praise: '（mock）你把樣本空間展開成 8 種等機率結果是對的，這題的難點就在有沒有老實列出來。',
    first_error: '「所以機率是 $1/8$」',
    why: '這裡把條件忘掉了。分母不是全部 8 種，而是「至少一正」的 7 種。',
    concept: '條件機率的分母是條件事件，不是整個樣本空間。',
  },
};

export async function POST(req: Request) {
  try {
    const { attemptId, derivation } = await req.json();
    const body = String(derivation ?? '').trim();
    if (!body) throw new Error('推導是空的');

    const ctx = getAttemptContext(Number(attemptId));
    const lang = getLanguage();

    if (process.env.TUTOR_MOCK === '1') {
      const mock = MOCK[lang];
      const id = saveDerivation(ctx.attemptId, body, mock);
      return Response.json({ id, ...mock });
    }
    const ready = providerReady();
    if (!ready.ok) return Response.json({ error: ready.message }, { status: 503 });

    const text = localise(ctx.problem, lang);
    const zh = lang === 'zh';
    const prompt = [
      zh ? `題目：\n${text.statement}` : `Problem:\n${text.statement}`,
      ctx.problem.answer
        ? zh ? `標準答案：${ctx.problem.answer}` : `Canonical answer: ${ctx.problem.answer}`
        : zh ? '（這題沒有單一數值答案）' : '(no single numeric answer)',
      text.solution ? (zh ? `書上的標準解答：\n${text.solution}` : `The book's solution:\n${text.solution}`) : '',
      zh ? `使用者寫的推導：\n${body}` : `Their derivation:\n${body}`,
    ].filter(Boolean).join('\n\n---\n\n');

    // Grading is the one place where being wrong is expensive: a false
    // "you're wrong" teaches the wrong lesson and costs trust in the tool.
    const g = await provider().grade({ system: graderSystem(lang), prompt, schema: Grade });

    const id = saveDerivation(ctx.attemptId, body, g);
    return Response.json({ id, ...g });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
