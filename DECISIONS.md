# Decisions

Choices made that the brief did not specify. Grouped by the build step that
produced them. Anything marked **OPEN** still needs action.

---

## Open items

### TODO before launch: official platform icons

`src/components/icons.tsx` contains geometric stand-ins for the YouTube,
Spotify, Apple Podcasts, Instagram and TikTok marks, drawn from primitives.
They read correctly at a glance but are not the licensed artwork. The client is
supplying the official marks from each platform's brand/press kit; swap them
into that one file, keeping the same component names and the `currentColor`
fill so the hover states keep working.

### OPEN: magic-link email delivery is not yet verified

Everything *around* the magic link is verified (see below). The one leg that is
not is the email itself: this project still uses Supabase's built-in SMTP, which
is rate limited to roughly two messages an hour and refuses with "email rate
limit exceeded". Every attempt to create a user through the Auth API during
testing hit that limit.

**To close it:** configure Resend as custom SMTP (README section 5), then sign
in at `/admin/login` with an allow-listed address and confirm the email arrives
and the link works. This is the last unverified path in the build.

### RESOLVED: allow-list enforcement, verified end to end

Both manual checks the client asked for, run against the real project with real
GoTrue-issued sessions:

- **An allow-listed user gets in.** Signed in, reached `/admin`, created an
  episode, edited it, published, unpublished and deleted it. Every step took
  effect on the public site without a rebuild.
- **A non-allow-listed user is turned away.** A signed-in user whose email is
  not in `admins` was redirected to `/admin/not-authorized` from `/admin`,
  `/admin/episodes` and `/admin/episodes/new`, and the friendly page rendered.
  The same user attempting a direct API insert was refused by RLS
  ("new row violates row-level security policy"), and could read only the five
  published episodes.
- An unauthenticated request to `/admin` redirects to `/admin/login`.

The sessions were minted by signing in through Supabase Auth and injecting the
resulting cookies into the browser, because email delivery was rate limited.
The tokens were genuine and the guard was exercised for real; only the delivery
of the link by email is untested (see the OPEN item above).

### RESOLVED: RLS and storage verified against the real project

Step 1 was originally validated on a throwaway Neon Postgres with `auth` and
`storage` stubbed. That has now been redone against the real hosted Supabase
project, with the schema and seed applied and nothing stubbed.

`npm run verify:rls` - 33 checks, all passing. Three identities, all holding
genuine GoTrue-issued JWTs:

- `is_admin()` resolves true for an allow-listed user and false for another,
  against real `auth.users` rows.
- Admin can insert, update and see drafts; slug generation and `updated_at`
  fire through the API.
- A draft created by the admin is invisible to anonymous visitors and to a
  signed-in non-admin, including when fetched directly by id.
- The `admins` table is unreadable by both (it holds personal addresses).
- Ten write attempts across the two non-admin identities: all refused.
- Storage: admin can upload; non-admin and anonymous cannot; uploads are
  publicly readable (needed by `next/image`); a non-admin cannot delete.
- The `CHECK` constraints still bite through PostgREST: an image without alt
  text and a published row without a date are both rejected.

`npm run verify:supabase` - 21 further anonymous-access checks, all passing.

**No behavioural difference from the Neon dry-run.** Every policy behaved
identically. The stubs were faithful; the real run additionally proved the parts
they could not - Storage API enforcement and `is_admin()` against real auth rows.

Two environment-specific findings, neither a policy problem:

1. Supabase blocks direct `DELETE` on `storage.objects` with a trigger, so
   teardown must go through the Storage API. The first verification run left
   test rows behind because one failed cleanup statement aborted the rest;
   teardown is now step-independent and confirms it is clean.
2. The project's shared SMTP is rate limited to a couple of emails an hour, so
   `auth.signUp` is refused with "email rate limit exceeded". The script falls
   back to writing `auth.users` + `auth.identities` itself and prints which
   route it took. Sign-in always goes through Auth either way, so the tokens
   under test are genuine. (Four GoTrue token columns default to NULL but are
   scanned into non-nullable Go strings; they must be set to `''` or every
   sign-in fails with "Database error querying schema".)

The public pages now read from Supabase. Rendered output was diffed against the
fixture rendering for Home, Episodes and an episode page: **byte-identical**.

## Step 1 - schema, migrations, RLS, seed

### No service-role key exists anywhere in this project

The admin dashboard authenticates as the signed-in user and is authorised by RLS.
The service role key bypasses RLS entirely, so one mistake with it exposes or
destroys everything, and it removes the database's ability to defend itself
against an application bug. `.env.example` documents its deliberate absence.

Consequence for step 4: every admin write must go through a session-bound client.
There is no escape hatch, by design.

