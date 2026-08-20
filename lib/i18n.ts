import type { Figure, Problem } from './types';

export type Lang = 'en' | 'zh';

/** What the drill screen actually needs. Built on the server so the payload
 *  carries one language, not both — 12 problems' worth of the other language,
 *  solutions included, is not something the client should be shipped. */
export interface LocalisedProblem {
  id: number;
  topic: string | null;
  difficulty: string;
  answer: string | null;
  title: string;
  statement: string;
  solution: string | null;
  hints: string[];
  figures: Figure[];
}

export const LANGS: Lang[] = ['en', 'zh'];

/** One screen, one language. Falling back to the other side is for missing
 *  content only — never a reason to show both at once. */
export function localise(p: Problem, lang: Lang): LocalisedProblem & { partial: boolean } {
  const en = lang === 'en';
  return {
    id: p.id,
    topic: p.topic,
    difficulty: p.difficulty,
    answer: p.answer,
    figures: p.figures ?? [],
    title: (en ? p.title_en : p.title) || p.title || p.title_en || '',
    statement: (en ? p.statement_en : p.statement_zh) || p.statement_zh || p.statement_en || '',
    solution: (en ? p.solution_en : p.solution_md) || p.solution_md || p.solution_en || null,
    hints: ((en ? p.hints_en : p.hints) ?? []).length ? (en ? p.hints_en : p.hints) : (p.hints ?? []),
    /** True when we had to fall back — the proofreading screen surfaces this. */
    partial: en ? !p.statement_en || !p.solution_en : !p.statement_zh || !p.solution_md,
  };
}

const EN = {
  chaptersLabel: 'chapters',
  progress: 'progress',
  chapters: 'chapters',
  todaySet: (n: number) => `today's ${n}`,
  noPace: (done: number, total: number) =>
    `${done.toLocaleString()} / ${total.toLocaleString()} problems. Not enough history to project a finish date yet — drill for a few days.`,
  pace: (done: number, total: number, date: string, slack: number | null) =>
    `${done.toLocaleString()} / ${total.toLocaleString()} problems. At this rate, done ${date}${
      slack === null ? '.' : ` — ${slack} days before the interview.`
    }`,
  reviewDesk: 'proofreading',

  difficulty: { easy: 'easy', medium: 'medium', hard: 'hard' } as Record<string, string>,
  problemOf: (i: number, n: number) => `problem ${i} of ${n}`,
  answer: 'ANSWER',
  answerHint: 'accepts 1/7, sqrt(pi)/2',
  hintN: (i: number, n: number) => `hint ${i} / ${n}`,
  reveal: 'show solution',
  submit: 'submit',
  next: 'next',
  seeScore: 'score',
  leaveSet: 'leave this set',
  correct: 'correct',
  wrong: 'wrong',
  revealed: 'revealed',

  writeUp: 'write your derivation · get it graded',
  derivation: 'derivation',
  collapse: 'collapse',
  preview: 'preview',
  gradeIt: 'submit for grading',
  grading: 'grading…',
  derivationPlaceholder: 'Write out the full argument, maths in LaTeX:\n\nLet $x, y \\sim U(0,1)$ be independent…',
  didRight: 'what you got right',
  firstError: 'first step that goes wrong',
  whyWrong: 'why',
  toRevisit: 'concept to revisit',
  disagree: 'I think I was right',
  flagged: 'flagged — come back to this one',

  tutor: 'TUTOR',
  noAnswers: 'no answers',
  fullDiscussion: 'open discussion',
  tutorIdleThinking: "Ask here when you're stuck. At this stage the tutor won't hand you the answer — it asks questions to push you to the next step.",
  tutorIdleReviewing: 'The answer is out. Discuss it fully here — where you went wrong, whether there was a faster route.',
  tutorPlaceholder: 'LaTeX is fine, e.g. $P(A\\mid B)$',
  thinking: 'thinking…',
  suggestThinking: ["I'm stuck — point me in a direction", 'Is this setup right?', 'What idea is this problem testing?'],
  suggestReviewing: ['Which step did I get wrong?', 'Is there a faster way?', 'What should make me reach for this next time?'],

  moodProud: { title: 'All of them.', sub: 'Nothing in this set slowed you down — try a harder one.' },
  moodRest: { title: 'Done.', sub: 'Steady beats a burst. Same time tomorrow.' },
  moodSorry: { title: 'Close.', sub: "The ones you missed are queued for review — you'll see them again soon." },
  moodFocus: { title: 'Still thinking.', sub: 'Time spent is not wasted — note the step you stalled on, not the answer.' },
  moodAll: 'all correct',
  moodClose: 'close',
  moodThinking: 'thinking',
  completion: 'completion',
  gotRight: 'correct',
  dayStreak: 'day streak',
  perProblem: 'per problem',
  again: 'another set',
  home: 'home',
};

