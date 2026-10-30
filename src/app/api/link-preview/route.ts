import { getLinkPreview } from '@/lib/link-preview/service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const href = new URL(request.url).searchParams.get('href');
  if (!href || href.length > 2048) return Response.json({ error: 'Invalid link' }, { status: 400 });
  try {
    const preview = await getLinkPreview(href);
    if (preview === null) return new Response(null, { status: 204, headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } });
    if (!preview) return Response.json({ error: 'Preview unavailable' }, { status: 404 });
    return Response.json(preview, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } });
  } catch {
    return Response.json({ error: 'Preview unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
