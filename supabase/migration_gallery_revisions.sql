-- OPEN GRAIN — Migration: client revision requests for client galleries
-- Run this once in your Supabase project's SQL editor, AFTER
-- migration_client_galleries.sql has already been run.
--
-- WHAT THIS ADDS AND WHY
-- -----------------------
-- The client can select one or more photos in their gallery and leave
-- a single note asking for a change (e.g. "these two, brighter please"
-- or "remove the sign in the background of this one"). This is NOT an
-- open-ended chat thread — it's one note per request, an optional
-- reply from the studio, and a resolved/open state.
--
-- `gallery_revisions` holds the request itself (the client's comment,
-- your optional reply, and its status). `gallery_revision_photos` is
-- a join table so one request can cover a single photo or several at
-- once.

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

-- Public (anon, no login) can read and create revision requests on
-- active galleries — same "anyone with the link" trust model already
-- used for favorites — but can never update or delete one. Only the
-- studio (admin) can write a reply or mark a request resolved.
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
