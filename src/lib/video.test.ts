import { describe, expect, it } from 'vitest';
import { parseVideoUrl, type ParsedVideo } from './video';

/** Unwraps a success, failing the test with the error message if it parsed as invalid. */
function parsed(url: string): ParsedVideo {
  const result = parseVideoUrl(url);
  if (!result.ok) {
    throw new Error(`expected "${url}" to parse, got error: ${result.error}`);
  }
  return result.video;
}

/** Asserts a rejection and hands back the message so we can check it is useful. */
function rejected(url: unknown): string {
  const result = parseVideoUrl(url);
  if (result.ok) {
    throw new Error(
      `expected "${String(url)}" to be rejected, but it parsed as ` +
        `${result.video.provider}:${result.video.id}`,
    );
  }
  return result.error;
}

const YT_ID = 'aqz-KE-bpKQ';

describe('parseVideoUrl / YouTube', () => {
  it.each([
    ['watch', `https://www.youtube.com/watch?v=${YT_ID}`],
    ['watch, no www', `https://youtube.com/watch?v=${YT_ID}`],
    ['watch on mobile', `https://m.youtube.com/watch?v=${YT_ID}`],
    ['youtu.be short link', `https://youtu.be/${YT_ID}`],
    ['shorts', `https://www.youtube.com/shorts/${YT_ID}`],
    ['live', `https://www.youtube.com/live/${YT_ID}`],
    ['embed', `https://www.youtube.com/embed/${YT_ID}`],
    ['legacy /v/', `https://www.youtube.com/v/${YT_ID}`],
    ['nocookie embed', `https://www.youtube-nocookie.com/embed/${YT_ID}`],
    ['music.youtube', `https://music.youtube.com/watch?v=${YT_ID}`],
    ['http, not https', `http://www.youtube.com/watch?v=${YT_ID}`],
    ['no protocol at all', `youtube.com/watch?v=${YT_ID}`],
  ])('parses %s', (_label, url) => {
    expect(parsed(url).id).toBe(YT_ID);
    expect(parsed(url).provider).toBe('youtube');
  });

  it.each([
    ['timestamp', `https://youtu.be/${YT_ID}?t=42`],
    ['timestamp with units', `https://www.youtube.com/watch?v=${YT_ID}&t=1m30s`],
    ['share-sheet tracking param', `https://youtu.be/${YT_ID}?si=abcDEF123`],
    ['playlist context', `https://www.youtube.com/watch?v=${YT_ID}&list=PL123&index=4`],
    ['shorts with feature param', `https://www.youtube.com/shorts/${YT_ID}?feature=share`],
    ['live with si param', `https://www.youtube.com/live/${YT_ID}?si=xyz`],
    ['everything at once', `https://www.youtube.com/watch?v=${YT_ID}&list=PL1&t=90&si=q&pp=x`],
    ['trailing whitespace from a paste', `  https://youtu.be/${YT_ID}  `],
  ])('strips %s', (_label, url) => {
    expect(parsed(url).id).toBe(YT_ID);
  });

  it('builds a cookie-free embed URL with no autoplay', () => {
    const video = parsed(`https://www.youtube.com/watch?v=${YT_ID}`);
    expect(video.embedUrl).toBe(`https://www.youtube-nocookie.com/embed/${YT_ID}`);
    expect(video.embedUrl).not.toContain('autoplay');
  });

  it('canonicalises every form to the same stored URL', () => {
    const forms = [
      `https://youtu.be/${YT_ID}?t=42&si=track`,
      `https://www.youtube.com/shorts/${YT_ID}`,
      `https://m.youtube.com/watch?v=${YT_ID}&list=PL1`,
    ];
    for (const form of forms) {
      expect(parsed(form).canonicalUrl).toBe(`https://www.youtube.com/watch?v=${YT_ID}`);
    }
  });

  it('offers a thumbnail and a fallback, because maxres does not always exist', () => {
    const video = parsed(`https://youtu.be/${YT_ID}`);
    expect(video.thumbnailUrl).toBe(`https://i.ytimg.com/vi/${YT_ID}/maxresdefault.jpg`);
    expect(video.thumbnailFallbackUrl).toBe(`https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg`);
  });

  it('preserves ids that look like they need escaping', () => {
    expect(parsed('https://youtu.be/_-aBcDeF-_1').id).toBe('_-aBcDeF-_1');
  });

  it.each([
    ['a channel page', 'https://www.youtube.com/@somechannel'],
    ['a playlist', 'https://www.youtube.com/playlist?list=PL1234567890'],
    ['watch with no v param', 'https://www.youtube.com/watch?list=PL123'],
    ['an id that is too short', 'https://youtu.be/abc123'],
    ['an id that is too long', 'https://youtu.be/aqz-KE-bpKQextra'],
    ['an id with illegal characters', 'https://www.youtube.com/watch?v=abc!@#$%^&*('],
    ['the bare domain', 'https://www.youtube.com'],
  ])('rejects %s', (_label, url) => {
    expect(rejected(url)).toBeTruthy();
  });

  it('tells the host what to do when they paste a channel link', () => {
    expect(rejected('https://www.youtube.com/@somechannel')).toMatch(/single video|video itself/i);
  });
});

