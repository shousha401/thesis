import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveAspect, imageDimensions, safeFileStem, type MediaFields } from './media';

/**
 * imageDimensions parses binary headers by hand, so it is tested against the
 * real generated brand images rather than synthetic bytes.
 */
describe('imageDimensions', () => {
  it.each([
    ['public/brand/clip-placeholder-1.jpg', 720, 1280],
    ['public/brand/clip-placeholder-2.jpg', 720, 1280],
    ['public/brand/episode-placeholder-1.jpg', 1280, 720],
    ['public/brand/cover-og.jpg', 1200, 630],
  ])('reads %s', (path, width, height) => {
    expect(imageDimensions(readFileSync(path))).toEqual({ width, height });
  });

  it('reads a PNG', () => {
    // 2x2 PNG.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
      'base64',
    );
    expect(imageDimensions(png)).toEqual({ width: 2, height: 2 });
  });

  it('returns null for something that is not an image', () => {
    expect(imageDimensions(Buffer.from('not an image at all, just text'))).toBeNull();
  });

  it('does not throw on a truncated file', () => {
    const truncated = readFileSync('public/brand/cover.jpg').subarray(0, 40);
    expect(() => imageDimensions(truncated)).not.toThrow();
  });
});

describe('deriveAspect', () => {
  const base: MediaFields = {
    provider: 'youtube',
    videoId: 'aqz-KE-bpKQ',
    canonicalUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnailPath: null,
    thumbnailAlt: null,
    isVertical: false,
    uploadedIsPortrait: null,
  };

  it('is landscape for an ordinary YouTube video', () => {
    expect(deriveAspect(base)).toBe('landscape');
  });

  it('is portrait for a Short, Reel or TikTok', () => {
    expect(deriveAspect({ ...base, isVertical: true })).toBe('portrait');
  });

  // The picture the hosts chose wins over what the URL implies.
  it('follows an uploaded portrait image even on a landscape URL', () => {
    expect(deriveAspect({ ...base, uploadedIsPortrait: true })).toBe('portrait');
  });

  it('follows an uploaded landscape image even on a vertical URL', () => {
    expect(deriveAspect({ ...base, isVertical: true, uploadedIsPortrait: false })).toBe(
      'landscape',
    );
  });
});

describe('safeFileStem', () => {
  it('folds accents and strips anything a URL would have to escape', () => {
    expect(safeFileStem('Café Después: Año Uno!')).toBe('cafe-despues-ano-uno');
    expect(safeFileStem('   ')).toBe('upload');
  });
});
