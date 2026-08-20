import Anthropic from '@anthropic-ai/sdk';
import type { Problem } from './types';

export const TUTOR_MODEL = process.env.TUTOR_MODEL ?? 'claude-opus-5';

/** 'thinking' = still working on it. 'reviewing' = answer is already on the table. */
export type Phase = 'thinking' | 'reviewing';

export function tutorClient() {
  return new Anthropic();
}

export function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

const HOUSE_STYLE = `\
你在一個 quant 面試題庫 App 裡當助教，使用者正在準備 Jane Street、Two Sigma、
WorldQuant 這類公司的面試。用繁體中文（台灣）回答。

寫法：
- 直接講重點，不要開場白、不要「這是個好問題」。
- 數學一律寫成 LaTeX，行內用 $…$，獨立式用 $$…$$。前端會渲染。
- 短。一次講一件事。使用者在手機上讀。
- 專業術語沿用台灣 quant 圈的講法（martingale、Itô、call、put、payoff 直接用英文）。

你的判斷可能出錯。書上的標準解答是唯一權威 —— 如果你的推理和標準解答衝突，
以標準解答為準，並直說你原本想錯了。`;

const THINKING_RULES = `\
使用者還沒作答，正在想。你的工作是讓他自己想出來，不是幫他想完。

- 不要說出最終答案，也不要直接給出「關鍵那一步」。
- 用問句把他推到下一步：問他手上有什麼、問他為什麼那樣設、問他這個式子的意義。
- 他講錯了就指出來，但只指出「錯在哪一類」，不要順手把正確版本寫給他。
- 他如果堅持要答案：告訴他按畫面上的「先看解答」，你不在這個階段給。
- 你有標準解答可以參考，那是為了讓你的提示不會把他帶到錯的方向 —— 不是拿來念的。`;

const REVIEWING_RULES = `\
使用者已經作答或看過解答了，現在是檢討。可以完整討論，包括答案與每一步。

- 他問什麼就答什麼，不用再藏。
- 如果他當初答錯，把「他的想法錯在哪一步」講清楚，比重講一次正確解法有用。
- 主動指出這題的可遷移重點：下次遇到什麼特徵，就該想到這個手法。`;

function problemContext(problem: Problem, phase: Phase, draftAnswer?: string): string {
  const lines = [
    `題目（中文）：\n${problem.statement_zh}`,
    problem.statement_en ? `題目（原文）：\n${problem.statement_en}` : '',
    `章節主題：${problem.topic ?? '未標'}　難度：${problem.difficulty}`,
    problem.answer ? `標準答案：${problem.answer}` : '（這題沒有單一數值答案）',
    problem.solution_md ? `書上的標準解答：\n${problem.solution_md}` : '',
  ].filter(Boolean);

  if (phase === 'thinking' && draftAnswer?.trim()) {
    lines.push(`使用者目前填在答案欄的東西：${draftAnswer}（他還沒送出）`);
  }
  return lines.join('\n\n');
}

export function systemFor(problem: Problem, phase: Phase, draftAnswer?: string): Anthropic.TextBlockParam[] {
  // Two blocks: the house style is identical on every request and every problem,
  // so it caches; the problem itself changes per conversation and sits after it.
  return [
    {
      type: 'text',
      text: `${HOUSE_STYLE}\n\n${phase === 'thinking' ? THINKING_RULES : REVIEWING_RULES}`,
      cache_control: { type: 'ephemeral' },
    },
    { type: 'text', text: problemContext(problem, phase, draftAnswer) },
  ];
}

export const GRADER_SYSTEM = `\
你在批改一份手寫的解題推導，使用者正在準備 quant 面試。用繁體中文（台灣）。

你會拿到題目、書上的標準解答，以及使用者自己寫的完整過程。

判斷標準：
- 看的是**推理**，不是答案對不對。用了和書上不同但正確的方法 → sound。
- 答案對但過程有跳步或講不通 → flawed，並指出跳掉的是什麼。
- 第一個真正出錯的步驟才算 first_error。後面的錯如果只是被前面帶歪的，不要重複列。
- 沒有錯就把 first_error / why 留空。

score 是 0–100：推理完整正確 90 以上；方向對但有洞 60–80；方法就不對 40 以下。

praise 一定要寫，而且要具體 —— 指出他哪一步做對了、為什麼那步是對的關鍵。
不要寫「思路清晰」這種空話。

數學一律用 LaTeX（$…$ 或 $$…$$）。`;
