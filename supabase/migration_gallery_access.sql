-- ============================================================
-- OPEN GRAIN — el PIN pasa a proteger los DATOS, no sólo la página
-- ============================================================
-- ESTADO: PREPARADA, NO APLICADA.
--
-- No se ha ejecutado contra ninguna base de datos. Requiere acceso al
-- proyecto de Supabase, que no existe en el entorno donde se preparó.
-- Aplícala primero en un proyecto de pruebas.
--
-- ------------------------------------------------------------
-- POR QUÉ HACE FALTA  (hallazgos SEC-01, SEC-03 y SEC-04 de la auditoría)
-- ------------------------------------------------------------
-- El PIN en sí está bien hecho: `migration_gallery_v2.sql` lo guarda con
-- bcrypt, bloquea 5 minutos tras 5 intentos y revoca a nivel de columna el
-- acceso de `anon` a pin/pin_hash/pin_attempts/pin_locked_until. Eso NO se
-- toca aquí y sigue siendo correcto.
--
-- El problema está un paso más allá. La función que decide si una galería es
-- alcanzable es:
--
--   create or replace function gallery_is_reachable(g client_galleries) ...
--     select g.status = 'published' and (g.expires_at is null or g.expires_at > now());
--
-- Es decir: publicada y sin caducar. NO mira el PIN. Y las políticas de
-- lectura de `gallery_photos`, `gallery_attachments` y `gallery_revisions` se
-- apoyan en ella. Consecuencia: con la clave anónima —que es pública por
-- diseño y está en el código del sitio— se pueden pedir por REST las fotos de
-- cualquier galería publicada sin haber acertado nunca el PIN. El PIN protege
-- la página `gallery.html`, pero nadie está obligado a usar esa página.
--
-- Dos problemas más de la misma familia:
--   · `gallery_favorites` tiene una política `for all`, que en Postgres son
--     las cuatro operaciones: un visitante anónimo puede BORRAR y MODIFICAR
--     los favoritos que ha elegido un cliente.
--   · `gallery_revisions` es legible por cualquiera: las notas privadas que
--     el cliente escribe ("la 12 no me gusta") quedan expuestas.
--
-- ------------------------------------------------------------
-- CÓMO SE ARREGLA
-- ------------------------------------------------------------
-- No se puede arreglar sólo endureciendo las políticas, porque el cliente
-- necesita leer las fotos y RLS no sabe si el visitante acertó el PIN. La
-- solución es dejar de dar acceso directo a las tablas y pasar todo por
-- funciones `security definer` que comprueban el PIN en el mismo momento:
--
--   gallery_open(token, pin) -> la galería y sus fotos, o error
--
-- La función reutiliza `gallery_check_pin()`, que ya trae el bcrypt y el
-- bloqueo por intentos, así que el control antiabuso se mantiene intacto.
--
-- ------------------------------------------------------------
-- IMPORTANTE — ORDEN DE APLICACIÓN
-- ------------------------------------------------------------
-- Hoy `gallery.html` NO está en el repositorio: se perdió al revertir el
-- rediseño y sólo existe dentro del commit dcc71d2. Eso significa que ahora
-- mismo NADA consume estas tablas desde el sitio público, y por tanto esta
-- migración se puede aplicar sin romper nada.
--
-- Cuando se recupere la página de galería, tendrá que pedir los datos así:
--
--   const { data, error } = await supabase.rpc('gallery_open', {
--     p_token: tokenDeLaUrl,
--     p_pin:   pinIntroducidoONull,
--   });
--   // data.gallery -> la galería;  data.photos -> las fotos
--
-- en vez de `supabase.from('gallery_photos').select(...)`. Los favoritos y
-- las revisiones necesitarán sus propias funciones equivalentes; se añadirán
-- junto con la página, para no diseñar una API contra un cliente que no
-- existe todavía.
--
-- ------------------------------------------------------------
-- CÓMO REVERTIR
-- ------------------------------------------------------------
--   drop function if exists gallery_open(text, text);
--   -- y volver a crear las políticas permisivas que aparecen comentadas
--   -- junto a cada `drop policy` de la sección 1.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Cerrar el acceso directo de `anon` a los datos de las galerías
-- ------------------------------------------------------------
-- Antes:
--   create policy "public read photos of active galleries" on gallery_photos
--     for select using (exists (... and gallery_is_reachable(g)));
drop policy if exists "public read photos of active galleries" on gallery_photos;

-- Antes:
--   create policy "public read attachments of active galleries" on gallery_attachments
--     for select using (exists (... and gallery_is_reachable(g)));
drop policy if exists "public read attachments of active galleries" on gallery_attachments;

-- Antes:
--   create policy "public read revisions on active galleries" on gallery_revisions
--     for select using (exists (... and gallery_is_reachable(g)));
-- Las notas del cliente no vuelven a ser públicas: se sirven por función.
drop policy if exists "public read revisions on active galleries" on gallery_revisions;

-- `for all` daba también UPDATE y DELETE a cualquiera. Se parte en dos: leer
-- y crear sí, modificar y borrar no.
drop policy if exists "public manage favorites on active galleries" on gallery_favorites;

create policy "public read favorites on reachable galleries" on gallery_favorites
  for select using (
    exists (select 1 from client_galleries g
             where g.id = gallery_favorites.gallery_id and gallery_is_reachable(g))
  );

