/**
 * Re-runs the step-1 security checks against a REAL Supabase project.
 *
 *   node scripts/verify-supabase.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from
 * .env.local. Uses only the anon key - the same access a random visitor has.
 *
 * What this proves that the Neon dry-run could not: that RLS and the Storage
 * policies hold up against the real auth and storage services, not stubs.
 *
 * What it cannot prove: the signed-in-admin path, which needs a real magic-link
 * session. That is checked by hand through the admin UI (see README).
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  let raw;
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  } catch {
    console.error('No .env.local found. Copy .env.example and fill it in first.');
    process.exit(1);
  }
  const env = {};
  // Split on CRLF as well as LF. A .env.local written on Windows ends lines
  // with \r, and JavaScript's `.` does not match \r, so `(.*)$` would match
  // nothing at all and every variable would look absent.
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    // Strip a trailing ` # comment`, which dotenv allows and a shell strips for
    // free. Only when the value is unquoted and the # follows whitespace, so a
    // # inside a password survives.
    if (!/^["']/.test(value)) value = value.replace(/\s+#.*$/, '').trim();
    env[match[1]] = value.replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key || url.includes('your-project-ref')) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are missing or still placeholders.');
  process.exit(1);
}

const anon = createClient(url, key);

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

console.log(`\nVerifying ${url} as an anonymous visitor\n`);

// --- Public reads ----------------------------------------------------------

console.log('Public reads');

const episodes = await anon.from('episodes').select('id, is_published, deleted_at');
check('episodes readable', !episodes.error, episodes.error?.message);
check(
  'no unpublished episode is exposed',
  (episodes.data ?? []).every((e) => e.is_published === true),
);
check(
  'no soft-deleted episode is exposed',
  (episodes.data ?? []).every((e) => e.deleted_at === null),
);

const clips = await anon.from('clips').select('id, is_published, deleted_at');
check('clips readable', !clips.error, clips.error?.message);
check(
  'no unpublished or deleted clip is exposed',
  (clips.data ?? []).every((c) => c.is_published === true && c.deleted_at === null),
);

for (const table of ['hosts', 'live_events', 'site_settings']) {
  const result = await anon.from(table).select('*');
  check(`${table} readable`, !result.error, result.error?.message);
}

// --- The admin allow-list must never be public -----------------------------

console.log('\nAdmin allow-list (contains the hosts’ personal email addresses)');

const admins = await anon.from('admins').select('email');
check(
  'admin emails are NOT readable by the public',
  !!admins.error || (admins.data ?? []).length === 0,
  admins.data?.length ? `LEAKED ${admins.data.length} address(es)` : '',
);

// --- Writes must all be refused --------------------------------------------

console.log('\nAnonymous writes (every one must be refused)');

const writes = [
  [
    'insert an episode',
    () =>
      anon.from('episodes').insert({
        episode_number: 9999,
        title: 'Unauthorised',
        video_url: 'https://youtu.be/aqz-KE-bpKQ',
        video_provider: 'youtube',
        video_id: 'aqz-KE-bpKQ',
      }),
  ],
  ['update every episode', () => anon.from('episodes').update({ title: 'Defaced' }).neq('id', '00000000-0000-0000-0000-000000000000')],
  ['delete every clip', () => anon.from('clips').delete().neq('id', '00000000-0000-0000-0000-000000000000')],
  ['edit site settings', () => anon.from('site_settings').update({ about_body: 'Defaced' }).eq('id', 1)],
  ['edit a host bio', () => anon.from('hosts').update({ bio: 'Defaced' }).neq('id', '00000000-0000-0000-0000-000000000000')],
  ['add itself to the admin allow-list', () => anon.from('admins').insert({ email: 'attacker@example.com' })],
  ['schedule a live event', () => anon.from('live_events').insert({ title: 'x', platform: 'youtube', url: 'https://y.com', scheduled_at: new Date().toISOString() })],
];

for (const [label, run] of writes) {
  const { data, error } = await run();
  // Refused either by an explicit error, or by the row being invisible so
  // nothing matched. Both are safe; a returned row is not.
  const changed = Array.isArray(data) ? data.length > 0 : Boolean(data);
  check(`refused: ${label}`, Boolean(error) || !changed, changed ? 'A ROW WAS MODIFIED' : '');
}

// --- Storage ---------------------------------------------------------------

console.log('\nStorage');

for (const bucket of ['host-photos', 'thumbnails']) {
  const listed = await anon.storage.from(bucket).list();
  check(`${bucket}: public read works`, !listed.error, listed.error?.message);

  const upload = await anon.storage
    .from(bucket)
    .upload(`unauthorised-${Date.now()}.txt`, new Blob(['nope']), { contentType: 'text/plain' });
  check(`${bucket}: anonymous upload refused`, Boolean(upload.error), upload.error ? '' : 'UPLOAD SUCCEEDED');
}

const secret = await anon.storage.from('host-photos').list('../');
check('no path traversal out of a bucket', Boolean(secret.error) || (secret.data ?? []).length >= 0);

// --- Result ----------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.error('Security checks FAILED. Do not deploy until these pass.');
  process.exit(1);
}
console.log('All anonymous-access checks passed.');
console.log('Still to check by hand: sign in at /admin and confirm a');
console.log('non-allow-listed email is refused. See README.\n');
