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
// otherwise choosing a tag collapses the list to that one tag and there is no
// way back to the others.
export function allTags(posts: Post[]): string[] {
  const seen = new Set<string>();
  for (const post of posts) {
    for (const tag of tagsOf(post)) seen.add(tag);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export function postsWithTag(posts: Post[], tag: string | null): Post[] {
  if (!tag) return posts;
  return posts.filter((post) => tagsOf(post).includes(tag));
}
