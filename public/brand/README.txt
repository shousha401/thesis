Drop the cover art here as:

    cover.jpg

It is referenced by BRAND_COVER in src/config/site.ts and is used as:

  - the default OpenGraph / Twitter card image for any page without its own,
  - the fallback thumbnail for an episode or clip with no thumbnail set.

Recommended: 1200 x 630 or larger, JPEG or WebP, under ~400 KB. If the source
art is square, export a 1200 x 630 crop for this file so link previews on
Instagram, X and iMessage are not letterboxed.

Until this file exists the site still builds; those slots fall back to a
generated placeholder.
