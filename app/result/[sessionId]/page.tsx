import { notFound } from 'next/navigation';
import ResultClient from '@/components/ResultClient';
import { getOverview, getSessionResult } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function ResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const id = Number(sessionId);
  if (!Number.isInteger(id)) notFound();

  const result = getSessionResult(id);
  if (!result.answered) notFound();
  const overview = getOverview();

  // The percent before this session, so the card can show the step it moved.
  const before = overview.totalProblems
    ? Math.round(((overview.doneProblems - result.answered) / overview.totalProblems) * 100)
    : 0;

  return (
    <ResultClient
      result={result}
      percentBefore={Math.max(0, before)}
      percentAfter={overview.percent}
      streakDays={overview.streakDays}
    />
  );
}
