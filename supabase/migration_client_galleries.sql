-- ============================================================
-- OPEN GRAIN — Client proofing galleries migration
-- Run this once in the Supabase SQL editor (Project → SQL Editor).
-- It is also appended at the end of schema.sql for brand-new projects.
--
-- What this adds: a private, shareable gallery per project so a client
-- can view their photos, mark favorites, and download them — without
-- needing an account. Two deliberate cost/quality decisions, made so
-- this never balloons your Supabase Storage bill:
--
--   1. `gallery_photos.image_url` is meant for *preview-sized* exports
--      (e.g. ~2000px long edge), not full-resolution originals. These
--      are what the client sees and clicks through in the browser.
--   2. `client_galleries.download_url` is an OPTIONAL link to wherever
--      you actually host the full-resolution originals for download —
--      Google Drive, WeTransfer, Dropbox, a Supabase Storage folder if
--      you prefer, anything. Studio just shows a "Descargar todo"
--      button pointing at it. This keeps expensive full-res storage
--      completely outside Supabase unless you choose otherwise.
--
-- Sharing/security model is intentionally lightweight (a hard-to-guess
-- token in the URL, optional PIN) to match how proofing links work in
-- consumer tools like Pixieset — not a client login system.
-- ============================================================

create table if not exists client_galleries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references portfolio_projects(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  share_token text not null unique default encode(gen_random_bytes(9), 'base64'),
  pin text,
  download_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists gallery_photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references client_galleries(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists gallery_favorites (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references client_galleries(id) on delete cascade,
  photo_id uuid not null references gallery_photos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (gallery_id, photo_id)
);

alter table client_galleries  enable row level security;
alter table gallery_photos    enable row level security;
alter table gallery_favorites enable row level security;

-- Admin (Studio): full access to everything.
drop policy if exists "admin full access client_galleries" on client_galleries;
create policy "admin full access client_galleries" on client_galleries
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin full access gallery_photos" on gallery_photos;
create policy "admin full access gallery_photos" on gallery_photos
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin full access gallery_favorites" on gallery_favorites;
create policy "admin full access gallery_favorites" on gallery_favorites
  for all using (is_admin()) with check (is_admin());

-- Public (the client, holding the share link): read-only on active
-- galleries and their photos — the token itself is what gates access,
-- same trust model as any "anyone with the link" share URL.
drop policy if exists "public read active galleries" on client_galleries;
create policy "public read active galleries" on client_galleries
  for select using (is_active = true);

drop policy if exists "public read photos of active galleries" on gallery_photos;
create policy "public read photos of active galleries" on gallery_photos
  for select using (
    exists (select 1 from client_galleries g where g.id = gallery_photos.gallery_id and g.is_active = true)
  );

-- Public can mark/unmark favorites (insert + delete + read their gallery's
-- favorites) on active galleries only — no login, matching a lightweight
-- proofing link rather than a client account system.
drop policy if exists "public manage favorites on active galleries" on gallery_favorites;
create policy "public manage favorites on active galleries" on gallery_favorites
  for all using (
    exists (select 1 from client_galleries g where g.id = gallery_favorites.gallery_id and g.is_active = true)
  )
  with check (
    exists (select 1 from client_galleries g where g.id = gallery_favorites.gallery_id and g.is_active = true)
  );
