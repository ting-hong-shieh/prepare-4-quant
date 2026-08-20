'use client';
import dynamic from 'next/dynamic';

// WebGL only exists in the browser; render nothing server-side and keep the
// 330px band reserved so the page does not jump when the scene arrives.
const QuantToon3D = dynamic(() => import('./QuantToon3D'), {
  ssr: false,
  loading: () => <div style={{ height: 330 }} />,
});

export default function HomeScene({ done, total, sky }: { done: number; total: number; sky: number }) {
  return <QuantToon3D done={done} total={total} sky={sky} mode="dark" height={330} />;
}
