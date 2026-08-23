import type { APIRoute } from 'astro';
import { fetchAsset } from '../../lib/directus';

export const prerender = false;

// Directus is not reachable from a browser, so an <img> pointing straight at it
// would 404 for every reader. This forwards the request with the site's own
// credential and streams the bytes back.
export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response('not found', { status: 404 });
  }

  // Directus transform params (width, height, fit, quality, key) pass through,
  // so a page can ask for a thumbnail without the blog knowing the sizes.
  const search = new URL(request.url).search.replace(/^\?/, '');

  let upstream: Response;
  try {
    upstream = await fetchAsset(id, search);
  } catch {
    return new Response('upstream unavailable', { status: 502 });
  }

  if (!upstream.ok) {
    return new Response('not found', { status: upstream.status === 403 ? 404 : upstream.status });
  }

  const headers = new Headers();
  const type = upstream.headers.get('content-type');
  if (type) headers.set('content-type', type);
  const length = upstream.headers.get('content-length');
  if (length) headers.set('content-length', length);
  // Directus asset IDs are immutable, and a transform is part of the URL, so a
  // long cache is safe. Editing a post never changes an existing asset's bytes.
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(upstream.body, { status: 200, headers });
};