create policy "public add favorites on reachable galleries" on gallery_favorites
  for insert with check (
    exists (select 1 from client_galleries g
             where g.id = gallery_favorites.gallery_id and gallery_is_reachable(g))
  );

-- ------------------------------------------------------------
-- 2. La puerta única: abrir una galería con su token y su PIN
-- ------------------------------------------------------------
-- `security definer` + `search_path` fijo: la función se ejecuta con los
-- permisos del dueño (puede leer las tablas aunque `anon` no pueda), pero no
-- acepta que le cambien el search_path por debajo.
create or replace function gallery_open(p_token text, p_pin text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g        client_galleries;
  v_photos jsonb;
  v_files  jsonb;
begin
  select * into g from client_galleries where share_token = p_token;

  -- Una galería inexistente y una no publicada responden EXACTAMENTE igual,
  -- para no confirmar si un token existe.
  if g.id is null or not gallery_is_reachable(g) then
    raise exception 'gallery_not_available' using errcode = 'P0002';
  end if;

  -- gallery_check_pin() trae el bcrypt, el contador de intentos y el bloqueo
  -- de 5 minutos. Si la galería no tiene PIN, devuelve true sin más.
  if g.pin_hash is not null then
    if p_pin is null or not gallery_check_pin(p_token, p_pin) then
      raise exception 'gallery_pin_invalid' using errcode = 'P0001';
    end if;
  end if;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order, p.created_at), '[]'::jsonb)
    into v_photos
    from gallery_photos p
   where p.gallery_id = g.id;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]'::jsonb)
    into v_files
    from gallery_attachments a
   where a.gallery_id = g.id;

  -- Se devuelven sólo columnas seguras: ni pin, ni pin_hash, ni los contadores
  -- de intentos salen nunca de aquí.
  return jsonb_build_object(
    'gallery', jsonb_build_object(
      'id', g.id, 'title', g.title, 'client_name', g.client_name,
      'cover_url', g.cover_url, 'download_url', g.download_url,
      'status', g.status, 'expires_at', g.expires_at,
      'has_pin', g.has_pin, 'created_at', g.created_at
    ),
    'photos', v_photos,
    'attachments', v_files
  );
end;
$$;

revoke all on function gallery_open(text, text) from public;
grant execute on function gallery_open(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 3. Límite de envíos del formulario de contacto  (la mitad que faltaba
--    de SEC-05; el consentimiento va en migration_enquiry_consent.sql)
-- ------------------------------------------------------------
-- `migration_enquiry_consent.sql` dice que un límite por IP necesita una Edge
-- Function. Sí se puede hacer con un trigger: PostgREST expone las cabeceras
-- de la petición en `request.headers`, y de ahí sale la IP real que pone el
-- proxy de Supabase. No es infalible —una IP se puede falsear— pero corta en
-- seco el abuso automatizado más simple, que es de lo que se trata.
alter table enquiries add column if not exists submit_ip text;

create index if not exists enquiries_submit_ip_created_idx
  on enquiries (submit_ip, created_at desc);

create or replace function enquiries_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip     text;
  v_recent int;
begin
  v_ip := split_part(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    ',', 1
  );
  v_ip := nullif(btrim(v_ip), '');
  new.submit_ip := v_ip;

  -- Sin IP (por ejemplo al insertar desde el editor SQL) no se limita nada.
  if v_ip is null then
    return new;
  end if;

  select count(*) into v_recent
    from enquiries
   where submit_ip = v_ip
     and created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'Demasiadas solicitudes desde esta conexión. Inténtalo de nuevo más tarde.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enquiries_rate_limit on enquiries;
create trigger trg_enquiries_rate_limit
  before insert on enquiries
  for each row execute function enquiries_rate_limit();

-- La columna de IP es un dato personal: sólo la ve un administrador. `anon`
-- puede insertar (el trigger la rellena solo) pero nunca leerla.
revoke select (submit_ip) on enquiries from anon;

commit;

-- ============================================================
-- OPCIONAL — SEC-08: que ser administrador dependa de la cuenta, no del email
-- ============================================================
-- `is_admin()` compara el email del token con la tabla `admins`:
--
--   select exists (select 1 from admins where email = (auth.jwt() ->> 'email'));
--
-- El email es un dato del perfil, no la identidad. Si en el proyecto de
-- Supabase el registro estuviera abierto y la confirmación por email
-- desactivada, alguien podría registrarse con el email del administrador y
-- salir con permisos. Comprueba primero ese ajuste:
--   Authentication -> Providers -> Email -> "Confirm email" debe estar ACTIVADO.
--
-- NO ejecutes lo de abajo a ciegas: si `admins` no tiene todavía el user_id
-- relleno, te quedas fuera de tu propio panel. El orden correcto es:
--
--   -- 1) añadir la columna y rellenarla desde los usuarios existentes
--   alter table admins add column if not exists user_id uuid references auth.users(id);
--   update admins a set user_id = u.id from auth.users u where u.email = a.email;
--
--   -- 2) COMPROBAR que tu fila tiene user_id antes de seguir
--   select email, user_id from admins;
--
--   -- 3) sólo si el paso 2 se ve bien, cambiar la función
--   create or replace function is_admin() returns boolean as $$
--     select exists (select 1 from admins where user_id = auth.uid());
--   $$ language sql stable security definer;
-- ============================================================
