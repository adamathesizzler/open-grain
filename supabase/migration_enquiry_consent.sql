-- ============================================================
-- OPEN GRAIN — consentimiento y límites de servidor en `enquiries`
-- ============================================================
-- ESTADO: PREPARADA, NO APLICADA.
--
-- Esta migración NO se ha ejecutado contra ninguna base de datos. Requiere
-- acceso al proyecto de Supabase, que no está disponible en el entorno de
-- desarrollo donde se preparó. Debe aplicarse primero en un proyecto de
-- pruebas y comprobarse allí antes de tocar producción.
--
-- POR QUÉ HACE FALTA
--
-- El formulario público exige aceptar la política de privacidad antes de
-- enviar, pero esa comprobación vive en el navegador. La validación del
-- navegador no es una barrera de seguridad: cualquiera puede insertar en
-- `enquiries` directamente con la clave anónima, sin consentimiento y sin
-- límite de tamaño, porque la política RLS vigente es:
--
--   create policy "public can submit enquiries" on enquiries
--     for insert with check (true);
--
-- Lo que sí está bien hoy y NO cambia: sólo un administrador puede leer
-- `enquiries` (`admin read enquiries`), así que un visitante no puede ver
-- solicitudes ajenas.
--
-- QUÉ HACE
--
-- 1. Añade una columna de consentimiento con su marca de tiempo.
-- 2. Sustituye la política de inserción por una que exija ese consentimiento
--    y unos límites de longitud razonables.
--
-- Es no destructiva: no borra filas, no borra columnas y las solicitudes ya
-- guardadas quedan con `consent_accepted = true` para no invalidarlas
-- retroactivamente (se recogieron con el aviso de privacidad delante).
--
-- LO QUE ESTA MIGRACIÓN NO RESUELVE
--
-- No limita la frecuencia de envío. Contra el abuso automatizado hace falta
-- además un límite por IP o un control equivalente, y eso no se puede hacer
-- sólo con RLS: necesita una Edge Function o un endpoint delante de la tabla.
-- Queda pendiente y está anotado como bloqueo en PROJECT_STATE.md.
--
-- CÓMO REVERTIR
--
--   drop policy if exists "public can submit enquiries with consent" on enquiries;
--   create policy "public can submit enquiries" on enquiries
--     for insert with check (true);
--   alter table enquiries drop column if exists consent_accepted;
--   alter table enquiries drop column if exists consent_at;
-- ============================================================

begin;

alter table enquiries
  add column if not exists consent_accepted boolean not null default false,
  add column if not exists consent_at timestamptz;

-- Las solicitudes anteriores a esta migración se recogieron con la casilla de
-- privacidad ya presente en el formulario: se marcan como aceptadas para no
-- dejarlas en un estado que no refleja lo que ocurrió.
update enquiries
   set consent_accepted = true,
       consent_at = coalesce(consent_at, created_at)
 where consent_accepted = false;

drop policy if exists "public can submit enquiries" on enquiries;

create policy "public can submit enquiries with consent" on enquiries
  for insert
  with check (
    consent_accepted = true
    and char_length(trim(name)) between 1 and 120
    and char_length(email) between 3 and 254
    and position('@' in email) > 1
    and (phone is null or char_length(phone) <= 40)
    and (message is null or char_length(message) <= 6000)
    and (service is null or char_length(service) <= 120)
    and (budget_range is null or char_length(budget_range) <= 60)
  );

commit;

-- DESPUÉS DE APLICARLA, el frontend debe enviar también estas dos columnas:
--
--   const row = { ...payload, consent_accepted: true, consent_at: new Date().toISOString() };
--
-- en el callback send() de main.js. Mientras la migración no esté aplicada,
-- enviarlas provocaría un error de columna inexistente, así que main.js NO
-- las envía todavía. Los dos cambios van juntos.
