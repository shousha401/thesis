import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * storageUrl decides whether a value out of the database becomes a URL the site
 * will render. It reads its Supabase configuration at module load, so each test
 * sets the environment and then imports a fresh copy of the module.
 */
async function loadStorageUrl(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return (await import('./data')).storageUrl;
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('storageUrl / local brand assets', () => {
  it('serves a /brand/ path as-is', async () => {
    const storageUrl = await loadStorageUrl();
    expect(storageUrl('thumbnails', '/brand/clip-placeholder-1.jpg')).toBe(
      '/brand/clip-placeholder-1.jpg',
    );
    expect(storageUrl('host-photos', '/brand/cover.jpg')).toBe('/brand/cover.jpg');
  });

  // The value comes from a database column. Any other absolute path is either a
  // typo or someone aiming the site at a file it should not serve, so it is
  // refused and the caller falls back to the cover art.
  it.each([
    ['a different public folder', '/uploads/secret.jpg'],
    ['the app root', '/favicon.ico'],
    ['a Next internal path', '/_next/static/chunks/main.js'],
    ['an API route', '/api/admin'],
    ['a bare slash', '/'],
    ['a protocol-relative URL', '//evil.example/x.jpg'],
    ['a lookalike prefix', '/brandx/thing.jpg'],
    ['a path that only contains /brand/ later', '/uploads/brand/thing.jpg'],
  ])('refuses %s', async (_label, path) => {
    const storageUrl = await loadStorageUrl();
    expect(storageUrl('thumbnails', path)).toBeNull();
  });

  it.each([
    ['traversal out of the folder', '/brand/../../etc/passwd'],
    ['traversal in the middle', '/brand/sub/../../secret.jpg'],
  ])('refuses %s', async (_label, path) => {
    const storageUrl = await loadStorageUrl();
    expect(storageUrl('thumbnails', path)).toBeNull();
  });

  it('treats an empty or missing path as no image', async () => {
    const storageUrl = await loadStorageUrl();
    expect(storageUrl('thumbnails', null)).toBeNull();
    expect(storageUrl('thumbnails', '')).toBeNull();
  });
});

describe('storageUrl / Supabase storage keys', () => {
  it('builds a public storage URL when Supabase is configured', async () => {
    const storageUrl = await loadStorageUrl({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example-ref.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    });

    expect(storageUrl('thumbnails', 'my-episode-123.jpg')).toBe(
      'https://example-ref.supabase.co/storage/v1/object/public/thumbnails/my-episode-123.jpg',
    );
    expect(storageUrl('host-photos', 'renata-456.webp')).toBe(
      'https://example-ref.supabase.co/storage/v1/object/public/host-photos/renata-456.webp',
    );
  });

  it('returns null for a storage key when Supabase is not configured', async () => {
    const storageUrl = await loadStorageUrl();
    expect(storageUrl('thumbnails', 'my-episode-123.jpg')).toBeNull();
  });

  it('still refuses a non-brand absolute path when Supabase IS configured', async () => {
    const storageUrl = await loadStorageUrl({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example-ref.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    });
    expect(storageUrl('thumbnails', '/uploads/secret.jpg')).toBeNull();
    expect(storageUrl('thumbnails', '/brand/cover.jpg')).toBe('/brand/cover.jpg');
  });
});
