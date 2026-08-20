import type { z } from 'zod';

export interface ChatRequest {
  /** Stable across every request — the provider may cache on it. */
  system: string;
  /** Per-problem context. Changes whenever the problem changes. */
  context: string;
  turns: { role: 'user' | 'assistant'; content: string }[];
}

export interface GradeRequest<T extends z.ZodTypeAny> {
  system: string;
  prompt: string;
  schema: T;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  /** Yields text as it arrives. */
  streamChat(req: ChatRequest): AsyncIterable<string>;
  /** One shot, validated against the schema. */
  grade<T extends z.ZodTypeAny>(req: GradeRequest<T>): Promise<z.infer<T>>;
}
