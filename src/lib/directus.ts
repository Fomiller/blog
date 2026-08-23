// astro:env, not import.meta.env: the latter is substituted at build time, so
// a value set on the container would never be seen. These are read at runtime
// and validated when the server starts.
import { DIRECTUS_TOKEN, DIRECTUS_URL } from 'astro:env/server';

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover: string | null;
  tags: string[] | null;
  published_at: string | null;
  date_updated: string | null;
}

const LIST_FIELDS = 'id,title,slug,excerpt,cover,tags,published_at,date_updated';
const ONE_FIELDS = `${LIST_FIELDS},content`;

function headers(): HeadersInit {
  return DIRECTUS_TOKEN ? { authorization: `Bearer ${DIRECTUS_TOKEN}` } : {};
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params);
  const response = await fetch(`${DIRECTUS_URL}${path}?${query}`, { headers: headers() });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  const body = (await response.json()) as { data: T };
  return body.data;
}

// status is filtered here rather than by the token's policy because Directus
// Community allows no row filters on permissions. The token narrows *who* can
// read; this narrows *what* the site shows.
export function listPosts(): Promise<Post[]> {
  return get<Post[]>('/items/posts', {
    fields: LIST_FIELDS,
    'filter[status][_eq]': 'published',
    sort: '-published_at',
    limit: '100',
  });
}

export async function getPost(slug: string): Promise<Post | null> {
  const posts = await get<Post[]>('/items/posts', {
    fields: ONE_FIELDS,
    'filter[status][_eq]': 'published',
    'filter[slug][_eq]': slug,
    limit: '1',
  });
  return posts[0] ?? null;
}

// The browser cannot reach Directus: it is in-cluster only, and cms.fomiller.com
// sits behind Cloudflare Access. Images are proxied through /assets/[id], which
// calls this.
export function fetchAsset(id: string, search: string): Promise<Response> {
  const query = search ? `?${search}` : '';
  return fetch(`${DIRECTUS_URL}/assets/${id}${query}`, { headers: headers() });
}
