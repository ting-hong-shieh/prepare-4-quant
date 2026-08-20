import { claude } from './providers/claude';
import { gemini } from './providers/gemini';
import type { LlmProvider } from './providers/types';

export type { ChatRequest, GradeRequest, LlmProvider } from './providers/types';

const PROVIDERS: Record<string, LlmProvider> = { gemini, claude };

/** LLM_PROVIDER=gemini|claude — defaults to Gemini. */
export function provider(): LlmProvider {
  const name = (process.env.LLM_PROVIDER ?? 'gemini').toLowerCase();
  const p = PROVIDERS[name];
  if (!p) throw new Error(`不認得的 LLM_PROVIDER：${name}（可用：${Object.keys(PROVIDERS).join(', ')}）`);
  return p;
}

/** Whether the selected provider has a key. Checked before the route does work. */
export function providerReady(): { ok: boolean; message?: string } {
  const name = (process.env.LLM_PROVIDER ?? 'gemini').toLowerCase();
  if (name === 'gemini') {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      ? { ok: true }
      : { ok: false, message: '沒有 GEMINI_API_KEY。設定之後助教才會動，或用 TUTOR_MOCK=1 跑罐頭助教。' };
  }
  return process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
    ? { ok: true }
    : { ok: false, message: '沒有 ANTHROPIC_API_KEY。設定之後助教才會動，或用 TUTOR_MOCK=1 跑罐頭助教。' };
}
