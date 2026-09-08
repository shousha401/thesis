import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isShortVideoUrl,
  parseVideoUrlResolvingShortLinks,
} from './resolve-short-url';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

/** Stands in for the network so the tests are deterministic. */
function stubFetch(impl: (url: string) => Promise<{ url: string }> | never) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) =>
    impl(String(input)),
  ) as unknown as typeof fetch;
}

describe('isShortVideoUrl', () => {
  it.each([
    'https://vm.tiktok.com/ZMhqPxYzK/',
    'https://vt.tiktok.com/ZSjqPxYzK/',
    'https://www.tiktok.com/t/ZTdqPxYzK/',
    'https://tiktok.com/t/ZTdqPxYzK/',
  ])('recognises %s as a short link', (url) => {
    expect(isShortVideoUrl(url)).toBe(true);
  });

  it.each([
    'https://www.tiktok.com/@user/video/7234567890123456789',
    'https://youtu.be/aqz-KE-bpKQ',
    'https://www.instagram.com/reel/CxYz123AbCd/',
    'not a url',
    '',
  ])('does not treat %s as a short link', (url) => {
    expect(isShortVideoUrl(url)).toBe(false);
  });
});

describe('parseVideoUrlResolvingShortLinks', () => {
  it('does not touch the network for a normal URL', async () => {
    stubFetch(() => {
      throw new Error('fetch should not have been called');
    });

    const { result, log } = await parseVideoUrlResolvingShortLinks(
      'https://youtu.be/aqz-KE-bpKQ',
    );

    expect(result.ok).toBe(true);
    expect(log.outcome).toBe('not-a-short-link');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('resolves a vm.tiktok.com link and parses the destination', async () => {
    stubFetch(async () => ({
      url: 'https://www.tiktok.com/@shesgotathesis/video/7234567890123456789',
    }));

    const { result, log } = await parseVideoUrlResolvingShortLinks(
      'https://vm.tiktok.com/ZMhqPxYzK/',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.video.provider).toBe('tiktok');
    expect(result.video.id).toBe('7234567890123456789');
    expect(log).toMatchObject({ outcome: 'resolved' });
    expect(log.to).toContain('/video/7234567890123456789');
  });

  it('resolves the tiktok.com/t/ form too', async () => {
    stubFetch(async () => ({
      url: 'https://www.tiktok.com/@user/video/7000000000000000001',
    }));

    const { result } = await parseVideoUrlResolvingShortLinks(
      'https://www.tiktok.com/t/ZTdqPxYzK/',
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.video.id).toBe('7000000000000000001');
  });

  // The whole point of failing soft: a network problem must surface as the
  // parser's plain-English instruction, never as a fetch error.
  it('falls back to the parser message when the redirect fails', async () => {
    stubFetch(() => {
      throw new Error('ENOTFOUND vm.tiktok.com');
    });

    const { result, log } = await parseVideoUrlResolvingShortLinks(
      'https://vm.tiktok.com/ZMhqPxYzK/',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/full link/i);
    expect(result.error).not.toMatch(/ENOTFOUND|fetch|Error/);
    expect(log.outcome).toBe('failed');
  });

  it('falls back when the short link does not actually redirect', async () => {
    stubFetch(async (url) => ({ url }));

    const { result, log } = await parseVideoUrlResolvingShortLinks(
      'https://vm.tiktok.com/ZMhqPxYzK/',
    );

    expect(result.ok).toBe(false);
    expect(log.outcome).toBe('failed');
    expect(log.detail).toBe('no redirect followed');
  });

  it('reports a failure when the redirect lands somewhere unsupported', async () => {
    stubFetch(async () => ({ url: 'https://vimeo.com/123456789' }));

    const { result } = await parseVideoUrlResolvingShortLinks(
      'https://vm.tiktok.com/ZMhqPxYzK/',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not supported/i);
  });
});