### Alt text is enforced by the database, not just the form

The brief requires alt text on uploaded images. Rather than trusting a form
validator, `hosts.photo_alt` and `episodes/clips.thumbnail_alt` are columns with
`CHECK` constraints that reject any row carrying an image path without non-empty
alt text. A future contributor cannot accidentally ship an inaccessible image.

These columns are additions to the brief's data model.

### `published_at` is a display date, not a scheduled-publish trigger

The brief's RLS spec says the public sees rows where `is_published = true` and
`deleted_at is null`. That is implemented literally: publishing takes effect the
moment the toggle flips, and a future `published_at` does **not** hide a
published row.

Future-dated auto-publishing would need a policy change plus a scheduled
revalidation job. Flagged to the client; not built.

### Slug freezing applies to episodes and clips only

Episode and clip slugs are permanent, enforced by a `freeze_slug` trigger: once
a URL is shared or indexed it must not move. Retitling changes the title only.

Host slugs are **exempt** and stay editable from the admin (client decision), so
placeholder host names can be corrected before launch. `/hosts/[slug]` is
low-traffic and not the kind of URL that gets shared.

### Slug generation lives in the database, not the app

A `BEFORE INSERT` trigger derives the slug from the title and resolves
collisions with a numeric suffix (`the-audacity`, `the-audacity-2`). Doing this
in Postgres means uniqueness is settled atomically; doing it in the app would
race two simultaneous saves. Accents are folded rather than stripped so Spanish
titles produce readable slugs.

### `text` + `CHECK` instead of Postgres enums

`video_provider`, `live_events.platform` and `live_events.status` are text
columns with `CHECK` constraints. Adding a value to a Postgres enum is a
migration with awkward transaction rules; editing a `CHECK` is a one-line
migration. The maintaining developer is one person.

### Episode numbers are not unique

Re-editing or renumbering a season should not fail on a constraint. Ordering is
by `published_at`, so a duplicate number is a cosmetic problem, not a broken page.

### Two public-read storage buckets

`host-photos` and `thumbnails`, both public-read, admin-write. Public read is
deliberate: these are marketing images that should be CDN-cached. Signed URLs
would add latency and complexity for no privacy benefit. 5 MB limit, images only.

### Seed data is idempotent and obviously fake

Each seed block is skipped if its table already has rows, so re-running never
duplicates content. Episode videos are real public Creative Commons films
(the Blender open movie project) so thumbnails and embeds genuinely work in
development. Host names are `Host One/Two/Three`; every bio and URL says
"placeholder".

Zodiac order (Taurus, Sagittarius, Gemini) follows the brand line
"3 Doctoral Candidates. 3 Zodiac Signs. 1 Mission."

### Admin emails are seeded separately from content

`seed_admins.sql` is split from `seed.sql`: one is throwaway demo content, the
other is access control, and they have different lifecycles. The admin table is
also unreadable by the public, since it contains the hosts' personal addresses.

### Local Supabase config points at both seed files

`supabase/config.toml` loads `seed.sql` and `seed_admins.sql` on `db reset`, so
a local stack comes up with working admin logins. Harmless: the placeholder
addresses only work against the local mail catcher.

---

## Step 2 - parseVideoUrl

### The return type makes a partial result impossible

`parseVideoUrl` returns a discriminated union, `{ok: true, video}` or
`{ok: false, error}`, rather than the bare object the brief sketched. TypeScript
then refuses to let a caller read `video.embedUrl` without first handling the
failure case. "Fail closed" becomes a compile-time guarantee instead of a
convention. A test asserts the failure branch carries no video fields at all.

### It is synchronous and never touches the network

This keeps it unit-testable and safe to call on every keystroke in the admin
form. It is the reason for the TikTok short-link decision below.

### Short TikTok links are rejected, with instructions

`vm.tiktok.com`, `vt.tiktok.com` and `tiktok.com/t/...` are opaque redirects that
do not contain the video id. Resolving one requires an HTTP request to follow the
redirect.

They are refused with a message telling the host to open the link and copy the
full URL. Saving a row that silently will not embed is worse than a form that
explains itself. If this proves annoying in practice, the fix is a small
server-side resolver called before `parseVideoUrl`; the function itself stays pure.

### Two thumbnail URLs are returned for YouTube

`maxresdefault.jpg` does not exist for every video, so the parser also returns
`hqdefault.jpg`, which always does. The image component falls back on error,
giving hero-quality images where available and never a broken image. This adds a
`thumbnailFallbackUrl` field to the brief's shape.

### Instagram and TikTok return `thumbnailUrl: null`

Neither platform serves a stable public thumbnail without an API token. Rather
than embed a token or scrape, the parser reports null.

