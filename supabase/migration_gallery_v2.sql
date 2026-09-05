-- OPEN GRAIN — Galería de cliente v2 (2026)
-- Standalone migration: run this once against a project that already has
-- migration_client_galleries.sql, migration_gallery_downloads.sql,
-- migration_gallery_photo_meta.sql and migration_gallery_revisions.sql
-- applied (this file only ADDS to those tables/policies — nothing here
-- drops or replaces the existing proofing/revisions feature).
--
-- What this adds, to match the approved mockups:
--   1. Draft/publish/expiry workflow for a gallery, plus a cover image.
--   2. Video support on gallery_photos (renamed conceptually to "media"
--      in the UI, but the table itself keeps its name to avoid breaking
--      existing rows/policies/foreign keys).
--   3. A 5th category ("web") and a rename of the old "texto" tag to
--      "mensajes" to match the new label set exactly.
--   4. Per-item cover flag and a "calidad completa" flag controlling
--      whether that item's original is offered for download.
--   5. A brand-new attachments feature (PDF/TXT/DOCX/XLSX/ZIP/audio).
--   6. Real server-side PIN validation: the PIN is no longer readable by
--      the anon role at all. A `security definer` RPC does the check and
--      applies basic rate limiting (5 tries, then a 5-minute lock).
--   7. A visits log, so Studio can show "Última visita" and real totals.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- 1. Gallery-level workflow fields ----------
alter table client_galleries
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'published', 'disabled', 'expired', 'archived')),
  add column if not exists expires_at timestamptz,
  add column if not exists cover_url text,
  add column if not exists client_name text,
  add column if not exists pin_hash text,
  add column if not exists pin_attempts int not null default 0,
  add column if not exists pin_locked_until timestamptz,
  add column if not exists has_pin boolean not null default false;

-- `has_pin` is a public-safe flag (no secret in it) so gallery.html can
-- know whether to show the PIN screen WITHOUT ever calling the check
-- function blindly (which would otherwise burn one of the 5 rate-limited
-- attempts every time someone just loads the page).
create or replace function gallery_sync_has_pin() returns trigger as $$
begin
  new.has_pin := (new.pin_hash is not null);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_gallery_sync_has_pin on client_galleries;
create trigger trg_gallery_sync_has_pin before insert or update of pin_hash on client_galleries
  for each row execute function gallery_sync_has_pin();

update client_galleries set has_pin = (pin_hash is not null);

