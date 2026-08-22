import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { ChatRequest, GradeRequest, LlmProvider } from './types';

// Gemini 3.7 Flash. The chat side runs at thinking_level "low" — a tutor that
// takes ten seconds to ask you a question is not a conversation — and grading
// runs at "high", because a grader that is confidently wrong about your maths
// teaches you the wrong thing. ("minimal" is not supported on this model.)
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.7-flash';

function client() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('沒有 GEMINI_API_KEY');
  return new GoogleGenAI({ apiKey });
}

export const gemini: LlmProvider = {
  name: 'gemini',
  model: MODEL,

  async *streamChat({ system, context, turns }: ChatRequest) {
    // The interactions API takes one instruction block plus the exchange, so
    // the per-problem context rides with the system text rather than as a
    // pseudo-turn — a fake user turn would show up in the model's idea of who
    // said what.
    const stream = await client().interactions.create({
      model: MODEL,
      stream: true,
      system_instruction: `${system}\n\n${context}`,
      generation_config: { thinking_level: 'low' },
      input: turns.map(t =>
        t.role === 'assistant'
          ? { type: 'model_output' as const, content: [{ type: 'text' as const, text: t.content }] }
          : { type: 'user_input' as const, content: [{ type: 'text' as const, text: t.content }] },
      ),
    });

    for await (const event of stream) {
      if (event.event_type === 'step.delta' && event.delta.type === 'text') {
        yield event.delta.text;
      }
    }
  },

  async grade<T extends z.ZodTypeAny>({ system, prompt, schema }: GradeRequest<T>) {
    const jsonSchema = z.toJSONSchema(schema, { io: 'output' }) as Record<string, unknown>;
    delete jsonSchema.$schema; // the API rejects the draft marker

    const res = await client().interactions.create({
      model: MODEL,
      system_instruction: system,
      generation_config: { thinking_level: 'high' },
      response_format: { type: 'text', mime_type: 'application/json', schema: jsonSchema },
      input: prompt,
    });

    const text = res.output_text;
    if (!text) throw new Error('批改沒有回傳內容');
    return schema.parse(JSON.parse(text));
  },
};