**Rule that follows from this (client decision):** in the admin, a thumbnail
upload is **required whenever `provider !== 'youtube'`**, and optional for
YouTube because one can be fetched automatically. Enforced in step 4.

Independently, no missing thumbnail is ever allowed to render as a broken image:
the card component falls back to a branded plate (SITE_NAME on the plum base),
so a gap in the data looks deliberate rather than broken.

### Short TikTok links get a server-side resolver (step 4)

Superseding the "reject and instruct" decision above: hosts will paste
`vm.tiktok.com` links from the share sheet constantly, so a refusal is the wrong
default. A resolver in the server action follows a single redirect, with a
timeout, and hands the resolved URL to `parseVideoUrl`. Each resolution is
logged for visibility.

`parseVideoUrl` itself stays pure, synchronous and network-free - the resolver
runs *before* it, never inside it. If the redirect fails or times out, the
original refusal message is still what the host sees.

### Embeds use `youtube-nocookie.com` and never carry autoplay

The privacy-preserving domain avoids setting tracking cookies until the visitor
presses play. The parser returns a clean embed URL; the player component appends
autoplay only after a real click, which satisfies "do not autoplay anything"
while still playing immediately when asked.

### URLs are canonicalised before storage

`canonicalUrl` strips share-sheet tracking (`si=`, `igsh=`, `utm_*`), timestamps
and playlist context. The same video pasted three different ways stores
identically. Bare domains without a scheme (`youtube.com/watch?v=...`) are
accepted, because that is what some mobile browsers copy.

### Error messages are written for the hosts, not for developers

