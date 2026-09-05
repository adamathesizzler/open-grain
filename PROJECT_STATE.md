# PROJECT_STATE.md — Estado del proyecto OPEN GRAIN

Última actualización: 2026-09-05 (rediseño completo del panel Studio — terminado y commiteado).

## 1. Estado actual del proyecto

- **Sitio público**: funcionando en Vercel. El commit `86b7156` ("Turn Portfolio into a photo album grid") seguía sin subir a GitHub al empezar esta sesión — el usuario pidió el `git push`; ver sección 5, no se pudo ejecutar desde aquí.
- **Panel Studio (admin)**: REDISEÑO CMS TERMINADO. `studio/index.html`, `studio/studio.css` y `studio/studio.js` fueron reescritos por completo, sincronizados al Mac del usuario y commiteados en `ec99482`. Probado con Playwright (Supabase mockeado) sin errores de JS. **Sigue pendiente el `git push` a GitHub** (ver sección 5) y, opcionalmente, ejecutar la migración SQL en Supabase (ver sección 7).

## 2. Decisiones tomadas (rediseño CMS del Studio)

- Estructura de navegación (en este orden): Inicio/Resumen, Contenido del sitio, Proyectos y portfolio, Galerías y archivos multimedia, Servicios, UGC, Mensajes y solicitudes, Clientes, Reservas y calendario, Analíticas, Ajustes, Cerrar sesión. Grupo extra "Más" con Inventario y Presupuestos (funcionalidades previas que no estaban en la lista pedida pero se conservaron).
- Asistente de IA → integrado como sub-pestaña "Asistente IA" dentro de "Contenido del sitio". Posts sociales (social_posts) → integrados dentro de "UGC".
- Paleta: Día = beige/blanco cálido/gris claro + aura azul eléctrico + texto negro + rojo/naranja como color activo. Noche = negro/carbón + degradados rojo/naranja + glass oscuro + texto blanco. Persistencia en `localStorage` (`og_studio_theme`), aplicado sobre `<html data-theme>` (no `<body>`, para evitar parpadeo — ver sección 5).
- "Liquid glass" (blur+saturate) solo en sidebar/topbar/tarjetas, nunca sobre fotografías.
- Editor de "Contenido del sitio": vista previa real del sitio público en un `<iframe src="/">`, sincronizada en vivo mediante `postMessage` (`studio.js` → listener nuevo en `main.js`) — no escribe en Supabase hasta pulsar "Guardar y publicar". Autosave de borrador en `localStorage` (`og_studio_draft`) para no perder cambios sin publicar si se recarga la página. Reparto de los 14 campos de `CONTENT_FIELD_ORDER`: Hero = `eyebrow`, `headline`, `explore`, `workBlurb`; Textos = el resto.
- Proyectos: tarjetas "álbum" con fotos apiladas, filtros por categoría real, arrastrar para reordenar, tres estados (`draft`/`published`/`hidden`) con fallback defensivo mientras no exista la columna `status` (ver sección 7).
- "Servicios" tiene una única fuente de datos (`site_content.serviceList`) compartida entre la pestaña dedicada del menú y la sub-pestaña dentro de "Contenido del sitio", mediante las funciones `loadServicesInto()` / `saveServiceLists()` en `studio.js`.

## 3. Funcionalidades terminadas

- Rediseño completo de `studio/index.html`, `studio/studio.css` y `studio/studio.js` (shell con sidebar+topbar, tema día/noche, las 12 secciones, editor de contenido con vista previa en vivo, proyectos con estados y filtros, galerías con biblioteca de archivos real, servicios compartidos, UGC, analíticas con datos reales, ajustes con banner de configuración detectado en tiempo real).
- Listener de `postMessage` añadido a `main.js` para la vista previa en vivo.
- Migración SQL para `portfolio_projects.status` añadida a `supabase/schema.sql` y como archivo independiente `supabase/migration_dashboard_v2.sql`.
- Corregido el desajuste de `data-theme` (unificado en `<html>`, CSS actualizado a `html[data-theme="night"] body.studio-body`).
- Todas las funcionalidades previas conservadas intactas: clientes, reservas (tabla `projects`), inventario, presupuestos, mensajes/enquiries, categorías y proyectos de portfolio, contenido del sitio, asistente de IA, posts sociales, drag & drop, subida de fotos a Supabase Storage.
- Probado con Playwright (Supabase mockeado, incluyendo `count`/`head`/`gte`/relaciones embebidas) en escritorio, tema noche y móvil: sin errores de JS, capturas de pantalla verificadas visualmente contra los mockups de referencia — coinciden.
- Sincronizado al Mac del usuario vía `SendUserFile` + `device_commit_files` (checksums MD5 verificados iguales) y commiteado como `ec99482`.