const ZH: typeof EN = {
  chaptersLabel: '章',
  progress: '進度',
  chapters: '章節',
  todaySet: (n: number) => `今天的 ${n} 題`,
  noPace: (done, total) =>
    `${done.toLocaleString()} / ${total.toLocaleString()} 題。還沒有足夠的紀錄可以估完成日 —— 先刷幾天。`,
  pace: (done, total, date, slack) =>
    `${done.toLocaleString()} / ${total.toLocaleString()} 題。照目前速度，${date}刷完${
      slack === null ? '。' : ` —— 面試前 ${slack} 天。`
    }`,
  reviewDesk: '校對台',

  difficulty: { easy: '簡單', medium: '中等', hard: '困難' },
  problemOf: (i, n) => `第 ${i}／${n} 題`,
  answer: '答案',
  answerHint: '可輸入 1/7、sqrt(pi)/2',
  hintN: (i, n) => `提示 ${i} / ${n}`,
  reveal: '先看解答',
  submit: '提交',
  next: '下一題',
  seeScore: '看成績',
  leaveSet: '離開這一組',
  correct: '答對',
  wrong: '答錯',
  revealed: '看了解答',

  writeUp: '寫推導 · 讓助教批改',
  derivation: '推導',
  collapse: '收起',
  preview: '預覽',
  gradeIt: '送出批改',
  grading: '批改中…',
  derivationPlaceholder: '把完整過程寫下來，數學用 LaTeX：\n\n設 $x, y \\sim U(0,1)$ 獨立…',
  didRight: '做對的地方',
  firstError: '第一個出錯的步驟',
  whyWrong: '為什麼錯',
  toRevisit: '要補的觀念',
  disagree: '我覺得我對',
  flagged: '已標記 —— 之後再回來看這題',

  tutor: '助教',
  noAnswers: '不給答案',
  fullDiscussion: '完整討論',
  tutorIdleThinking: '卡住的時候問這裡。這個階段助教不會直接給答案，只會問你問題把你推下一步。',
  tutorIdleReviewing: '答案已經揭曉了，這裡可以完整討論 —— 問你錯在哪、問有沒有更快的做法。',
  tutorPlaceholder: '可以直接寫 LaTeX，例如 $P(A\\mid B)$',
  thinking: '思考中…',
  suggestThinking: ['我卡住了，給我一個方向', '我想用這個設法，對嗎？', '這題在考什麼觀念？'],
  suggestReviewing: ['我當初錯在哪一步？', '有沒有更快的做法？', '下次遇到什麼特徵要想到這招？'],

  moodProud: { title: '全對。', sub: '這一組沒有一題卡住 —— 把難度往上調一階試試。' },
  moodRest: { title: '收工。', sub: '穩定推進比一次衝很多重要，明天同一個時間再來。' },
  moodSorry: { title: '差一點。', sub: '錯的那幾題已經排進複習了，最快明天會再遇到。' },
  moodFocus: { title: '還在想。', sub: '花時間不是壞事 —— 記下卡住的那一步，比記下答案有用。' },
  moodAll: '全對',
  moodClose: '差一點',
  moodThinking: '思考中',
  completion: '完成度',
  gotRight: '題答對',
  dayStreak: '天連續',
  perProblem: '平均／題',
  again: '再一組',
  home: '回首頁',
};

export function t(lang: Lang) {
  return lang === 'zh' ? ZH : EN;
}
export type Strings = typeof EN;