Every failure message names the problem and the next action ("open the video and
copy the link from the address bar"). A test asserts no message leaks
`undefined`, `TypeError` or `Invalid URL` into the admin UI.

### Lookalike domains are rejected

Host matching is exact against an allow-list after stripping `www.`/`m.`, so
`youtube.com.evil.example` is refused rather than treated as YouTube. Covered by
a test.

### The parser never emits the `other` provider

The database permits `video_provider = 'other'` for future use, but the parser
only ever returns `youtube`, `instagram` or `tiktok` - anything else fails closed.
A test asserts the provider is always one the database accepts.

---

## Project setup

### Next.js 16 / React 19 / Tailwind v4

Current stable at scaffold time via `create-next-app`. `@types/node` was raised
from the scaffold default (`^20`) to `^22` to match the installed Node 22 runtime
and satisfy Vitest's peer requirement.

### Vitest for unit tests

The brief requires `parseVideoUrl` to be unit-tested but names no runner. Vitest
needs no configuration file for this project and runs TypeScript directly.

### The site name lives in `src/config/site.ts`

`SITE_NAME` and the fixed brand copy (taglines, topic strip, platform and social
ordering, nav) are constants. Editorial copy the hosts should change without a
developer - about body, "how we met", platform URLs, social URLs - lives in
`site_settings` and is edited at `/admin/settings`. The dividing line is: does
changing it need a deploy?

### Test suite was mutation-checked

After the suite passed, two deliberate bugs were introduced into `parseVideoUrl`
(accepting any-length YouTube ids; routing TikTok short links to the YouTube
parser). Both were caught, confirming the tests fail when the implementation
breaks rather than merely passing.

---

## Step 3 - public pages

### Dark-only palette, and olive is never text

The design commits to the dark base rather than offering a light theme: the
brand is a deep-toned, LA-nightlife look, and a light variant would need a
second set of contrast decisions for no stated benefit.

Measured contrast against the base tones is recorded at the top of
`globals.css`. The consequential finding: **olive on plum is 3.7:1**, which
fails AA for body text. Olive is therefore used only for borders and decorative
fills, never for text - which is also what "used rarely, as a tertiary accent"
asked for. Magenta (5.2:1), gold (8.2:1) and cream (15:1) are all safe for text.

### Type: three faces, self-hosted

Inter for body and UI, Instrument Serif for editorial headlines, Anton for the
condensed wordmark line. All served by `next/font` so there is no request to a
font CDN and no layout shift, with `display: swap` so text is readable before
the font lands. Instrument Serif was chosen over the more common Playfair for a
sharper, less wedding-invitation feel.

### The wordmark is set in type, not recreated as art

The brief said not to redraw the illustrated cover, and a script webfont for
"She's Got a" would be heavy and would read as cheap. The `Wordmark` component
is the logo slot: an italic serif line above a heavy condensed gold line,
echoing the cover's structure. When a real logo file arrives, replacing that one
component updates the header, footer and hero at once.

It renders no screen-reader-only duplicate of the name: the two spans are read
in order and already say it, and the last word is uppercased in CSS rather than
in the markup so it stays a word rather than being spelled out. A crawler sees
exactly `She's Got a Thesis`.

### Thumbnail fallback chain

Uploaded image -> YouTube `maxresdefault` -> YouTube `hqdefault` ->
`/brand/cover.jpg` -> a branded plate (SITE_NAME on plum). The last step cannot
fail, so a missing or 404ing image is never a broken image.

This is not theoretical: one seeded clip has no `maxresdefault` and was observed
in the browser falling through to `hqdefault` and rendering correctly.

### Thumbnails inside a card carry `alt=""`

Where an image sits inside a link or button that already has an accessible name
from its own heading, the image gets an empty alt so screen readers do not
announce the title twice. The stored alt text is used where an image stands
alone - host photos, and social card images. This is why the admin still
requires alt text even though card thumbnails do not read it aloud.

### Cards link through; they do not play in place

Tapping a card on a phone opens the episode or clip page rather than starting a
video, so a mis-tap never blasts audio. Only the dedicated player on the
episode, clip and home-featured slots plays inline.

### Season filtering is links, not client-side state

`/episodes?season=2` is a real, shareable, indexable URL and works without
JavaScript. An invalid or unknown season falls back to showing everything rather
than erroring. The filter is hidden entirely when the show has only one season,
because a single-option filter is noise.

### "Next" means the newer episode

On an episode page, "Next" moves toward the present and "Previous" toward the
archive, which is what someone working forward through a back catalogue expects.
Verified at both ends: the oldest episode shows only Next, the newest only
Previous.

### Dates are fixed to America/Los_Angeles

Pages are cached and shared between visitors, so a viewer-local format would
either be wrong for whoever received the cached copy or would hydrate
differently than it rendered. One canonical format, in the show's own time zone.

### Platform icons are geometric stand-ins

The marks in `components/icons.tsx` are drawn from primitives, not the official
vector artwork. They read correctly at a glance but should be replaced with the
real assets from each platform's brand/press kit before launch so trademark
usage is correct. Noted in the file itself.

### Fixture fallback and the `ALLOW_FIXTURE_CONTENT` flag

`src/lib/fixtures.ts` mirrors `seed.sql` so the site renders before a database
exists. `data.ts` refuses to use it in a production build unless
`ALLOW_FIXTURE_CONTENT=true` is set explicitly - a deployment quietly serving
placeholder bios because a key went missing is a far worse failure than a build
that stops. The flag also covers the real in-between state: credentials present,
schema not yet applied.

Delete `fixtures.ts` once the hosted project is seeded.

### `next/image` remote hosts are allow-listed

Only `i.ytimg.com/vi/**` and the project's own Supabase storage path. A wildcard
would turn the site into an open image proxy that anyone could bill to this
Vercel project.

### Turbopack root is pinned

A stray `package-lock.json` in a parent directory made Turbopack infer the wrong
workspace root. `turbopack.root` now pins it to the project.

---

## Step 3b - remaining public pages, and the real database

### The cover art was a screenshot, so it is cropped programmatically

The supplied file was a screenshot with white margins and a caption below the
artwork. `scripts/build-cover.py` detects the artwork block and emits two files,
so the crop is reproducible if the art is ever replaced:

- `public/brand/cover.jpg` - the trimmed square artwork, used as the last
  thumbnail fallback before the branded plate.
- `public/brand/cover-og.jpg` - 1200x630 for link previews.

The original `thesis.jpeg` was left where the client put it, in the project root.

### Link previews get their own image

Social cards are 1.91:1 and the cover is square. Letting Instagram, X or
iMessage centre-crop it would slice the wordmark off the top and the
"Listen. Learn. Level Up." strip off the bottom - the two things that identify
the show. `cover-og.jpg` frames the whole cover on the plum base instead, so
nothing is lost. Metadata uses it; episode and clip pages still prefer their own
thumbnail and fall back to it.

### /live has four states, all exercised

Which one renders depends on the data, so each was tested against the real
database and then reverted:

1. **Scheduled** - date, and a "Join us on <platform>" card. No player, because
   there is nothing to play yet.
2. **Live on YouTube** - the lazy player.
3. **Live on Instagram** - the deep-link card the brief asked for. Instagram
   Live genuinely cannot be embedded, so this is the honest outcome rather than
   a broken frame.
4. **Nothing scheduled** - the last replay, plus a line about where the next one
   gets announced.

`/live` revalidates every 60 seconds rather than 300; it is the one page whose
correctness is time-sensitive.

### Clips link back to their episode, and vertical video is capped

Each clip page shows the parent episode when one is set. The player is capped at
380px wide on desktop: a 9:16 video stretched across a wide column is unusable.

### /hosts/[slug] was built

It was cheap, so both exist: `/hosts` carries anchor ids for the home page to
link into, and each host also has a single shareable URL with `Person`-suitable
metadata.

### Two environment bugs worth remembering

Both were found while wiring up the real project, and both would have bitten the
maintaining developer:

1. **CRLF.** `.env.local` written on Windows ends lines with `\r`, and
   JavaScript's `.` does not match `\r`, so a `/^(\w+)=(.*)$/` parser silently
   matches nothing and every variable looks absent. The scripts split on
   `/\r?\n/`.
2. **Inline comments.** The client's `.env.local` has `# ...` notes after the
   values. A shell strips those for free, so `psql` worked while Node did not.
   The scripts now strip an unquoted trailing ` # comment`, leaving a `#` inside
   a password alone.

### The database password is in DATABASE_URL

`.env.local` holds the Postgres password in plain text. It is git-ignored, but
it is worth knowing it is there, and worth rotating it if that file is ever
shared or pasted anywhere.

---

## Step 4 - admin (episodes)

### Route groups split the two experiences

`src/app/(public)/` keeps the marketing header and footer; `src/app/admin/` has
its own chrome. The hosts editing an episode on a phone should not have a
"Listen on Spotify" row above the form. The root layout carries only fonts and
the document shell.

### The auth guard lives in a layout, not in each page

`admin/(protected)/layout.tsx` calls `requireAdmin()`, so a new admin screen
cannot be added without protection. `/admin/login` and `/admin/not-authorized`
sit outside that group deliberately.

### Authorisation asks the database, not a table read

`getAdminSession()` calls the `is_admin()` function rather than selecting from
`admins`. A non-admin selecting that table correctly gets zero rows, and "no
rows" is indistinguishable from "empty table" - which would make an empty
allow-list look like a locked door for everyone, or worse, the reverse. It is
also the same function the RLS policies use, so the UI can never disagree with
what the database will actually allow.

### The login page does not reveal who is an admin

`signInWithOtp` is sent for any valid-looking address, and the refusal happens
after sign-in. Saying "that email is not an admin" on the login form would let
anyone test whether a given address belongs to one of the hosts. The cost is
that a stranger can trigger one email to their own address.

### The magic-link callback discards a session it will not use

A valid link for a non-allow-listed email produces a real session with no
permissions. The callback signs it out rather than leaving it in the browser.

### The login UX assumes email is slow

Custom SMTP still takes time, so "check your email" is a full screen rather than
a toast: it names the address, says it can take a minute, mentions spam, and has
a resend button with a visible 60-second countdown. Failures are always shown -
rate limiting is named explicitly, since it is the most likely one and the fix
is simply to wait.

### Uploads happen after validation, never before

A rejected form used to be able to leave an orphaned file in the bucket. The
upload now runs only once every other field has passed. Verified: submitting an
image with no alt text leaves the bucket empty.

### Storage filenames are slugified

The first version named files after the episode title, producing
`TikTok With Uploaded Thumbnail-1788835118499.png` - spaces in a public URL.
Now slugified, with accents folded, so `Café Después` becomes `cafe-despues`.

### Delete asks for confirmation

It is a soft delete and restorable, but on a phone the Delete button sits one
tap from Edit, so it confirms first.

### Revalidation targets

Every episode save refreshes `/`, `/episodes`, `/episodes/[slug]`, `/clips`
(clip cards can name their parent episode) and the admin list. Verified: after
saving, the new episode appeared on all three public routes with no rebuild;
after unpublishing, its page returned 404 and the home page fell back to the
previous episode.

### The short-link resolver runs before the parser, not inside it

`parseVideoUrlResolvingShortLinks()` follows exactly one redirect with a
five-second timeout, then hands the result to the untouched, still-synchronous
`parseVideoUrl`. It fails soft: a timeout or a redirect to somewhere useless
produces the parser's own plain-English message rather than a network error.
Each resolution is logged (`[video] resolved short link ... -> ...`).

Verified against the real network: a `vm.tiktok.com` link was followed to
`https://www.tiktok.com/?_r=1` and correctly refused, with the hop logged.

### Publishing fills in a missing date

The database rejects a published row with no `published_at`. Rather than
bouncing the host back for a formality, publishing without a date uses today.

### Test scaffolding was removed

A `dev-session.mjs` helper was used to mint sessions while email was rate
limited. It could create admin users, so it was deleted along with its cookie
file once testing finished. All test rows, users and uploaded files were removed;
the database is back to 5 episodes, 3 clips, 3 hosts, 0 admins, 0 auth users and
an empty bucket.

---

## Step 4 - the remaining admin screens

### Shared, not copied

The client asked for reuse rather than duplication, so three things are shared:

- `lib/admin/media.ts` — the video-link and image rules. Episodes and clips have
  identical posture (fail closed on an unparseable link, require an upload where
  the platform gives no thumbnail, require alt text on any stored image), so the
  rules exist once. The episode action was refactored onto it rather than the
  clip action being written alongside it.
- `components/admin/media-fields.tsx` — the matching form fields.
- `components/admin/content-list.tsx` — the list screen. Episodes and clips
  differ only in labels and one metadata line, so the publish toggle,
  soft-delete/restore flow and "deleted items" view are written once.

### Live events are hard-deleted, everything else is soft-deleted

Episodes and clips have public URLs that may have been shared, so deleting is
reversible and the row stays. A live event has no page of its own, nothing links
to it, and stale ones are clutter, so delete means delete. The confirmation
dialog says so explicitly.

### A live event's URL is validated loosely

It must be a real link, but it does not have to be an embeddable video: an
Instagram Live URL never is, and a YouTube stream may not exist yet at the time
of scheduling. A YouTube link that cannot be parsed is rejected with an
explanation, because for that platform the page promises an embed.

### Hosts have no create or delete

There are three hosts and that is fixed. Removing the operations removes a class
of mistake.

### The host slug is editable but warned about

Unlike episodes, the placeholder names need replacing. The form explains that
changing it changes the link, and the action revalidates both the old and the
new path.

---

## Step 5 - revalidation, metadata, structured data, Lighthouse

### Cache invalidation lives in one file

`lib/admin/revalidate.ts` holds every `revalidatePath` call, with a comment
mapping which content appears on which pages. Scattered across five action
files, the "this also appears over there" bugs were invisible; as a list they
are checkable. Two real gaps were found this way and fixed:

1. **Settings did not reach detail pages.** The header and footer are on every
   page, but the action revalidated only the six top-level routes, leaving
   `/episodes/[slug]`, `/clips/[slug]` and `/hosts/[slug]` showing a stale
   Spotify link. Verified before the fix, then fixed with
   `revalidatePath('/', 'layout')` and verified across all eight pages.
2. **Retitling an episode did not reach its clips.** A clip page shows "From the
   episode: <title>". The first fix used the route-pattern form,
   `revalidatePath('/clips/[slug]', 'page')` — **it did not invalidate anything**
   in practice, and the old title stayed visible. Replaced with an explicit
   lookup of the clips pointing at that episode, revalidating each by path.
   Verified: retitling now updates the clip page with no rebuild.

The sitemap is revalidated on every content change, so a new episode appears in
it without waiting for its 5-minute window.

### Two thumbnail sizes, chosen by where the image is used

`maxresdefault` (1280x720) does not exist for every YouTube video, and requesting
a missing one 404s. The fallback chain handled it, but the failed request was
logged as a console error on every page load containing that clip.

Cards now request `hqdefault` (480x360), which always exists and is more than
enough at card size; only the large hero players gamble on `maxresdefault` and
fall back. This removed the 404s from grid pages entirely.

### Contrast failures found by Lighthouse, not by arithmetic

The palette was checked at full opacity in step 3, but three places used
opacity-modified colours that fell below 4.5:1 and were missed:

- the live banner's time, `text-ink/75` on magenta — 4.07:1
- the footer copyright and email, `text-cream/50` on plum — 4.48:1

Fixed by distinguishing the banner time with weight rather than opacity, and
raising the footer small print to `text-cream/70`. The lesson recorded for the
next developer: check the opacity variants, not just the tokens.

### JSON-LD is escaped before it reaches the page

Titles are written by the hosts, so a title containing `</script>` would close
the tag early and inject markup. `components/json-ld.tsx` escapes `<` in the
serialised JSON.

### Two OG image sizes

Pages fall back to the framed 1200x630 cover; episodes and clips prefer their
own thumbnail when they have one. Episode OG images still use `maxresdefault`,
because a link preview wants the large image and real HD uploads always have it.

### Lighthouse (mobile, production build)

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Home | 99 | 100 | 100 | 100 |
| Episode | 99 | 100 | 100 | 100 |

Targets were performance ≥85, accessibility ≥95, SEO 100. FCP 0.8s, LCP 2.0-2.1s,
TBT 20-30ms, CLS 0 on both.

What earned those numbers, in rough order of contribution: no iframe or
third-party script until the visitor presses play; fonts self-hosted through
`next/font` with `display: swap`; static prerendering with ISR; `next/image`
with explicit `sizes` on every image; and no entrance animations, which is also
why CLS is zero.

### `middleware.ts` migrated to the `proxy.ts` convention

Next 16 renamed the file convention and warns on the old name. Renamed to
`src/proxy.ts` with a default export.

Because a silently disabled proxy would stop refreshing admin sessions without
any visible error, the migration was verified rather than assumed: a temporary
response header proved the proxy executes on `/admin/*` and does not execute on
public routes (the matcher still applies). The probe was removed afterwards.

---

## Design pass - home hero

Visual only; structure and behaviour unchanged.

### The crop is expressed in percentages, never pixels

`COVER_FOCUS` (`center 49%`) and `COVER_ZOOM` (`scale-[1.6]`) frame the middle
band of the square cover - the three hosts' faces and shoulders - with the neon
wordmark above and the desk props below out of frame. Both are unitless, so the
higher-resolution replacement landing at the same path will be framed
identically without anyone touching the code.

`object-fit: cover` alone was not enough: it only trims the overflow, which
still left the wordmark in shot. The zoom is what crops past it. The container
needs `overflow-hidden` or the scaled image escapes it and bleeds over the type
- which it did, on the first attempt.

### One image element per breakpoint, but one download

The desktop and mobile heroes are structurally different (absolutely positioned
with a gradient vs. stacked in flow), so they are two elements. They initially
had different `sizes`, which made the browser pick different srcset candidates
and download the cover twice - a phone fetched the 44KB desktop crop it never
displayed, on top of the 54KB one it did. Matching `sizes` on both means the
hidden one resolves to a URL already in cache.

### The marquee band is opaque

The topic strip first sat directly over the photograph, where the type was
unreadable against the busy image. It now has its own solid plum band above the
image, which also gives the hero a defined bottom edge.

The track holds the topics twice and slides by exactly half its width, so the
loop has no seam; the duplicate run is `aria-hidden` so screen readers announce
the topics once. Under `prefers-reduced-motion` the animation is switched off
outright rather than being caught by the global 0.01ms rule, which would have
snapped it to its end position instead of stopping it.

### The glow is used exactly once

`.wordmark-glow` puts the script line in magenta with a soft text-shadow, as on
the cover. It is applied through a `variant="hero"` prop rather than baked into
`Wordmark`, so the header, footer, 404 and admin keep the plain treatment and
there is precisely one glowing element in the home viewport.

### Hero height

Reduced from ~700px to 555px (smaller wordmark clamp and tighter padding) so the
"Latest Episode" eyebrow sits at y=764 in a 1440x900 viewport, inside the fold.

### Lighthouse after the change (mobile, production build)

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Home | 93 | 100 | 100 | 100 |
| Episode | 99 | 100 | 100 | 100 |

Home performance fell from 99 to 93 and LCP from 2.0s to 3.3s. That is the
expected price of a photographic hero: the cover is now the LCP element, as
intended. Still comfortably above the ≥85 target, with CLS 0 and TBT 20ms. The
source image is a low-resolution screenshot; a properly exported replacement
will be sharper without necessarily being heavier.

### Screenshots are regenerable

`scripts/screenshot.mjs` captures `docs/screens/` at real device widths over the
DevTools protocol, with no dependencies. It exists because
`chrome --screenshot --window-size=390,844` silently lays the page out at 500px
on Windows (Chrome will not make a window narrower than that) and crops the
image, which looks convincingly like a horizontal-overflow bug that is not
there. That cost some time; the note is here so it does not cost it twice.

---

## Clip fixes before the demo

### Seed content shows only this show's own artwork

The seed videos are real Creative Commons films, and the site was fetching their
YouTube thumbnails - so a demo displayed someone else's images. Every seeded
episode and clip now carries a crop of the show's own cover instead, generated
by `python scripts/build-placeholders.py`: three 9:16 crops for the clips (one
per host) and five 16:9 crops for the episodes.

Verified: zero references to `i.ytimg.com` in the rendered HTML of `/`,
`/clips`, `/episodes` and both detail pages.

The video URLs are unchanged, so the embeds still work when played.

### Seed thumbnails are local files, not storage uploads

`thumbnail_path` normally holds a Supabase storage key. A path beginning with
`/brand/` is served from `/public` instead. Seeding is plain SQL run in the
Supabase SQL editor, which cannot upload files, so the alternative was either an
extra manual step during setup or leaving the borrowed thumbnails in place.
Uploads from the admin are unaffected and still produce storage keys.

**`/brand/` is the only local prefix accepted.** The value comes from a database
column, so any other absolute path is either a typo or someone aiming the site
at a file it should not be serving - `/api/...`, `/_next/...`, a
protocol-relative `//host/x.jpg`, or a lookalike like `/brandx/`. All of those
return null, which puts the image back on the normal fallback chain and it ends
up on the cover art rather than rendering. A `..` anywhere in the path is
refused too, so a value cannot climb out of the folder.

Covered by `src/lib/data.test.ts`, and mutation-checked: loosening the rule back
to "any leading slash" fails 11 of its 15 tests.

### Clip aspect is stored, not inferred at render time

New `clips.aspect` column (`portrait` | `landscape`), derived on save and
editable in the admin. Deriving it at render would mean re-parsing the video URL
on every request, and would still be wrong for an uploaded thumbnail.

The rules, in order: an uploaded image's own orientation wins, because it is the
picture the hosts deliberately chose; otherwise Instagram, TikTok and YouTube
`/shorts/` links are portrait and everything else is landscape.

`parseVideoUrl` gained `isVertical` to support this, and a Short now
canonicalises to its `/shorts/` form rather than `watch?v=` - the URL is what
records that the video is vertical. Two existing tests failed on that change,
which is what they were for; both were updated deliberately.

Reading an uploaded image's dimensions is done by parsing the JPEG/PNG/GIF/WebP
header directly rather than adding an image library for one number. It is
covered by tests against the real brand images, including a truncated file.

### A Short's card crops rather than letterboxes

YouTube only ever generates a 16:9 thumbnail, even for a Short. Rendering that
in a 9:16 frame produced black bars down both sides. The card now uses
`object-fit: cover`, cropping the sides - acceptable for a Short, where the
subject is centred, and much better than the bars.

### The grid packs densely

`grid-flow-row-dense` with portrait cards spanning two rows, so two landscape
cards stack beside one portrait card instead of every row being as tall as its
tallest member. Every card still reserves its space with an aspect-ratio box, so
nothing reflows as thumbnails load.

All three seeded clips are portrait, so the mixed case was verified separately
by inserting two temporary landscape clips (screenshots in
`docs/screens/clips-mixed-*.png`) and then removing them.

### A heading-order bug this uncovered

Running Lighthouse on `/clips` for the first time - previous runs only covered
the home and episode pages - showed accessibility at 98: the page went from `h1`
straight to `h3`, because the card heading was fixed at `h3` for the home page
where it sits under a section heading. `/episodes` had the same flaw.

Cards now take a `headingLevel`, so the outline never skips a level. Both pages
are back to 100. The lesson: audit every page type, not a representative one.

### Lighthouse after these changes (mobile, production build)

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Home | 92 | 100 | 100 | 100 |
| Clips | 95 | 100 | 100 | 100 |
| Episodes | 96 | 100 | 100 | 100 |
| Episode | 99 | 100 | 100 | 100 |

---

## WhatsApp link previews

### The og:image pointed at a stranger's website

WhatsApp showed no preview card for the deployed site. The deployed HTML had:

    og:url    https://thesis.vercel.app
    og:image  https://thesis.vercel.app/brand/cover-og.jpg

but the site is at `thesis-ten-jet.vercel.app`. `thesis.vercel.app` is an
unrelated Vercel project - it serves a site called "HR Management" - and like
many single-page apps it answers *every* path with `200 OK` and an HTML
document. So the image URL was not a dead link, which is why nothing looked
broken: it returned 200, and returned `text/html`. WhatsApp fetched it, found no
image, and dropped the card.

The cause was `NEXT_PUBLIC_SITE_URL` having been set to a guessed address. It is
inlined at build time, so correcting it in Vercel changes nothing until a
redeploy - which the commit itself triggers.

Everything else checked out: title and description present, `og:image` 1200x630,
102KB, `image/jpeg`, `twitter:card` = `summary_large_image`, and the tags at
byte ~3,400 of an 83KB document, well inside any crawler's read limit.

### The build now refuses a vercel.app URL that is not ours

A near-miss domain is more dangerous than an obviously wrong one, because it
answers 200. `next.config.ts` throws when `NEXT_PUBLIC_SITE_URL` is a
`.vercel.app` address that does not match `VERCEL_PROJECT_PRODUCTION_URL`.

Custom domains are the entire point of the override, so only `.vercel.app`
values are checked - there is nothing to compare a custom domain against.
Verified all three cases: it fires on the mismatch, and stays quiet for both the
correct vercel.app domain and a custom one.

### cover-og.jpg is now a baseline JPEG

It was progressive. WhatsApp's fetcher does not reliably decode progressive
JPEGs and silently shows no card, so the one image that crawlers fetch raw is
now baseline (107KB, 1200x630, still well under the 300KB ceiling). Everything
else goes through next/image, which re-encodes, so this applies only to
`cover-og.jpg`. `scripts/build-cover.py` keeps it that way.

`og:image:type` is now declared too, rather than left for the fetcher to guess.