## 4. Archivos creados o modificados (ya sincronizados y commiteados en el Mac)

- `studio/index.html` — reescrito completo.
- `studio/studio.css` — reescrito completo (incluye el fix del selector de tema).
- `studio/studio.js` — reescrito completo (antes tenía la lógica antigua).
- `main.js` — añadido el listener de `postMessage` para la vista previa en vivo.
- `supabase/schema.sql` — añadida la migración de `status` al final.
- `supabase/migration_dashboard_v2.sql` — nuevo archivo con esa misma migración, para ejecutar en Supabase.
- `CLAUDE.md` y `PROJECT_STATE.md` — instrucciones permanentes y este registro de estado (commit `cf1e1fd`).

## 5. Errores encontrados y soluciones aplicadas

- `git push origin main` no se puede ejecutar desde la VM aislada de Cowork (`device_bash`): falla con `fatal: could not read Username for 'https://github.com'` porque esa VM no tiene credenciales de GitHub guardadas (sin `credential.helper` ni `gh` instalado), aunque sí tiene red hacia github.com. **Sigue pendiente**: el usuario debe ejecutar `git push origin main` desde una terminal en su Mac real (fuera de esta VM aislada). Hay dos commits esperando: `86b7156` y todo lo posterior hasta `ec99482` (incluye el rediseño del Studio).
- Lock files de git (`.git/index.lock`, `.git/HEAD.lock`) aparecen repetidamente al operar desde `device_bash` — se resuelven renombrándolos (`mv -f .git/index.lock .git/index.lock.stale_$(date +%s)`) inmediatamente antes de cada `git add`/`git commit`; los avisos "unable to unlink tmp_obj_*" son inofensivos.
- Desajuste de `data-theme` (`<html>` vs `<body>`) — resuelto: todo el tema ahora vive en `<html data-theme>`, CSS actualizado a `html[data-theme="night"] body.studio-body`.
- Mock de Supabase en las pruebas Playwright necesitaba soporte para `count`/`head`, filtros `gte`, y relaciones embebidas (`portfolio_categories(name)`, `clients(name)`) — añadido en el script de pruebas (no afecta al código real de producción).

## 6. Pruebas realizadas

- Playwright con Supabase mockeado: sesión iniciada, tema día/noche, las 13 pestañas cargan sin errores de JS, proyectos con 3 tarjetas y estados draft/published/hidden correctos, arrastrar-para-reordenar funciona y persiste `sort_order`, galería con biblioteca de archivos (2 archivos mockeados), servicios con 10 campos (5×2 idiomas), editor de contenido con 4 campos Hero + 10 Textos ×2 idiomas = 8+20 campos, vista previa en vivo cargó el sitio público real dentro del iframe, "Guardar y publicar" marcó el estado "dirty→saved" correctamente e hizo 1 upsert a `site_content`, banner de configuración correctamente ausente (la columna `status` existía en los datos de prueba). Capturas de pantalla en escritorio, tema noche y móvil revisadas visualmente: coinciden con los mockups de referencia.
- No se han hecho pruebas contra la base de datos Supabase real (solo mockeada) — la primera vez que el usuario abra el panel en producción conviene revisar la pestaña Ajustes por si aparece el banner de migración pendiente.

## 7. Trabajo pendiente

1. **El usuario debe ejecutar `git push origin main` desde su Mac real** (ver sección 5) para publicar el rediseño en producción.
2. **Opcional pero recomendado**: ejecutar `supabase/migration_dashboard_v2.sql` en el editor SQL de Supabase para activar la columna `status` (borrador/publicado/oculto) en `portfolio_projects`. Sin ella, Studio sigue funcionando con el campo antiguo `is_published` (fallback automático) y Ajustes mostrará un aviso.
3. Verificar visualmente en el navegador real (no solo con datos mockeados) una vez publicado, especialmente: subida real de fotos, guardado real de contenido, y que el asistente de IA sigue funcionando con la clave de Anthropic configurada en Vercel.

## 8. Siguiente acción recomendada

Confirmar con el usuario que ha hecho el `git push` y, si quiere, guiarle para ejecutar la migración SQL en Supabase. Si pide más cambios visuales o funcionales sobre este rediseño, partir de esta base ya funcional en vez de reescribir desde cero.
