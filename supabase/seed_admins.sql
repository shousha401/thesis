-- ---------------------------------------------------------------------------
-- Admin allow-list
--
-- Only an email in this table can sign in to /admin. Everyone else gets the
-- "not authorized" page, even if they successfully receive a magic link.
--
-- HOW TO RUN
--   1. Replace the three placeholder addresses below with the hosts' real
--      email addresses. They must be lowercase.
--   2. Supabase dashboard -> SQL Editor -> paste -> Run.
--
-- This file is deliberately separate from seed.sql: seed.sql is throwaway demo
-- content, this is access control. Re-running it is safe.
--
-- To revoke access later, delete the row:
--   delete from public.admins where email = 'someone@example.com';
-- ---------------------------------------------------------------------------

insert into public.admins (email)
values
  ('host-one@example.com'),
  ('host-two@example.com'),
  ('host-three@example.com')
on conflict (email) do nothing;

-- Verify:
-- select email, created_at from public.admins order by created_at;
