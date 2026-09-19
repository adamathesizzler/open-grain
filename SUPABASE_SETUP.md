# Supabase Setup — Contact Form

## Estado Actual

✅ **Completado:**
- Tabla `enquiries` existe (guarda los leads del formulario)
- Frontend (main.js) está actualizado y listo

⚠️ **Pendiente en Supabase:**
- Aplicar la migración SQL para activar validaciones y consentimiento

---

## Paso 1: Acceder a tu Proyecto Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Abre tu proyecto **OPEN GRAIN**
3. Ve a **SQL Editor** (en el menú izquierdo)

---

## Paso 2: Ejecutar la Migración SQL

Copia y ejecuta **TODO ESTO** en el SQL Editor:

```sql
-- ============================================================
-- OPEN GRAIN — consentimiento y límites de servidor en `enquiries`
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
```

**Pasos:**
1. Pega todo el SQL arriba ↑ en el editor
2. Haz clic en **Run** (botón naranja arriba a la derecha)
3. Espera a que se complete (debería decir "Success")

---

## Paso 3: Verificar

Después de ejecutar, tu tabla `enquiries` tendrá:
- 2 columnas nuevas: `consent_accepted` (boolean) y `consent_at` (timestamp)
- Una política RLS que valida:
  - Consentimiento obligatorio ✓
  - Longitud máxima de cada campo ✓
  - Email válido ✓

---

## ¿Qué Pasa Ahora?

Tu formulario de contacto:
1. El usuario completa y envía
2. Frontend valida (og-contact.js)
3. Frontend envía a Supabase con `consent_accepted: true` y `consent_at: [timestamp]`
4. Supabase valida (RLS policy)
5. Datos se guardan en tabla `enquiries` ✅

Los leads estarán disponibles en Supabase → **Table Editor** → `enquiries`

---

**¿Problemas?**
- Si hay error al ejecutar el SQL: copia el mensaje de error
- Si la tabla no existe: contacta (la table `enquiries` debe existir primero)
