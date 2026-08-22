import { notFound } from 'next/navigation';
import DrillClient from '@/components/DrillClient';
import { localise } from '@/lib/i18n';
import { getLanguage, getSession } from '@/lib/queries';

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

  const lang = getLanguage();
  // Localise here, not in the client: only the chosen language crosses the wire.
  const items = session.items.map(i => ({
    attemptId: i.attemptId,
    ordinal: i.ordinal,
    problem: localise(i.problem, lang),
  }));

  return <DrillClient sessionId={id} items={items} lang={lang} />;
}
