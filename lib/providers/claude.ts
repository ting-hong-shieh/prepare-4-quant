import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import type { ChatRequest, GradeRequest, LlmProvider } from './types';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-5';

function client() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error('沒有 ANTHROPIC_API_KEY');
  }
  return new Anthropic();
}

export const claude: LlmProvider = {
  name: 'claude',
  model: MODEL,

  async *streamChat({ system, context, turns }: ChatRequest) {
    const stream = client().messages.stream({
      model: MODEL,
      max_tokens: 4000,
      // Two blocks: the stable half caches, the per-problem half sits after it.
      system: [
        { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: context },
      ],
      output_config: { effort: 'medium' },
      messages: turns as Anthropic.MessageParam[],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  },

  async grade<T extends z.ZodTypeAny>({ system, prompt, schema }: GradeRequest<T>) {
    const res = await client().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system,
      output_config: { effort: 'high', format: zodOutputFormat(schema) },
      messages: [{ role: 'user', content: prompt }],
    });
    if (!res.parsed_output) throw new Error('批改結果解析失敗');
    return res.parsed_output as z.infer<T>;
  },
};
