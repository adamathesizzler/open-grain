-- ============================================================
-- OPEN GRAIN — Studio CMS dashboard v2 migration
-- Run this once in the Supabase SQL editor (Project → SQL Editor)
-- if your database was created before this migration. It is also
-- included at the end of schema.sql for brand-new projects.
--
-- What it does: adds a three-state `status` column (draft /
-- published / hidden) to portfolio_projects, used by the new
-- Studio "Proyectos" panel to show draft/published/hidden pills
-- instead of a plain published checkbox. It backfills `status`
-- from the existing `is_published` boolean so nothing changes on
-- the public site, and studio.js keeps both columns in sync going
-- forward (the public site's RLS policy still reads is_published).
-- ============================================================

alter table portfolio_projects
  add column if not exists status text not null default 'draft'
  check (status in ('draft','published','hidden'));

update portfolio_projects set status = 'published'
  where is_published = true and status = 'draft';
