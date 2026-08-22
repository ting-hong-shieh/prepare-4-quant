import { disputeDerivation } from '@/lib/queries';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    disputeDerivation(Number(id));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
