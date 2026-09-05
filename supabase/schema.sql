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