describe('parseVideoUrl / Instagram', () => {
  const CODE = 'CxYz123AbCd';

  it.each([
    ['a reel', `https://www.instagram.com/reel/${CODE}/`],
    ['a reel with no trailing slash', `https://www.instagram.com/reel/${CODE}`],
    ['the plural reels path', `https://www.instagram.com/reels/${CODE}/`],
    ['a feed post', `https://www.instagram.com/p/${CODE}/`],
    ['an IGTV post', `https://www.instagram.com/tv/${CODE}/`],
    ['a username-scoped reel', `https://www.instagram.com/shesgotathesis/reel/${CODE}/`],
    ['share tracking params', `https://www.instagram.com/reel/${CODE}/?igsh=NTc4MTIwNjQ2YQ==`],
    ['utm params', `https://www.instagram.com/p/${CODE}/?utm_source=ig_web_copy_link`],
  ])('parses %s', (_label, url) => {
    const video = parsed(url);
    expect(video.provider).toBe('instagram');
    expect(video.id).toBe(CODE);
  });

  it('normalises the plural /reels/ path to /reel/ for embedding', () => {
    expect(parsed(`https://www.instagram.com/reels/${CODE}/`).embedUrl).toBe(
      `https://www.instagram.com/reel/${CODE}/embed`,
    );
  });

  it('returns no thumbnail, which forces the admin to upload one', () => {
    const video = parsed(`https://www.instagram.com/reel/${CODE}/`);
    expect(video.thumbnailUrl).toBeNull();
    expect(video.thumbnailFallbackUrl).toBeNull();
  });

  it.each([
    ['a profile', 'https://www.instagram.com/shesgotathesis/'],
    ['the audio browsing page', 'https://www.instagram.com/reels/audio/12345/'],
    ['the bare domain', 'https://www.instagram.com'],
  ])('rejects %s', (_label, url) => {
    expect(rejected(url)).toBeTruthy();
  });
});

