import type { Post } from './directus';

// Directus stores tags as free JSON, so a hand-edited entry can hold a null, a
// number, or a stray blank. Everything downstream assumes a clean string list.
export function tagsOf(post: Post): string[] {
  if (!Array.isArray(post.tags)) return [];
  return post.tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

// Every tag in the garden, not just the ones surviving the current filter —
// otherwise choosing a tag hides the rest and there is no way to add a second.
export function allTags(posts: Post[]): string[] {
  const seen = new Set<string>();
  for (const post of posts) {
    for (const tag of tagsOf(post)) seen.add(tag);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

// Repeated ?tag= params. Unknown ones are dropped rather than treated as a
// filter nothing satisfies, so a stale link still shows something. Sorted so
// the same selection is always the same URL.
export function selectedTags(params: URLSearchParams, known: string[]): string[] {
  const wanted = new Set(params.getAll('tag').filter((tag) => known.includes(tag)));
  return [...wanted].sort((a, b) => a.localeCompare(b));
}

// Every selected tag must be present, so each one narrows. Selecting travel
// and spain means entries about travel in spain, not entries about either.
export function postsWithTags(posts: Post[], tags: string[]): Post[] {
  if (tags.length === 0) return posts;
  return posts.filter((post) => {
    const has = new Set(tagsOf(post));
    return tags.every((tag) => has.has(tag));
  });
}

// The query string a tag's own link points at: the current selection with that
// tag added, or removed if it is already on. That is what makes each tag a
// toggle rather than a jump to a single-tag view.
export function toggleQuery(selected: string[], tag: string): string {
  const next = selected.includes(tag)
    ? selected.filter((t) => t !== tag)
    : [...selected, tag].sort((a, b) => a.localeCompare(b));

  if (next.length === 0) return '/';

  const params = new URLSearchParams();
  for (const t of next) params.append('tag', t);
  return `/?${params}`;
}
