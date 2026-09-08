/**
 * The full Row Level Security matrix, against the REAL Supabase project.
 *
 *   node scripts/verify-rls.mjs
 *
 * Exercises three identities:
 *   1. anonymous            (no token)
 *   2. signed in, not an admin
 *   3. signed in, on the admins allow-list
 *
 * Both test users SIGN IN through Supabase Auth, so every request below carries
 * a genuine GoTrue-issued JWT and RLS is evaluated against a real session.
 *
 * Creating them prefers the Auth API, but this project's shared SMTP is rate
 * limited (2 emails/hour), so signUp is usually refused with "email rate limit
 * exceeded" and the script falls back to writing the auth.users and
 * auth.identities rows itself, with a bcrypt password. The script prints which
 * route it took. That affects only how the accounts came into existence - the
 * tokens under test are still issued by Auth.
 *
 * If you want the pure Auth-API path, turn off "Confirm email" in
 * Authentication -> Providers -> Email, or configure a custom SMTP.
 *
 * Needs DATABASE_URL (session pooler) for setup and teardown only: confirming
 * the test addresses, granting the temporary admin row, and removing every
 * trace afterwards. It never uses a service-role key - there isn't one.
 *
 * Everything it creates is deleted in the `finally` block, including on failure.
 */

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// --- env -------------------------------------------------------------------