describe('parseVideoUrl / TikTok', () => {
  const ID = '7234567890123456789';

  it.each([
    ['a full video link', `https://www.tiktok.com/@shesgotathesis/video/${ID}`],
    ['no www', `https://tiktok.com/@shesgotathesis/video/${ID}`],
    ['with tracking params', `https://www.tiktok.com/@user/video/${ID}?is_from_webapp=1&sender_device=pc`],
    ['on mobile', `https://m.tiktok.com/@user/video/${ID}`],
  ])('parses %s', (_label, url) => {
    const video = parsed(url);
    expect(video.provider).toBe('tiktok');
    expect(video.id).toBe(ID);
    expect(video.embedUrl).toBe(`https://www.tiktok.com/embed/v2/${ID}`);
  });

  it('keeps the @handle in the canonical URL', () => {
    expect(parsed(`https://www.tiktok.com/@shesgotathesis/video/${ID}`).canonicalUrl).toBe(
      `https://www.tiktok.com/@shesgotathesis/video/${ID}`,
    );
  });

  // Short links are an opaque redirect. We refuse rather than saving a row that
  // cannot be embedded, and the message has to tell a non-technical host what
  // to do instead.
  it.each([
    ['vm.tiktok.com', 'https://vm.tiktok.com/ZMhqPxYzK/'],
    ['vt.tiktok.com', 'https://vt.tiktok.com/ZSjqPxYzK/'],
    ['the /t/ short form', 'https://www.tiktok.com/t/ZTdqPxYzK/'],
  ])('rejects the %s short link with instructions', (_label, url) => {
    const error = rejected(url);
    expect(error).toMatch(/full link/i);
    expect(error).toMatch(/tiktok\.com\/@/);
  });

  it.each([
    ['a profile', 'https://www.tiktok.com/@shesgotathesis'],
    ['a non-numeric id', 'https://www.tiktok.com/@user/video/not-a-number'],
    ['the bare domain', 'https://www.tiktok.com'],
  ])('rejects %s', (_label, url) => {
    expect(rejected(url)).toBeTruthy();
  });
});

describe('parseVideoUrl / failing closed', () => {
  it.each([
    ['a plain string', 'this is just a sentence'],
    ['an empty string', ''],
    ['only whitespace', '   '],
    ['a bare word that looks like a slug', 'episode-one'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
    ['a file path', 'C:\\Users\\me\\video.mp4'],
  ])('rejects %s', (_label, input) => {
    expect(rejected(input)).toBeTruthy();
  });

  it.each([
    ['Vimeo', 'https://vimeo.com/123456789'],
    ['Twitch', 'https://www.twitch.tv/videos/123456789'],
    ['a direct mp4', 'https://example.com/video.mp4'],
    ['Spotify', 'https://open.spotify.com/episode/abc123'],
    ['a lookalike domain', 'https://youtube.com.evil.example/watch?v=aqz-KE-bpKQ'],
  ])('rejects the unsupported provider %s and names it', (_label, url) => {
    expect(rejected(url)).toMatch(/not supported/i);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['an object', { url: 'https://youtu.be/aqz-KE-bpKQ' }],
  ])('rejects the non-string %s instead of throwing', (_label, input) => {
    expect(() => parseVideoUrl(input)).not.toThrow();
    expect(rejected(input)).toBeTruthy();
  });

  it('never returns a partial object: a failure carries no video fields', () => {
    const result = parseVideoUrl('https://vimeo.com/123456789');
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('video');
    expect(Object.keys(result).sort()).toEqual(['error', 'ok']);
  });

  it('always produces an error message a non-technical person can act on', () => {
    const inputs = [
      '',
      'nonsense',
      'https://vimeo.com/1',
      'https://vm.tiktok.com/ZM1/',
      'https://www.youtube.com/@channel',
      'https://www.instagram.com/profile/',
    ];
    for (const input of inputs) {
      const error = rejected(input);
      expect(error.length).toBeGreaterThan(20);
      // No stack traces, no exception jargon leaking into the admin form.
      expect(error).not.toMatch(/undefined|null|TypeError|Invalid URL/);
    }
  });
});

describe('parseVideoUrl / result shape', () => {
  it('returns exactly the documented keys on success', () => {
    const result = parseVideoUrl('https://youtu.be/aqz-KE-bpKQ');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.video).sort()).toEqual([
      'canonicalUrl',
      'embedUrl',
      'id',
      'provider',
      'thumbnailFallbackUrl',
      'thumbnailUrl',
    ]);
  });

  it('only ever reports a provider the database accepts', () => {
    const urls = [
      'https://youtu.be/aqz-KE-bpKQ',
      'https://www.instagram.com/reel/CxYz123AbCd/',
      'https://www.tiktok.com/@u/video/7234567890123456789',
    ];
    for (const url of urls) {
      expect(['youtube', 'instagram', 'tiktok']).toContain(parsed(url).provider);
    }
  });
});
