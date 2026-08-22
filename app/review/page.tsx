import ReviewClient from '@/components/ReviewClient';
import { listForReview, reviewCounts } from '@/lib/reviewQueries';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams;
  const showAll = all === '1';
  return <ReviewClient rows={listForReview(showAll)} counts={reviewCounts()} showAll={showAll} />;
}
