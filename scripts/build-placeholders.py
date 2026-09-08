"""
Generates branded placeholder thumbnails for the seed content.

    pip install Pillow
    python scripts/build-placeholders.py

Reads public/brand/cover.jpg and writes:

    public/brand/clip-placeholder-{1,2,3}.jpg      9:16, one per host
    public/brand/episode-placeholder-{1..5}.jpg    16:9, varied crops

Why: the seed videos are real third-party films, and letting the site fetch
their YouTube thumbnails would put someone else's artwork on the demo. These
are crops of the show's own cover instead, so nothing on a seeded site is
borrowed.

Crop boxes are fractions of the source, so replacing cover.jpg with a
higher-resolution export and re-running this produces the same framing.
"""

import sys
from pathlib import Path

from PIL import Image

SRC = Path("public/brand/cover.jpg")
OUT = Path("public/brand")

# (left, top, right, bottom) as fractions of the cover, each centred on one host.
CLIP_CROPS = [
    (0.10, 0.26, 0.46, 0.90),  # left host
    (0.32, 0.24, 0.68, 0.88),  # centre host
    (0.56, 0.24, 0.92, 0.88),  # right host
]

# Landscape crops for the episodes, varied so five cards do not look identical.
EPISODE_CROPS = [
    (0.06, 0.28, 0.94, 0.77),  # all three, wide
    (0.06, 0.30, 0.62, 0.61),  # left pair
    (0.38, 0.28, 0.96, 0.61),  # right pair
    (0.24, 0.26, 0.78, 0.56),  # centre host, closer
    (0.04, 0.06, 0.96, 0.58),  # includes some of the neon above
]

TARGET_PORTRAIT = (720, 1280)  # 9:16
TARGET_LANDSCAPE = (1280, 720)  # 16:9


def crop_to(image: Image.Image, box, target) -> Image.Image:
    """Crops to the fractional box, then covers the target size without distortion."""
    w, h = image.size
    region = image.crop(
        (int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))
    )

    tw, th = target
    scale = max(tw / region.width, th / region.height)
    resized = region.resize(
        (max(1, round(region.width * scale)), max(1, round(region.height * scale))),
        Image.LANCZOS,
    )

    left = (resized.width - tw) // 2
    top = (resized.height - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def main() -> int:
    if not SRC.exists():
        print(f"No cover at {SRC}. Add it first (see public/brand/README.txt).")
        return 1

    cover = Image.open(SRC).convert("RGB")
    print(f"source {SRC} {cover.size}")

    for i, box in enumerate(CLIP_CROPS, start=1):
        out = OUT / f"clip-placeholder-{i}.jpg"
        crop_to(cover, box, TARGET_PORTRAIT).save(
            out, "JPEG", quality=86, optimize=True, progressive=True
        )
        print(f"  {out.name}: {TARGET_PORTRAIT[0]}x{TARGET_PORTRAIT[1]}"
              f" {out.stat().st_size / 1024:.0f} KB")

    for i, box in enumerate(EPISODE_CROPS, start=1):
        out = OUT / f"episode-placeholder-{i}.jpg"
        crop_to(cover, box, TARGET_LANDSCAPE).save(
            out, "JPEG", quality=86, optimize=True, progressive=True
        )
        print(f"  {out.name}: {TARGET_LANDSCAPE[0]}x{TARGET_LANDSCAPE[1]}"
              f" {out.stat().st_size / 1024:.0f} KB")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
