import { describe, expect, it } from 'vitest';
import type { Post } from './directus';
import { allTags, postsWithTag, tagsOf } from './tags';

function post(tags: Post['tags'], slug = 'x'): Post {
  return {
    id: 1,
    title: 'x',
    slug,
    excerpt: null,
    content: null,
    cover: null,
    tags,
    published_at: null,
    date_updated: null,
  };
}

describe('tagsOf', () => {
  it('reads a plain list', () => {
    expect(tagsOf(post(['cars', 'code']))).toEqual(['cars', 'code']);
  });

  it('survives what Directus actually allows in a json field', () => {
    // The field is free JSON, so a hand-edited entry can hold anything.
    const messy = [' cars ', '', null, 7, 'code'] as unknown as Post['tags'];
    expect(tagsOf(post(messy))).toEqual(['cars', 'code']);
  });

  it('treats a missing list as no tags', () => {
    expect(tagsOf(post(null))).toEqual([]);
  });
});

describe('allTags', () => {
  it('deduplicates and sorts across every entry', () => {
    const posts = [post(['travel', 'cars']), post(['cars', 'cooking'])];
    expect(allTags(posts)).toEqual(['cars', 'cooking', 'travel']);
  });
});

describe('postsWithTag', () => {
  const posts = [post(['cars'], 'a'), post(['cooking'], 'b'), post(null, 'c')];

  it('returns everything when no tag is asked for', () => {
    expect(postsWithTag(posts, null)).toHaveLength(3);
  });

  it('keeps only entries carrying the tag', () => {
    expect(postsWithTag(posts, 'cars').map((p) => p.slug)).toEqual(['a']);
  });

  it('matches exactly, so one tag is not a prefix of another', () => {
    expect(postsWithTag(posts, 'car')).toEqual([]);
  });
});
