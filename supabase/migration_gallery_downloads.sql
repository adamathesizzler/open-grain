-- OPEN GRAIN — Migration: original files + download log for client galleries
-- Run this once in your Supabase project's SQL editor, AFTER
-- migration_client_galleries.sql has already been run.
--
-- WHAT THIS ADDS AND WHY
-- -----------------------
-- The client gallery originally kept full-resolution original photos
-- OUTSIDE Supabase (an external link you paste in — Drive, WeTransfer,
-- etc.) specifically to avoid Storage/bandwidth costs.
--
-- You've now asked for three things that need the files to actually
-- live in your own system instead of just being an external link:
--   1. Let the client download everything as one ZIP file.
--   2. Let the client download photos one by one.
--   3. Keep a record of what each client downloaded and when.
--
-- None of those are possible against a plain external link (there's
-- nothing for your site to fetch, zip, or log). So this migration adds
-- an OPTIONAL `original_url` per photo — when you attach a
-- full-resolution file to a photo in Studio, it's uploaded to your
-- existing `media` Storage bucket, and that's what gets zipped,
-- downloaded individually, and logged.
--
-- This does mean those original files now count against your Supabase
-- Storage quota (the thing the first design avoided) — you confirmed
-- you're OK with that trade-off in exchange for ZIP + per-file
-- download + a download log. The old `download_url` field (external
-- link) is kept as a fallback: if a gallery has no per-photo originals
-- uploaded, the "download all" button on the client page still uses
-- that external link, so nothing breaks for galleries set up the old
-- way.
--
-- No new Storage policies are needed: originals are uploaded to the
-- same `media` bucket that already has public-read + admin-write
-- policies from migration_content_editor.sql / schema.sql.

alter table gallery_photos
  add column if not exists original_url text,
  add column if not exists original_filename text,
  add column if not exists original_bytes bigint;

create table if not exists gallery_downloads (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references client_galleries(id) on delete cascade,
  photo_id uuid references gallery_photos(id) on delete set null, -- null = "download all as ZIP"
  download_type text not null check (download_type in ('photo', 'zip_all')),
  created_at timestamptz not null default now()
);

alter table gallery_downloads enable row level security;

drop policy if exists "admin full access gallery_downloads" on gallery_downloads;
create policy "admin full access gallery_downloads" on gallery_downloads
  for all using (is_admin()) with check (is_admin());

-- Visitors (anon, no login) can only ever INSERT a log row — never
-- read, update or delete one — and only for a gallery that is active.
-- No personal data is stored: just which photo (or "the whole zip"),
-- for which gallery, and when.
drop policy if exists "public log downloads on active galleries" on gallery_downloads;
create policy "public log downloads on active galleries" on gallery_downloads
  for insert with check (
    exists (select 1 from client_galleries g where g.id = gallery_downloads.gallery_id and g.is_active = true)
  );
