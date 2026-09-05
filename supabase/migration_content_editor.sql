-- OPEN GRAIN — migration: editable site content + real photo uploads
-- Run this once in Supabase → SQL Editor (safe to re-run — every
-- statement is idempotent). This adds on top of the existing schema.sql,
-- it does not replace it.

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
