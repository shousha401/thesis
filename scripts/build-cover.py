"""
Rebuilds the two brand images from a source cover file.

    pip install Pillow
    python scripts/build-cover.py path/to/source.jpg

Produces:
    public/brand/cover.jpg      the artwork, trimmed square. Thumbnail fallback.
    public/brand/cover-og.jpg   1200x630, the same artwork framed on the plum
                                base. Used for link previews.

Why the second file: link previews are 1.91:1 and the cover is square. Letting a
platform centre-crop it slices the wordmark off the top and the "Listen. Learn.
Level Up." strip off the bottom, so the whole cover is framed instead.

The source is often a screenshot with white margins and a caption underneath, so
the artwork bounds are detected rather than assumed.
"""

import sys
from pathlib import Path

from PIL import Image

PLUM = (0x2A, 0x12, 0x20)
OUT = Path("public/brand")


def artwork_bounds(im: Image.Image) -> tuple[int, int, int, int]:
    """Finds the non-white artwork block, ignoring any caption below it."""
    w, h = im.size
    px = im.load()

    def is_white(xy):
        r, g, b = px[xy]
        return r > 235 and g > 235 and b > 235

    def row_is_blank(y):
        return all(is_white((x, y)) for x in range(0, w, 5))

    def col_is_blank(x):
        return all(is_white((x, y)) for y in range(0, h, 5))

    content_rows = [y for y in range(h) if not row_is_blank(y)]
    content_cols = [x for x in range(w) if not col_is_blank(x)]
    if not content_rows or not content_cols:
        return (0, 0, w, h)

    def longest_run(values):
        best = current = [values[0]]
        for v in values[1:]:
            if v == current[-1] + 1:
                current.append(v)
            else:
                if len(current) > len(best):
                    best = current
                current = [v]
        return best if len(best) > len(current) else current

    rows = longest_run(content_rows)
    cols = longest_run(content_cols)
    return (cols[0], rows[0], cols[-1] + 1, rows[-1] + 1)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    source = Path(sys.argv[1])
    if not source.exists():
        print(f"No such file: {source}")
        return 1

    im = Image.open(source).convert("RGB")
    box = artwork_bounds(im)
    art = im.crop(box)
    print(f"source {im.size} -> artwork {art.size} at {box}")

    OUT.mkdir(parents=True, exist_ok=True)
    art.save(OUT / "cover.jpg", "JPEG", quality=88, optimize=True, progressive=True)

    og = Image.new("RGB", (1200, 630), PLUM)
    side = 630
    scaled = art.resize((side, side), Image.LANCZOS)
    og.paste(scaled, ((1200 - side) // 2, 0))
    # Baseline, NOT progressive. WhatsApp's link-preview fetcher does not
    # reliably decode progressive JPEGs and silently shows no card. Every other
    # image here goes through next/image, which re-encodes; this one is fetched
    # raw by crawlers, so it has to be the safe encoding.
    og.save(OUT / "cover-og.jpg", "JPEG", quality=88, optimize=True, progressive=False)

    for name in ("cover.jpg", "cover-og.jpg"):
        path = OUT / name
        print(f"  {name}: {Image.open(path).size} {path.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
