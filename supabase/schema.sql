-- OPEN GRAIN — Supabase schema (Studio panel backend)
-- Run this once in your Supabase project's SQL editor (or via `supabase db push`).
-- Design: single-tenant admin app. Public visitors (anon role) can only read
-- published portfolio items / selected social posts and submit the contact
-- form (insert into `enquiries`). Everything else requires an authenticated
-- user whose email is listed in `admins`.

create extension if not exists "pgcrypto";

-- ---------- Admin allow-list ----------
create table if not exists admins (
  email text primary key
);
-- Add yourself once you create your Supabase Auth user:
-- insert into admins (email) values ('adamabalde1998@gmail.com');

create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from admins where email = (auth.jwt() ->> 'email')
  );
$$ language sql stable security definer;

-- ---------- Portfolio ----------
create table if not exists portfolio_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references portfolio_categories(id) on delete set null,
  title text not null,
  subtitle text,
  cover_image_url text,
  sort_order int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Social ----------
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram','tiktok')),
  handle text not null,
  connected_at timestamptz
);

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram','tiktok')),
  external_url text not null,
  image_url text,
  caption text,
  is_selected boolean not null default false, -- shown on the public footer
  sort_order int not null default 0
);

-- ---------- Clients & projects ----------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  title text not null,
  service text,
  status text not null default 'enquiry' check (status in ('enquiry','confirmed','in_progress','delivered','cancelled')),
  event_date date,
  budget_range text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Inventory ----------
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  quantity int not null default 0,
  reserved_quantity int not null default 0,
  notes text
);

-- ---------- Quotes & contracts ----------
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  amount numeric(10,2),
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined')),
  document_url text,
  created_at timestamptz not null default now()
);

-- ---------- Public contact form submissions ----------
create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  service text,
  preferred_date date,
  budget_range text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','archived')),
  created_at timestamptz not null default now()
);

-- ---------- Activity log ----------
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text not null,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table portfolio_categories enable row level security;
alter table portfolio_projects   enable row level security;
alter table social_accounts      enable row level security;
alter table social_posts         enable row level security;
alter table clients              enable row level security;
alter table projects             enable row level security;
alter table inventory_items      enable row level security;
alter table quotes               enable row level security;
alter table enquiries            enable row level security;
alter table activity_log         enable row level security;
alter table admins               enable row level security;

-- Public (anon) read access: only published/selected content
create policy "public read published categories" on portfolio_categories
  for select using (is_active = true);
create policy "public read published projects" on portfolio_projects
  for select using (is_published = true);
create policy "public read selected social posts" on social_posts
  for select using (is_selected = true);

-- Public (anon) can submit the contact form, nothing else
create policy "public can submit enquiries" on enquiries
  for insert with check (true);

-- Admin (authenticated + in admins table) full access everywhere
create policy "admin full access categories" on portfolio_categories for all using (is_admin()) with check (is_admin());
create policy "admin full access projects" on portfolio_projects for all using (is_admin()) with check (is_admin());
create policy "admin full access social_accounts" on social_accounts for all using (is_admin()) with check (is_admin());
create policy "admin full access social_posts" on social_posts for all using (is_admin()) with check (is_admin());
create policy "admin full access clients" on clients for all using (is_admin()) with check (is_admin());
create policy "admin full access projects_table" on projects for all using (is_admin()) with check (is_admin());
create policy "admin full access inventory" on inventory_items for all using (is_admin()) with check (is_admin());
create policy "admin full access quotes" on quotes for all using (is_admin()) with check (is_admin());
create policy "admin read enquiries" on enquiries for select using (is_admin());
create policy "admin update enquiries" on enquiries for update using (is_admin()) with check (is_admin());
create policy "admin read activity" on activity_log for select using (is_admin());
create policy "admin insert activity" on activity_log for insert with check (is_admin());

