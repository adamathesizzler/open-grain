-- Repair the existing admin predicate's relation resolution, not its authorization policy.
-- The empty search_path of caller RPCs must not break this pre-existing helper.
DO $$
DECLARE current_body text;
BEGIN
 SELECT regexp_replace(p.prosrc, '\s', '', 'g') INTO current_body
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 JOIN pg_catalog.pg_language l ON l.oid=p.prolang
 WHERE n.nspname='public' AND p.proname='is_admin' AND p.pronargs=0
   AND p.prorettype='boolean'::regtype AND p.prosecdef AND l.lanname='sql';
 IF current_body IS NULL OR current_body NOT IN (
  'selectexists(select1fromadminswhereemail=(auth.jwt()->>''email''));',
  'selectexists(select1frompublic.adminswhereemail=(auth.jwt()->>''email''));'
 ) THEN RAISE EXCEPTION 'Admin predicate changed; review before replacing'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 select exists (
   select 1 from public.admins where email = (auth.jwt() ->> 'email')
 );
$$;
-- CREATE OR REPLACE retains the existing owner and execute ACL. No GRANT/REVOKE,
-- RLS policy, admin membership, user account, JWT predicate, or data is changed.
