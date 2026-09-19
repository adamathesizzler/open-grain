-- ============================================================================
-- OPEN GRAIN — Tarjeta de reserva del cliente
--
-- Las reservas viven en `projects`, que es admin-only: una página pública no
-- puede leerla con la anon key, y abrirla sería exponer los datos de todos los
-- clientes. Esta migración hace dos cosas:
--   1. Añade los campos que la tarjeta necesita y que hoy no existen
--      (hora, lugar, qué incluye, entrega, imagen, código y token público).
--   2. Crea UNA función de lectura pública que solo devuelve la reserva cuyo
--      token coincide, y solo los campos que el cliente debe ver. Las notas
--      internas y el presupuesto quedan fuera a propósito. RLS sigue cerrada:
--      no se abre ninguna policy sobre la tabla.
--
-- Ejecutar en Supabase → SQL Editor. Es idempotente: se puede repetir.
-- ============================================================================

alter table projects
  add column if not exists start_time     time,
  add column if not exists end_time       time,
  add column if not exists location       text,
  add column if not exists deliverables   text,
  add column if not exists delivery_note  text,
  add column if not exists cover_url      text,
  add column if not exists public_code    text,
  add column if not exists public_token   uuid not null default gen_random_uuid();

comment on column projects.start_time    is 'Hora de inicio de la sesión (se muestra en la tarjeta del cliente)';
comment on column projects.location      is 'Lugar de la sesión, en texto libre: "Puerto de Andratx"';
comment on column projects.deliverables  is 'Qué incluye: "20 fotografías editadas"';
comment on column projects.delivery_note is 'Cómo y cuándo se entrega: "Galería privada · 7 días"';
comment on column projects.cover_url     is 'Imagen opcional del anverso; si está vacía la tarjeta usa una portada tipográfica';
comment on column projects.public_token  is 'Secreto de la URL de la tarjeta. Quien lo tiene ve ESA reserva y ninguna más';

-- Código corto y legible para el cliente (OG-0001, OG-0002…), independiente del uuid
create sequence if not exists booking_code_seq start 1;

update projects
   set public_code = 'OG-' || lpad(nextval('booking_code_seq')::text, 4, '0')
 where public_code is null;

alter table projects
  alter column public_code set default ('OG-' || lpad(nextval('booking_code_seq')::text, 4, '0'));

create unique index if not exists projects_public_token_key on projects (public_token);
create unique index if not exists projects_public_code_key  on projects (public_code) where public_code is not null;

-- ---------------------------------------------------------------------------
-- Lectura pública, solo por token y solo de los campos del cliente.
-- security definer = se salta RLS de forma controlada; el filtro por token y
-- la lista de columnas son el límite. Una reserva todavía en 'enquiry' o
-- 'cancelled' no tiene tarjeta.
-- ---------------------------------------------------------------------------
create or replace function public_booking(token uuid)
returns table (
  public_code   text,
  title         text,
  service       text,
  status        text,
  event_date    date,
  start_time    time,
  end_time      time,
  location      text,
  deliverables  text,
  delivery_note text,
  cover_url     text,
  client_name   text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.public_code, p.title, p.service, p.status,
         p.event_date, p.start_time, p.end_time,
         p.location, p.deliverables, p.delivery_note, p.cover_url,
         c.name
    from projects p
    left join clients c on c.id = p.client_id
   where p.public_token = token
     and p.status in ('confirmed', 'in_progress', 'delivered')
   limit 1;
$$;

revoke all on function public_booking(uuid) from public;
grant execute on function public_booking(uuid) to anon, authenticated;