-- Seed the real categories seen in the current Studio panel
insert into portfolio_categories (name, slug, sort_order) values
  ('Gastronomía', 'gastronomia', 1),
  ('Retratos y parejas', 'retratos-y-parejas', 2),
  ('Eventos', 'eventos', 3),
  ('UGC', 'ugc', 4),
  ('Marcas y negocios', 'marcas-y-negocios', 5),
  ('Vídeo y reels', 'video-y-reels', 6)
on conflict (slug) do nothing;

-- ============================================================
-- Content editor + real photo uploads (see migration_content_editor.sql
-- for the standalone version of this block, meant to be run once against
-- an existing project that already has the tables above).
-- ============================================================

-- ---------- Editable marketing copy (Studio → Site content / AI assistant) ----------
create table if not exists site_content (
  key text not null,
  lang text not null check (lang in ('en','es')),
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (key, lang)
);
alter table site_content enable row level security;

drop policy if exists "public read site content" on site_content;
create policy "public read site content" on site_content
  for select using (true);

drop policy if exists "admin write site content" on site_content;
create policy "admin write site content" on site_content
  for all using (is_admin()) with check (is_admin());

-- ---------- Photo size/layout control per project ----------
alter table portfolio_projects
  add column if not exists layout_class text not null default 'tall';

-- ---------- Storage bucket for real uploaded photos ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "admin upload media" on storage.objects;
create policy "admin upload media" on storage.objects
  for insert with check (bucket_id = 'media' and is_admin());

drop policy if exists "admin update media" on storage.objects;
create policy "admin update media" on storage.objects
  for update using (bucket_id = 'media' and is_admin());

drop policy if exists "admin delete media" on storage.objects;
create policy "admin delete media" on storage.objects
  for delete using (bucket_id = 'media' and is_admin());

-- ============================================================
-- Studio CMS dashboard v2 (2026): draft/published/hidden project
-- states, replacing the old boolean is_published as the primary
-- signal (is_published is kept in sync for backward compatibility
-- with any existing "public read published" policy/query).
-- ============================================================
alter table portfolio_projects
  add column if not exists status text not null default 'draft'
  check (status in ('draft','published','hidden'));

update portfolio_projects set status = 'published'
  where is_published = true and status = 'draft';

-- ============================================================
-- Client proofing galleries (2026): a private, shareable gallery per
-- project where a client can view preview photos, mark favorites, and
-- download them — no client account needed. `download_url` is an
-- OPTIONAL external link (Drive/WeTransfer/Dropbox/anything) for the
-- full-resolution originals, kept deliberately outside Supabase
-- Storage so preview-quality images are the only thing counted
-- against your Storage/bandwidth quota. See migration_client_galleries.sql
-- for the full rationale.
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

drop policy if exists "admin full access client_galleries" on client_galleries;
create policy "admin full access client_galleries" on client_galleries
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin full access gallery_photos" on gallery_photos;
create policy "admin full access gallery_photos" on gallery_photos
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin full access gallery_favorites" on gallery_favorites;
create policy "admin full access gallery_favorites" on gallery_favorites
  for all using (is_admin()) with check (is_admin());

drop policy if exists "public read active galleries" on client_galleries;
create policy "public read active galleries" on client_galleries
  for select using (is_active = true);

drop policy if exists "public read photos of active galleries" on gallery_photos;
create policy "public read photos of active galleries" on gallery_photos
  for select using (
    exists (select 1 from client_galleries g where g.id = gallery_photos.gallery_id and g.is_active = true)
  );

drop policy if exists "public manage favorites on active galleries" on gallery_favorites;
create policy "public manage favorites on active galleries" on gallery_favorites
  for all using (
    exists (select 1 from client_galleries g where g.id = gallery_favorites.gallery_id and g.is_active = true)
  )
  with check (
    exists (select 1 from client_galleries g where g.id = gallery_favorites.gallery_id and g.is_active = true)
  );

