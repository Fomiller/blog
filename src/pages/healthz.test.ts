import { describe, expect, it } from 'vitest';
import { GET } from './healthz';

describe('healthz', () => {
  it('answers 200 without reaching for anything else', async () => {
    const response = await GET({} as never);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
  });
});
