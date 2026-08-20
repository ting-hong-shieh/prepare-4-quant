import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Serves a rendered scan page to the proofreading screen. The pages live in
// data/pages rather than public/ on purpose: the scan is one reader's copy of a
// licensed book and must never end up in a static build or a repo.
export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 1 || page > 9999) {
    return new Response('bad page', { status: 400 });
  }
  const file = path.join(process.cwd(), 'data', 'pages', `p${String(page).padStart(4, '0')}.png`);
  try {
    const buf = await readFile(file);
    return new Response(new Uint8Array(buf), {
      headers: { 'content-type': 'image/png', 'cache-control': 'private, max-age=3600' },
    });
  } catch {
    return new Response('not rendered', { status: 404 });
  }
}