-- ============================================================
-- Original files + download log (2026): per-photo full-resolution
-- originals now live in Supabase Storage (accepted storage cost, in
-- exchange for a ZIP-all download, per-file download, and a real
-- download log) — see migration_gallery_downloads.sql for the
-- standalone version + full rationale. `download_url` above is kept
-- as an optional fallback (e.g. an external Drive link) for projects
-- that don't use per-photo originals.
-- ============================================================
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

-- Public (anon) can only INSERT a download record (log entries are
-- write-only for visitors — never readable or editable by them),
-- scoped to galleries that are actually active.
drop policy if exists "public log downloads on active galleries" on gallery_downloads;
create policy "public log downloads on active galleries" on gallery_downloads
  for insert with check (
    exists (select 1 from client_galleries g where g.id = gallery_downloads.gallery_id and g.is_active = true)
  );

-- ============================================================
-- Photo dimensions + purpose tags (2026): `width`/`height` (in
-- pixels, captured from the preview image at upload time) let the
-- client gallery show each photo in its real aspect ratio instead of
-- forcing a square crop. `categories` is a free-form list of tags
-- ("stories", "post", "reel", "texto"...) so the studio can mark what
-- each photo is meant for, and the client can filter by that. See
-- migration_gallery_photo_meta.sql for the standalone version.
-- ============================================================
alter table gallery_photos
  add column if not exists width int,
  add column if not exists height int,
  add column if not exists categories text[] not null default '{}';

-- ============================================================
-- Revision requests (2026): the client selects one or more photos and
-- leaves a single note asking for a change (not an open-ended chat —
-- one note, an optional reply from the studio, and a resolved state).
-- See migration_gallery_revisions.sql for the standalone version.
-- ============================================================
create table if not exists gallery_revisions (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references client_galleries(id) on delete cascade,
  comment text not null,
  reply text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists gallery_revision_photos (
  revision_id uuid not null references gallery_revisions(id) on delete cascade,
  photo_id uuid not null references gallery_photos(id) on delete cascade,
  primary key (revision_id, photo_id)
);

alter table gallery_revisions       enable row level security;
alter table gallery_revision_photos enable row level security;

drop policy if exists "admin full access gallery_revisions" on gallery_revisions;
create policy "admin full access gallery_revisions" on gallery_revisions
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin full access gallery_revision_photos" on gallery_revision_photos;
create policy "admin full access gallery_revision_photos" on gallery_revision_photos
  for all using (is_admin()) with check (is_admin());

-- Public (anon) can read and create revision requests on active
-- galleries (same "anyone with the link" trust model as favorites),
-- but can never update or delete one — only the studio can reply or
-- mark it resolved.
drop policy if exists "public read revisions on active galleries" on gallery_revisions;
create policy "public read revisions on active galleries" on gallery_revisions
  for select using (
    exists (select 1 from client_galleries g where g.id = gallery_revisions.gallery_id and g.is_active = true)
  );

drop policy if exists "public create revisions on active galleries" on gallery_revisions;
create policy "public create revisions on active galleries" on gallery_revisions
  for insert with check (
    exists (select 1 from client_galleries g where g.id = gallery_revisions.gallery_id and g.is_active = true)
  );

drop policy if exists "public read revision photos on active galleries" on gallery_revision_photos;
create policy "public read revision photos on active galleries" on gallery_revision_photos
  for select using (
    exists (
      select 1 from gallery_revisions r
      join client_galleries g on g.id = r.gallery_id
      where r.id = gallery_revision_photos.revision_id and g.is_active = true
    )
  );

drop policy if exists "public link revision photos on active galleries" on gallery_revision_photos;
create policy "public link revision photos on active galleries" on gallery_revision_photos
  for insert with check (
    exists (
      select 1 from gallery_revisions r
      join client_galleries g on g.id = r.gallery_id
      where r.id = gallery_revision_photos.revision_id and g.is_active = true
    )
  );
