import type { APIRoute } from 'astro';

export const prerender = false;

// Deliberately reads nothing. A CMS outage must not roll the pods.
export const GET: APIRoute = () =>
  new Response('ok', {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