-- Backfill status from the existing is_active boolean so nothing already
-- shared silently changes state: active galleries become "published",
-- inactive ones "disabled" (an admin can move a disabled gallery back to
-- draft manually if that's what they actually meant).
update client_galleries set status = case when is_active then 'published' else 'disabled' end
  where status = 'draft';

-- Migrate any existing plaintext PIN to a hash, then blank the plaintext
-- column out. `pin` is kept (nullable) only so older code/reports that
-- reference the column name don't hard-error — it is never written to or
-- read for authentication purposes from here on.
update client_galleries
  set pin_hash = crypt(pin, gen_salt('bf'))
  where pin is not null and pin <> '' and pin_hash is null;
update client_galleries set pin = null where pin_hash is not null;

-- A gallery whose expiry date has passed should behave as unavailable
-- regardless of its stored status. This helper is used by the public
-- policy and by the RPC below.
create or replace function gallery_is_reachable(g client_galleries) returns boolean as $$
  select g.status = 'published' and (g.expires_at is null or g.expires_at > now());
$$ language sql stable;

-- ---------- 2. Media: video support + per-item flags ----------
alter table gallery_photos
  add column if not exists type text not null default 'photo' check (type in ('photo', 'video')),
  add column if not exists poster_url text,
  add column if not exists duration_seconds numeric,
  add column if not exists is_cover boolean not null default false,
  add column if not exists full_quality boolean not null default true,
  add column if not exists processing_status text not null default 'ready'
    check (processing_status in ('uploading', 'processing', 'ready', 'error'));

-- Rename the old "texto" tag to the new "mensajes" label (the 5th value,
-- "web", needs no migration — it simply becomes selectable going forward).
update gallery_photos
  set categories = array_replace(categories, 'texto', 'mensajes')
  where 'texto' = any(categories);

-- ---------- 3. Attachments (PDF / TXT / DOCX / XLSX / ZIP / audio…) ----------
create table if not exists gallery_attachments (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references client_galleries(id) on delete cascade,
  file_url text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  sort_order int not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table gallery_attachments enable row level security;

drop policy if exists "admin full access gallery_attachments" on gallery_attachments;
create policy "admin full access gallery_attachments" on gallery_attachments
  for all using (is_admin()) with check (is_admin());

drop policy if exists "public read attachments of reachable galleries" on gallery_attachments;
create policy "public read attachments of reachable galleries" on gallery_attachments
  for select using (
    is_hidden = false and exists (
      select 1 from client_galleries g where g.id = gallery_attachments.gallery_id and gallery_is_reachable(g)
    )
  );

-- ---------- 4. Visits log ("Última visita" / total visits in Studio) ----------
create table if not exists gallery_visits (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references client_galleries(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table gallery_visits enable row level security;

drop policy if exists "admin read gallery_visits" on gallery_visits;
create policy "admin read gallery_visits" on gallery_visits
  for select using (is_admin());

drop policy if exists "public log visits on reachable galleries" on gallery_visits;
create policy "public log visits on reachable galleries" on gallery_visits
  for insert with check (
    exists (select 1 from client_galleries g where g.id = gallery_visits.gallery_id and gallery_is_reachable(g))
  );

-- ---------- 5. Downloads: widen the type check for the new content ----------
alter table gallery_downloads drop constraint if exists gallery_downloads_download_type_check;
alter table gallery_downloads add constraint gallery_downloads_download_type_check
  check (download_type in ('photo', 'video', 'zip_all', 'attachment', 'zip_attachments'));
alter table gallery_downloads
  add column if not exists attachment_id uuid references gallery_attachments(id) on delete set null;

-- ---------- 6. Public read policy now checks `gallery_is_reachable`, and
--    NEVER selects pin/pin_hash — gallery.html fetches only a safe column
--    list, and this policy makes the row visible at all only once
--    reachable (an unpublished/expired/disabled gallery is invisible to
--    the anon role — matches "enlace no disponible" instead of leaking
--    that a gallery with that token exists but isn't public yet).
-- ----------
drop policy if exists "public read active galleries" on client_galleries;
create policy "public read active galleries" on client_galleries
  for select using (gallery_is_reachable(client_galleries));

drop policy if exists "public read photos of active galleries" on gallery_photos;
create policy "public read photos of active galleries" on gallery_photos
  for select using (
    exists (select 1 from client_galleries g where g.id = gallery_photos.gallery_id and gallery_is_reachable(g))
  );

drop policy if exists "public manage favorites on active galleries" on gallery_favorites;
create policy "public manage favorites on active galleries" on gallery_favorites
  for all using (
    exists (select 1 from client_galleries g where g.id = gallery_favorites.gallery_id and gallery_is_reachable(g))
  )
  with check (
    exists (select 1 from client_galleries g where g.id = gallery_favorites.gallery_id and gallery_is_reachable(g))
  );

drop policy if exists "public log downloads on active galleries" on gallery_downloads;
create policy "public log downloads on active galleries" on gallery_downloads
  for insert with check (
    exists (select 1 from client_galleries g where g.id = gallery_downloads.gallery_id and gallery_is_reachable(g))
  );

drop policy if exists "public read revisions on active galleries" on gallery_revisions;
create policy "public read revisions on active galleries" on gallery_revisions
  for select using (
    exists (select 1 from client_galleries g where g.id = gallery_revisions.gallery_id and gallery_is_reachable(g))
  );

drop policy if exists "public create revisions on active galleries" on gallery_revisions;
create policy "public create revisions on active galleries" on gallery_revisions
  for insert with check (
    exists (select 1 from client_galleries g where g.id = gallery_revisions.gallery_id and gallery_is_reachable(g))
  );

-- ---------- 7. Server-side PIN check (rate-limited, no plaintext ever sent
--    to the browser). Returns true/false. `security definer` lets it read
--    pin_hash/pin_attempts even though the anon role can't select them
--    directly (there is no "public read pin" policy — anon has zero
--    column-level access to it outside this function).
-- ----------
create or replace function gallery_check_pin(p_token text, p_pin text) returns boolean as $$
declare
  g client_galleries;
  ok boolean;
begin
  select * into g from client_galleries where share_token = p_token and gallery_is_reachable(client_galleries.*);
  if not found then
    return false;
  end if;

  -- No PIN set on this gallery: nothing to check, let the caller in.
  if g.pin_hash is null then
    return true;
  end if;

  if g.pin_locked_until is not null and g.pin_locked_until > now() then
    return false;
  end if;

  ok := (crypt(p_pin, g.pin_hash) = g.pin_hash);

  if ok then
    update client_galleries set pin_attempts = 0, pin_locked_until = null where id = g.id;
  else
    update client_galleries
      set pin_attempts = g.pin_attempts + 1,
          pin_locked_until = case when g.pin_attempts + 1 >= 5 then now() + interval '5 minutes' else null end
      where id = g.id;
  end if;

  return ok;
end;
$$ language plpgsql security definer;

-- Anyone (anon included) may call the check function — it never returns
-- the PIN itself, only a boolean, and it is the only path to the PIN.
grant execute on function gallery_check_pin(text, text) to anon, authenticated;
grant execute on function gallery_is_reachable(client_galleries) to anon, authenticated;

-- Admin helper to set a gallery's PIN (used from Studio; hashes server-side
-- via the same RPC path so the plaintext PIN never lives in a column).
create or replace function gallery_set_pin(p_gallery_id uuid, p_pin text) returns void as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  if p_pin is null or p_pin = '' then
    update client_galleries set pin_hash = null, pin_attempts = 0, pin_locked_until = null where id = p_gallery_id;
  else
    update client_galleries set pin_hash = crypt(p_pin, gen_salt('bf')), pin_attempts = 0, pin_locked_until = null where id = p_gallery_id;
  end if;
end;
$$ language plpgsql security definer;
grant execute on function gallery_set_pin(uuid, text) to authenticated;

-- ---------- 7b. Column-level hardening: belt-and-braces on top of the app
--    only ever using an explicit column list — even a hand-crafted REST
--    call as anon can never select pin/pin_hash/pin_attempts/pin_locked_until.
--    (`authenticated`/admin keeps whatever table-wide grant Supabase set up
--    by default — this only narrows the anon role.)
-- ----------
revoke select on client_galleries from anon;
grant select (
  id, project_id, client_id, title, share_token, download_url, is_active,
  created_at, status, expires_at, cover_url, client_name, has_pin
) on client_galleries to anon;

-- ---------- 8. Storage: attachments live in the same public `media` bucket
--    under galleries/<id>/attachments — no new bucket/policy needed since
--    migration_content_editor.sql already made that bucket public-read +
--    admin-write.
-- ============================================================
