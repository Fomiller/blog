import { describe, expect, it } from 'vitest';
import type { Post } from './directus';
import { allTags, postsWithTags, selectedTags, tagsOf, toggleQuery } from './tags';

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

describe('selectedTags', () => {
  const known = ['cars', 'spain', 'travel'];

  it('reads repeated params and sorts them', () => {
    const params = new URLSearchParams('tag=travel&tag=spain');
    expect(selectedTags(params, known)).toEqual(['spain', 'travel']);
  });

  it('drops a tag nobody uses, so a stale link still shows something', () => {
    const params = new URLSearchParams('tag=travel&tag=atlantis');
    expect(selectedTags(params, known)).toEqual(['travel']);
  });

  it('collapses a repeat', () => {
    const params = new URLSearchParams('tag=cars&tag=cars');
    expect(selectedTags(params, known)).toEqual(['cars']);
  });

  it('is empty with no params', () => {
    expect(selectedTags(new URLSearchParams(), known)).toEqual([]);
  });
});

describe('postsWithTags', () => {
  const spain = post(['travel', 'spain'], 'spain');
  const japan = post(['travel', 'japan'], 'japan');
  const stew = post(['cooking'], 'stew');
  const posts = [spain, japan, stew];

  it('returns everything when nothing is selected', () => {
    expect(postsWithTags(posts, [])).toHaveLength(3);
  });

  it('narrows on one tag', () => {
    expect(postsWithTags(posts, ['travel']).map((p) => p.slug)).toEqual(['spain', 'japan']);
  });

  // The whole point of multi-select: each tag added narrows rather than widens.
  it('requires every selected tag, not any of them', () => {
    expect(postsWithTags(posts, ['travel', 'spain']).map((p) => p.slug)).toEqual(['spain']);
  });

  it('returns nothing when no entry carries the whole set', () => {
    expect(postsWithTags(posts, ['cooking', 'spain'])).toEqual([]);
  });
});

describe('toggleQuery', () => {
  it('adds a tag to the selection', () => {
    expect(toggleQuery(['travel'], 'spain')).toBe('/?tag=spain&tag=travel');
  });

  it('removes one that is already on', () => {
    expect(toggleQuery(['spain', 'travel'], 'spain')).toBe('/?tag=travel');
  });

  it('goes home when the last tag comes off', () => {
    expect(toggleQuery(['travel'], 'travel')).toBe('/');
  });

  it('escapes what a tag can legally contain', () => {
    expect(toggleQuery([], 'home & garden')).toBe('/?tag=home+%26+garden');
  });
});
