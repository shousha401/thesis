# She's Got a Thesis

The podcast website and its admin. Next.js (App Router) + Supabase, deployed on
Vercel.

The podcast name is not hardcoded anywhere. It lives in `SITE_NAME` in
[`src/config/site.ts`](src/config/site.ts); change it there and it changes
everywhere.

---

## Contents

1. [Running it locally](#1-running-it-locally)
2. [Setting up a Supabase project](#2-setting-up-a-supabase-project)
3. [Environment variables](#3-environment-variables)
4. [Giving the hosts admin access](#4-giving-the-hosts-admin-access)
5. [Email delivery (custom SMTP)](#5-email-delivery-custom-smtp) ← **required before launch**
6. [Deploying to Vercel](#6-deploying-to-vercel)
7. [Verifying security](#7-verifying-security)
8. [How the code is organised](#8-how-the-code-is-organised)
9. [Things you will want to know later](#9-things-you-will-want-to-know-later)

---

## 1. Running it locally

Requires Node 22+.

```bash
npm install
cp .env.example .env.local   # then fill it in, see section 3
npm run dev
```

Open http://localhost:3000. The admin is at http://localhost:3000/admin.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Unit tests (the video URL parser and the short-link resolver) |
| `npm run verify:supabase` | Checks an anonymous visitor cannot read drafts or write anything |
| `npm run verify:rls` | Full security check across anonymous / signed-in / admin |

**Before the database exists**, the site can render from the seed fixtures:

```bash
ALLOW_FIXTURE_CONTENT=true npm run build
```

That flag is refused in a `VERCEL_ENV=production` build, so placeholder content
can never reach the live site.

---

## 2. Setting up a Supabase project

1. Create a project at [supabase.com](https://supabase.com). Note the region.
2. Open **SQL Editor** and run these files **in this order**:

   1. `supabase/migrations/20260907120000_init.sql` — tables, indexes, triggers
   2. `supabase/migrations/20260907120100_rls.sql` — Row Level Security policies
   3. `supabase/migrations/20260907120200_storage.sql` — the two image buckets
   4. `supabase/seed.sql` — placeholder content, so the site looks finished

   Each file is safe to run once. `seed.sql` is safe to run repeatedly: it skips
   any table that already has rows.

3. Do **not** run `supabase/seed_admins.sql` yet — see section 4.

If you have the Supabase CLI and Docker, `npm run db:reset` does all of the
above against a local stack instead.

### Applying migrations from your machine

The direct database host (`db.<ref>.supabase.co`) is IPv6-only. If your network
has no IPv6 route, use the **Session pooler** connection string instead
(Supabase dashboard → Connect → Session pooler), which is IPv4:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260907120000_init.sql
```

---

## 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where it comes from | Needed in production? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page | yes |
| `NEXT_PUBLIC_SITE_URL` | your public domain, no trailing slash | yes |
| `DATABASE_URL` | Supabase → Connect → Session pooler | **no** — local admin tasks only |

`DATABASE_URL` contains your database password in plain text. It is git-ignored.
Do not add it to Vercel; the app never uses it. Rotate the password if that file
is ever shared.

> **There is deliberately no service-role key in this project.** The service role
> bypasses Row Level Security entirely, so one mistake with it exposes or
> destroys everything. The admin acts as the signed-in host, and the database
> decides what they may do. If you find yourself wanting the service key, the
> fix almost certainly belongs in the RLS policies instead.

---

## 4. Giving the hosts admin access

Only an email listed in the `admins` table can use `/admin`. Anyone else who
signs in successfully is shown a friendly "not authorized" page.

1. Open `supabase/seed_admins.sql` and replace the three placeholder addresses
   with the hosts' real emails, lowercase.
2. Paste it into the Supabase **SQL Editor** and run it.

To add someone later:

```sql
insert into public.admins (email) values ('newhost@example.com');
```

To remove access immediately:

```sql
delete from public.admins where email = 'formerhost@example.com';
```

Removal takes effect on their next request — there is no cached permission.

---

## 5. Email delivery (custom SMTP)

**This must be done before launch.** Supabase's built-in email service is
rate limited to a couple of messages per hour and is explicitly not for
production. Without custom SMTP, the hosts will try to log in and no email will
arrive.

These instructions use [Resend](https://resend.com); any SMTP provider works the
same way.

### 5a. In Resend

1. Create an account and go to **Domains → Add Domain**. Use a domain you
   control, e.g. `shesgotathesis.com`.
2. Resend shows you the exact DNS records to add. You will normally get:
   - an **MX** record on a `send.` subdomain (bounce handling),
   - a **TXT** SPF record on that same subdomain,
   - a **TXT** DKIM record at `resend._domainkey`.

   Add them at your domain registrar exactly as Resend displays them — copy the
   values from Resend rather than from here, as they are account-specific.
   Verification usually completes within an hour.
3. Optionally add a DMARC record at `_dmarc` (`v=DMARC1; p=none;` is a fine
   start) — it improves deliverability into Gmail.
4. Go to **API Keys → Create API Key**, with *Sending access*. Copy the key
   (`re_...`); it is shown once.

### 5b. In Supabase

Dashboard → **Authentication → Emails → SMTP Settings** → enable
**Custom SMTP**, then:

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key (`re_...`) |
| Sender email | `hello@yourdomain.com` (must be on the verified domain) |
| Sender name | `She's Got a Thesis` |

Save. Then go to **Authentication → Rate Limits** and raise
**"Emails per hour"** — the default is deliberately tiny and exists only to
protect the shared service.

### 5c. Redirect URLs

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://yourdomain.com`
- **Redirect URLs**: add all of these

  ```
  https://yourdomain.com/admin/auth/callback
  http://localhost:3000/admin/auth/callback
  https://*-yourteam.vercel.app/admin/auth/callback
  ```

A magic link that redirects somewhere not on this list is rejected by Supabase,
which shows up as a link that "does nothing".

### 5d. Check it

Go to `/admin/login`, enter an allow-listed address, and confirm the email
arrives. The login screen is built for slow email: it names the address it sent
to, says the link can take a minute, mentions the spam folder, and offers a
resend button with a 60-second cooldown.

---

## 6. Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project**, import the repo. It detects Next.js; no
   build settings need changing.
3. Add environment variables (Settings → Environment Variables) for
   **Production** and **Preview**:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (production: your real domain)

   Do **not** add `ALLOW_FIXTURE_CONTENT`. The build fails on purpose if it is
   set to `true` in production.

4. Deploy, then add your custom domain (Settings → Domains).
5. Go back and update the Supabase redirect URLs (section 5c) with the real
   domain.

### `NEXT_PUBLIC_SITE_URL` must be exactly right, and needs a redeploy

It is inlined at build time and becomes every absolute URL the site emits:
canonical links, `og:url`, and the social preview image. Two consequences:

- **Changing it in Vercel does nothing until you redeploy.** The old value is
  already compiled into the deployed build.
- **A near-miss is worse than a wrong-looking one.** A deployment once shipped
  with `https://thesis.vercel.app` when the project was actually at
  `thesis-ten-jet.vercel.app`. That first address belongs to somebody else's
  project, which answers every path with a 200 and an HTML page - so `og:image`
  "worked", returned HTML instead of a picture, and WhatsApp silently showed no
  preview card at all. The build now refuses if the value is a `.vercel.app`
  address that is not this project's.

### Content changes never need a deploy

Every admin save calls `revalidatePath` for the pages that changed, so a new
episode appears on the site immediately. You should never need to redeploy to
publish content — only to ship code.

---

## 7. Verifying security

Two scripts, both safe to run against production:

```bash
npm run verify:supabase   # 21 checks, anonymous visitor only
npm run verify:rls        # 33 checks, anonymous + signed-in + admin
```

`verify:rls` creates two temporary users, exercises the policies, and deletes
everything it made — including on failure. It needs `DATABASE_URL`.

Run them after any change to `supabase/migrations/`.

---

## 8. How the code is organised

```
src/
  app/
    (public)/          the public site — its own header/footer
    admin/
      login/           magic-link sign-in
      not-authorized/  friendly refusal for non-allow-listed emails
      auth/callback/   where the magic link lands
      (protected)/     everything requiring an admin session
  components/          shared UI; components/admin/ is admin-only
  config/site.ts       SITE_NAME, taglines, palette-adjacent brand constants
  lib/
    data.ts            public reads (anonymous; RLS decides what comes back)
    video.ts           parseVideoUrl — pure, synchronous, unit tested
    admin/             admin-only reads, auth helpers, short-link resolver
    supabase/server.ts the session-bound client used for every admin write
supabase/
  migrations/          schema, RLS, storage — run in filename order
  seed.sql             placeholder content
  seed_admins.sql      the admin allow-list (you edit this)
scripts/               verification and image-build utilities
```

The dividing line for content: if the hosts should be able to change it without
a developer, it belongs in the `site_settings` table and `/admin/settings`. If
changing it means a deploy, it belongs in `src/config/site.ts`.

---

## 9. Things you will want to know later

**Episode and clip URLs never change.** A database trigger freezes the slug on
insert, so renaming an episode does not break links that are already shared.
Host slugs *are* editable, since the placeholder names need replacing.

**Deleting is reversible.** Delete sets `deleted_at`; the row stays and RLS
hides it. The episodes list has a "View deleted" link with a Restore button.

**Thumbnails.** YouTube ones are fetched automatically. Instagram and TikTok do
not expose a thumbnail without an API token, so the admin requires an upload for
those. Every uploaded image requires alt text — enforced by a database
constraint, not just the form.

**Video links.** `parseVideoUrl` accepts every YouTube form (watch, youtu.be,
shorts, live, embed), Instagram posts and reels, and full TikTok links. Short
`vm.tiktok.com` links are resolved server-side before parsing. Anything it
cannot parse blocks the save and shows the host what to do instead.

**Changing a host's slug** (e.g. `host-one` → `amara`): edit it in
`/admin/hosts`. Unlike episodes, host slugs are not frozen.

**Social preview images** must be baseline JPEGs, not progressive ones -
WhatsApp's fetcher does not reliably decode progressive JPEGs and just shows no
card. `scripts/build-cover.py` writes `cover-og.jpg` baseline for that reason.
Keep it under 300KB.

**The cover art** lives in `public/brand/`. If it is replaced, regenerate the
derived images with `python scripts/build-cover.py path/to/new-cover.jpg` and
`python scripts/build-placeholders.py` (both need Pillow). The second one makes
the branded thumbnails the seed content uses, so a demo never displays the test
videos' own artwork.

**SEO plumbing** is generated, not hand-maintained: `src/app/sitemap.ts` lists
every published episode, clip and host (and is refreshed whenever content
changes), `src/app/robots.ts` disallows `/admin`, and JSON-LD structured data
(`PodcastSeries`, `PodcastEpisode`, `Person`) is built in
`src/lib/structured-data.ts`.

**Cache invalidation** all lives in `src/lib/admin/revalidate.ts`, with a map of
which content appears on which pages. If you add a page that shows existing
content, add it there too.

**Lighthouse** (mobile, production build) at the time of handover:

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Home | 92 | 100 | 100 | 100 |
| Clips | 95 | 100 | 100 | 100 |
| Episodes | 96 | 100 | 100 | 100 |
| Episode | 99 | 100 | 100 | 100 |

The home page carries the cover art as its LCP element, which is what puts it at
93 rather than 99. Screenshots in `docs/screens/` can be regenerated with
`node scripts/screenshot.mjs` (see the file header).

**A guide for the hosts** — how to log in and add an episode, a clip, a live
stream, and edit a bio — is in [CLIENT_GUIDE.md](CLIENT_GUIDE.md).

**Decisions and open items** are recorded in [DECISIONS.md](DECISIONS.md).