function loadEnv() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const env = {};
  // Split on CRLF as well as LF. A .env.local written on Windows ends lines
  // with \r, and JavaScript's `.` does not match \r, so `(.*)$` would match
  // nothing at all and every variable would look absent.
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    // Strip a trailing ` # comment`, which dotenv allows and a shell strips for
    // free. Only when the value is unquoted and the # follows whitespace, so a
    // # inside a password survives.
    if (!/^["']/.test(value)) value = value.replace(/\s+#.*$/, '').trim();
    env[m[1]] = value.replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DB = env.DATABASE_URL;

for (const [name, value] of [
  ['NEXT_PUBLIC_SUPABASE_URL', URL_],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', ANON],
  ['DATABASE_URL', DB],
]) {
  if (!value) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
}

function sql(statement) {
  return execFileSync('psql', [DB, '-tAc', statement], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

// --- harness ---------------------------------------------------------------

let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`   PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`   FAIL  ${label}${detail ? `  <- ${detail}` : ''}`);
  }
}

function section(name) {
  console.log(`\n${name}`);
}

/** A write is safely refused either by an error or by matching zero rows. */
function refused({ data, error }) {
  if (error) return true;
  return Array.isArray(data) ? data.length === 0 : !data;
}

const suffix = randomBytes(4).toString('hex');
const ADMIN_EMAIL = `sgat-verify-admin-${suffix}@sgat-verify.dev`;
const PLAIN_EMAIL = `sgat-verify-user-${suffix}@sgat-verify.dev`;
const PASSWORD = `Vf-${randomBytes(12).toString('base64url')}`;

const anon = createClient(URL_, ANON, { auth: { persistSession: false } });

let adminSession = null;
let draftEpisodeId = null;
let uploadedPath = null;

/**
 * Creates a user through the Auth API. New projects require email confirmation
 * and the shared SMTP will not deliver to a throwaway address, so if the API
 * route is unavailable the row is created directly with a bcrypt password.
 * Either way the sign-in below goes through Auth and yields a real JWT.
 */
async function createUser(email) {
  const { data, error } = await anon.auth.signUp({ email, password: PASSWORD });

  if (!error && data?.user) {
    // Confirm the address, which is what clicking the emailed link does.
    sql(
      `update auth.users set email_confirmed_at = now(), confirmed_at = now() where email = '${email}'`,
    );
    return { id: data.user.id, via: 'Auth signUp' };
  }

  // GoTrue will not authenticate a user that has no matching identity row, so
  // both records are written, exactly as the Auth API would have written them.
  // Authentication itself still goes through Auth below, so the JWT that RLS
  // sees is genuine.
  sql(`
    with new_user as (
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
        -- These four default to NULL, but GoTrue scans them into non-nullable
        -- Go strings. Leaving them NULL makes every sign-in fail with
        -- "Database error querying schema".
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) values (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
        'authenticated', '${email}', crypt('${PASSWORD}', gen_salt('bf')),
        now(), now(), now(), '{"provider":"email","providers":["email"]}',
        '{}', false, false,
        '', '', '', ''
      )
      returning id, email
    )
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    select
      new_user.id::text, new_user.id,
      jsonb_build_object('sub', new_user.id::text, 'email', new_user.email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    from new_user
  `);
  const id = sql(`select id from auth.users where email = '${email}'`);
  return { id, via: `SQL (Auth API unavailable: ${error?.message ?? 'no user returned'})` };
}

async function signIn(email) {
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return { client, userId: data.user.id };
}

// --- run -------------------------------------------------------------------

try {
  console.log(`\nVerifying RLS on ${URL_}\n`);

  const publishedEpisodes = Number(
    sql('select count(*) from public.episodes where is_published and deleted_at is null'),
  );
  const publishedClips = Number(
    sql('select count(*) from public.clips where is_published and deleted_at is null'),
  );

  section('Creating test identities through Supabase Auth');
  const adminUser = await createUser(ADMIN_EMAIL);
  const plainUser = await createUser(PLAIN_EMAIL);
  console.log(`   admin user     ${adminUser.via}`);
  console.log(`   non-admin user ${plainUser.via}`);

  // Only the first is put on the allow-list.
  sql(`insert into public.admins (email) values ('${ADMIN_EMAIL}') on conflict do nothing`);

  const admin = await signIn(ADMIN_EMAIL);
  adminSession = admin;
  const plain = await signIn(PLAIN_EMAIL);
  check('both test users hold a real Auth session', Boolean(admin.userId && plain.userId));

  // -- is_admin() -----------------------------------------------------------

  section('is_admin() resolves against real auth.users rows');
  const adminFlag = await admin.client.rpc('is_admin');
  const plainFlag = await plain.client.rpc('is_admin');
  check('allow-listed user: is_admin() = true', adminFlag.data === true, JSON.stringify(adminFlag.error));
  check('other user: is_admin() = false', plainFlag.data === false, JSON.stringify(plainFlag.error));

  // -- admin writes ---------------------------------------------------------

  section('Admin can write');
  const insert = await admin.client
    .from('episodes')
    .insert({
      episode_number: 9001,
      title: `RLS verification draft ${suffix}`,
      video_url: 'https://youtu.be/aqz-KE-bpKQ',
      video_provider: 'youtube',
      video_id: 'aqz-KE-bpKQ',
      is_published: false,
    })
    .select()
    .single();
  check('admin can insert an unpublished episode', !insert.error, insert.error?.message);
  draftEpisodeId = insert.data?.id ?? null;

  if (draftEpisodeId) {
    const update = await admin.client
      .from('episodes')
      .update({ description: 'edited by the verification run' })
      .eq('id', draftEpisodeId)
      .select()
      .single();
    check('admin can update', !update.error, update.error?.message);
    check('slug was generated from the title', Boolean(insert.data?.slug), insert.data?.slug);
    check(
      'updated_at moved on update',
      update.data && new Date(update.data.updated_at) >= new Date(update.data.created_at),
    );
  }

  const adminReads = await admin.client.from('episodes').select('id, is_published');
  check(
    'admin sees drafts as well as published',
    (adminReads.data ?? []).length === publishedEpisodes + 1,
    `saw ${adminReads.data?.length}, expected ${publishedEpisodes + 1}`,
  );

  const adminSeesAllowList = await admin.client.from('admins').select('email');
  check('admin can read the allow-list', (adminSeesAllowList.data ?? []).length > 0, adminSeesAllowList.error?.message);

  // -- the draft must be invisible to everyone else --------------------------

  section('The draft is invisible to everyone else');
  const anonEpisodes = await anon.from('episodes').select('id');
  check(
    `anonymous sees only the ${publishedEpisodes} published episodes`,
    (anonEpisodes.data ?? []).length === publishedEpisodes,
    `saw ${anonEpisodes.data?.length}`,
  );

  const plainEpisodes = await plain.client.from('episodes').select('id');
  check(
    'signed-in non-admin sees only published episodes, not the draft',
    (plainEpisodes.data ?? []).length === publishedEpisodes,
    `saw ${plainEpisodes.data?.length}`,
  );

  const plainDirect = await plain.client.from('episodes').select('id').eq('id', draftEpisodeId);
  check('non-admin cannot fetch the draft by its id', (plainDirect.data ?? []).length === 0);

  const anonClips = await anon.from('clips').select('id');
  check(`anonymous sees the ${publishedClips} published clips`, (anonClips.data ?? []).length === publishedClips);

  // -- the allow-list is private --------------------------------------------

  section('The admin allow-list is private (it holds personal addresses)');
  const anonAdmins = await anon.from('admins').select('email');
  check('anonymous cannot read it', (anonAdmins.data ?? []).length === 0, `leaked ${anonAdmins.data?.length}`);
  const plainAdmins = await plain.client.from('admins').select('email');
  check('a signed-in non-admin cannot read it', (plainAdmins.data ?? []).length === 0, `leaked ${plainAdmins.data?.length}`);

  // -- non-admin writes -----------------------------------------------------

  section('A signed-in non-admin cannot write anything');
  const attempts = [
    ['insert an episode', () => plain.client.from('episodes').insert({
      episode_number: 9002, title: 'nope', video_url: 'https://youtu.be/x',
      video_provider: 'youtube', video_id: 'xxxxxxxxxxx',
    }).select()],
    ['edit a published episode', () => plain.client.from('episodes').update({ title: 'Defaced' }).eq('is_published', true).select()],
    ['delete a clip', () => plain.client.from('clips').delete().eq('is_published', true).select()],
    ['edit site settings', () => plain.client.from('site_settings').update({ about_body: 'Defaced' }).eq('id', 1).select()],
    ['edit a host bio', () => plain.client.from('hosts').update({ bio: 'Defaced' }).neq('id', '00000000-0000-0000-0000-000000000000').select()],
    ['add itself to the allow-list', () => plain.client.from('admins').insert({ email: PLAIN_EMAIL }).select()],
    ['schedule a live event', () => plain.client.from('live_events').insert({
      title: 'nope', platform: 'youtube', url: 'https://x.com', scheduled_at: new Date().toISOString(),
    }).select()],
  ];
  for (const [label, run] of attempts) {
    check(`refused: ${label}`, refused(await run()));
  }

  section('An anonymous visitor cannot write anything');
  const anonAttempts = [
    ['insert an episode', () => anon.from('episodes').insert({
      episode_number: 9003, title: 'nope', video_url: 'https://youtu.be/x',
      video_provider: 'youtube', video_id: 'xxxxxxxxxxx',
    }).select()],
    ['edit site settings', () => anon.from('site_settings').update({ about_body: 'Defaced' }).eq('id', 1).select()],
    ['add itself to the allow-list', () => anon.from('admins').insert({ email: 'attacker@example.com' }).select()],
  ];
  for (const [label, run] of anonAttempts) {
    check(`refused: ${label}`, refused(await run()));
  }

  // -- storage --------------------------------------------------------------

  section('Storage buckets');
  const file = new Blob([randomBytes(64)], { type: 'image/png' });
  uploadedPath = `verification-${suffix}.png`;

  const adminUpload = await admin.client.storage.from('thumbnails').upload(uploadedPath, file, {
    contentType: 'image/png',
  });
  check('admin can upload to thumbnails', !adminUpload.error, adminUpload.error?.message);

  const plainUpload = await plain.client.storage
    .from('thumbnails')
    .upload(`intruder-${suffix}.png`, file, { contentType: 'image/png' });
  check('signed-in non-admin cannot upload', Boolean(plainUpload.error), plainUpload.error ? '' : 'UPLOAD SUCCEEDED');

  const anonUpload = await anon.storage
    .from('thumbnails')
    .upload(`anon-${suffix}.png`, file, { contentType: 'image/png' });
  check('anonymous cannot upload', Boolean(anonUpload.error), anonUpload.error ? '' : 'UPLOAD SUCCEEDED');

  if (!adminUpload.error) {
    const publicUrl = anon.storage.from('thumbnails').getPublicUrl(uploadedPath).data.publicUrl;
    const fetched = await fetch(publicUrl);
    check('an uploaded image is publicly readable (needed by next/image)', fetched.ok, `status ${fetched.status}`);

    const plainDelete = await plain.client.storage.from('thumbnails').remove([uploadedPath]);
    const stillThere = await fetch(publicUrl);
    check('non-admin cannot delete an image', stillThere.ok, plainDelete.error ? '' : 'FILE WAS DELETED');
  }

  const anonHostPhotos = await anon.storage.from('host-photos').list();
  check('host-photos is publicly listable', !anonHostPhotos.error, anonHostPhotos.error?.message);

  // -- constraints ----------------------------------------------------------

  section('Database constraints still hold through the API');
  const noAlt = await admin.client
    .from('episodes')
    .insert({
      episode_number: 9004, title: 'no alt text', video_url: 'https://youtu.be/x',
      video_provider: 'youtube', video_id: 'xxxxxxxxxxx', thumbnail_path: 'x.jpg',
    })
    .select();
  check('an image without alt text is rejected', Boolean(noAlt.error), noAlt.error ? '' : 'ACCEPTED');

  const publishedNoDate = await admin.client
    .from('episodes')
    .insert({
      episode_number: 9005, title: 'published with no date', video_url: 'https://youtu.be/x',
      video_provider: 'youtube', video_id: 'xxxxxxxxxxx', is_published: true,
    })
    .select();
  check('publishing without a date is rejected', Boolean(publishedNoDate.error), publishedNoDate.error ? '' : 'ACCEPTED');
} finally {
  // --- teardown, even on failure -------------------------------------------
  section('Cleaning up');

  // Storage objects must go through the Storage API - Supabase installs a
  // trigger that blocks DELETE on storage.objects - and it has to happen while
  // the admin session still exists, i.e. before the allow-list row is removed.
  if (adminSession) {
    for (const bucket of ['thumbnails', 'host-photos']) {
      try {
        const { data } = await adminSession.client.storage.from(bucket).list();
        const mine = (data ?? [])
          .map((f) => f.name)
          .filter((n) => n.includes(suffix));
        if (mine.length) {
          await adminSession.client.storage.from(bucket).remove(mine);
          console.log(`   removed ${mine.length} file(s) from ${bucket}`);
        }
      } catch (e) {
        console.error(`   could not clear ${bucket}: ${e.message}`);
      }
    }
  }

  // Each step is independent: one failure must not skip the rest, which is
  // exactly how a leftover admin row survived an earlier run.
  const steps = [
    ['test episodes', 'delete from public.episodes where episode_number >= 9000'],
    ['allow-list row', `delete from public.admins where email like 'sgat-verify-%'`],
    ['auth identities', `delete from auth.identities where identity_data->>'email' like 'sgat-verify-%'`],
    ['auth users', `delete from auth.users where email like 'sgat-verify-%'`],
  ];
  for (const [label, statement] of steps) {
    try {
      sql(statement);
    } catch (e) {
      console.error(`   FAILED to remove ${label}: ${e.message.split('\n')[0]}`);
    }
  }

  try {
    const leftover = sql(`
      select
        (select count(*) from public.admins where email like 'sgat-verify-%') || ' allow-list, ' ||
        (select count(*) from auth.users where email like 'sgat-verify-%') || ' users, ' ||
        (select count(*) from public.episodes where episode_number >= 9000) || ' episodes'
    `);
    console.log(`   leftovers remaining: ${leftover}`);
    if (!/^0 allow-list, 0 users, 0 episodes$/.test(leftover)) {
      console.error(`   NOT CLEAN - remove by hand: ${ADMIN_EMAIL}, ${PLAIN_EMAIL}`);
    }
  } catch (e) {
    console.error(`   could not confirm cleanup: ${e.message.split('\n')[0]}`);
  }
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nRLS holds for anonymous, signed-in non-admin, and admin.\n');
