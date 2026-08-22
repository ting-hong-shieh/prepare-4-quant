import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Figures cropped out of the scan. Served through a route rather than from
// public/ for the same reason as the page images: they are the book's artwork
// and must not end up in a static build.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // Only ever a bare filename produced by ingest/crop_figure.py.
  if (!/^[a-zA-Z0-9._-]+\.png$/.test(name)) return new Response('bad name', { status: 400 });

  try {
    const buf = await readFile(path.join(process.cwd(), 'data', 'figures', name));
    return new Response(new Uint8Array(buf), {
      headers: { 'content-type': 'image/png', 'cache-control': 'private, max-age=3600' },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
