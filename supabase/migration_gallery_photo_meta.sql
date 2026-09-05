-- OPEN GRAIN — Migration: photo dimensions + purpose tags for client galleries
-- Run this once in your Supabase project's SQL editor, AFTER
-- migration_client_galleries.sql has already been run.
--
-- WHAT THIS ADDS AND WHY
-- -----------------------
-- 1. `width` / `height` — the real pixel dimensions of each preview
--    photo, captured automatically in Studio when you upload it. The
--    client gallery page uses these to show every photo in its real
--    aspect ratio (4:3, 16:9, 1:1, whatever you actually shot) instead
--    of force-cropping everything into a square.
-- 2. `categories` — a free-form list of tags per photo (for example:
--    "stories", "post", "reel", "texto") so you can mark what each
--    photo is meant for. A single photo can carry several tags at
--    once. The client can filter the gallery by these tags.

alter table gallery_photos
  add column if not exists width int,
  add column if not exists height int,
  add column if not exists categories text[] not null default '{}';
