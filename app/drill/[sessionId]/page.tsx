import { notFound } from 'next/navigation';
import DrillClient from '@/components/DrillClient';
import { getSession } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DrillPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const id = Number(sessionId);
  if (!Number.isInteger(id)) notFound();

  let session;
  try {
    session = getSession(id);
  } catch {
    notFound();
  }
  if (!session.items.length) notFound();

  return <DrillClient sessionId={id} items={session.items} />;
}
