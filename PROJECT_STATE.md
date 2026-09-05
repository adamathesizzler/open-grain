# PROJECT_STATE.md — Estado del proyecto OPEN GRAIN

Última actualización: 2026-09-05 (sesión de rediseño completo del panel Studio).

## 1. Estado actual del proyecto

- **Sitio público**: funcionando y desplegado en Vercel. Última versión publicada en `main`/producción corresponde al commit `86b7156` ("Turn Portfolio into a photo album grid"), que el usuario acaba de pedir subir con `git push origin main`.
- **Panel Studio (admin)**: EN PLENA REESCRITURA hacia un "CMS dashboard premium" completamente nuevo, a petición explícita y muy detallada del usuario. Este rediseño **todavía no está terminado ni sincronizado ni commiteado**. Los archivos nuevos existen solo en el workspace de Claude en la nube (`/home/claude/open-grain/studio/index.html` y `studio.css`), NO en el Mac del usuario todavía.
- **`studio/studio.js` sigue siendo la versión ANTIGUA** (687 líneas, lógica de la iteración "álbum de fotos" ya superada). No coincide con los nuevos IDs/clases de `index.html`/`studio.css`. **El panel está en un estado intermedio no funcional: no probar, sincronizar ni commitear hasta reescribir `studio.js`.**

## 2. Decisiones tomadas (rediseño CMS del Studio)

- Estructura de navegación definitiva (en este orden): Inicio/Resumen, Contenido del sitio, Proyectos y portfolio, Galerías y archivos multimedia, Servicios, UGC, Mensajes y solicitudes, Clientes, Reservas y calendario, Analíticas, Ajustes, Cerrar sesión.
- Funcionalidades ya existentes que NO están en esa lista pero deben conservarse, integradas así:
  - Asistente de IA → pestaña/sub-tab dentro de "Contenido del sitio".
  - Inventario y Presupuestos → se mantienen como apartados extra (grupo "Más") en la navegación.
  - Posts sociales (social_posts) → se integran dentro de la nueva sección "UGC".
- Paleta de color: modo Día = beige/blanco cálido/gris claro + aura degradado azul eléctrico + texto negro + rojo/naranja como color "activo". Modo Noche = negro/carbón + degradados rojo/naranja + glass oscuro translúcido + texto blanco. Persistencia en `localStorage` bajo la clave `og_studio_theme`.
- "Liquid glass" (blur + saturate + fondo translúcido) solo en la interfaz (sidebar, topbar, tarjetas), nunca sobre fotografías.
- Editor de "Contenido del sitio": vista previa en vivo real de la página pública (iframe) a la izquierda, controles de edición a la derecha, selector de idioma ES/EN, autosave, botón fijo "Guardar y publicar", avisos de cambios sin publicar. La vista previa en vivo se implementará vía `postMessage` desde `studio.js` hacia el iframe, y un listener nuevo en `main.js` (sitio público) que fusiona esos campos en el objeto `copy` en memoria y vuelve a renderizar — sin escribir en Supabase hasta pulsar "Guardar y publicar".
- Proyectos: tarjetas tipo álbum con fotos apiladas, filtros por categoría (gastronomía/retratos/eventos/UGC/otros), reordenar arrastrando, tres estados (borrador/publicado/oculto), botón "Nuevo proyecto".
- Reparto de los 14 campos de `CONTENT_FIELD_ORDER` (en `assets/default-copy.js`) entre las pestañas "Hero" y "Textos" del nuevo editor: **pendiente de decidir/codificar** (candidato: `eyebrow`/`headline`/`explore` → Hero; el resto → Textos).

## 3. Funcionalidades terminadas

- Análisis completo de la estructura del proyecto y del dashboard actual.
- Revisión de las imágenes de referencia en la carpeta conectada `references:dashboard` (3 mockups: biblioteca de proyectos en modo claro, panel de control en modo oscuro, y la pantalla de inicio "Buenos días, Adama").
- `studio/index.html`: reescrito por completo con la nueva estructura (sidebar + topbar + 13 paneles, todos los IDs nuevos).
- `studio/studio.css`: reescrito por completo con el nuevo sistema de temas día/noche, glass, sidebar/topbar, tarjetas, editor de contenido con panel de vista previa, etc.
- Patrón de "arrastrar para reordenar" (drag & drop nativo HTML5) ya implementado y probado en la iteración anterior (categorías y proyectos de portfolio) — se reutilizará en el nuevo diseño.
- Patrón "propone y aprueba" del asistente de IA (`/api/ai-assist.js`) ya implementado y probado — se conserva sin cambios.

## 4. Archivos creados o modificados (en este rediseño, todavía solo en el workspace de Claude, no sincronizados al Mac)

- `studio/index.html` — reescrito completo (nuevo).
- `studio/studio.css` — reescrito completo (nuevo).
- `studio/studio.js` — **pendiente de reescribir** (sigue con la lógica antigua).
- `main.js` — pendiente: añadir listener de `postMessage` para la vista previa en vivo.
- `assets/default-copy.js` — sin cambios todavía; se usará para decidir el reparto Hero/Textos.
- `supabase/schema.sql` — pendiente: añadir columna `status` (`draft`/`published`/`hidden`) a `portfolio_projects`.
- Nuevo archivo pendiente: `supabase/migration_dashboard_v2.sql` (migración aislada para que el usuario la ejecute una vez en el editor SQL de Supabase).
- Ahora también: `CLAUDE.md` y `PROJECT_STATE.md` (este archivo) en la raíz del repo.

## 5. Errores encontrados y soluciones aplicadas

- Ruta de la carpeta conectada de referencias tiene un carácter `:` literal (`references:dashboard`) — hay que usarla tal cual.
- El parámetro correcto de `device_stage_files` es `paths`, no `files`.
- Bugs propios del script de pruebas Playwright (selectores desactualizados, falta de `.limit()` en el mock de Supabase) — corregidos.
- Desajuste pendiente de resolver: el script inline del `<head>` de `index.html` pone `data-theme` en `document.documentElement`, pero el CSS apunta a `body.studio-body[data-theme="..."]`. Hay que unificar esto (recomendado: que `studio.js` y el script inline usen `document.body.dataset.theme`) antes de que el toggle de tema funcione.
- `git push origin main` desde la VM aislada de Cowork (vía `device_bash`) falla con `fatal: could not read Username for 'https://github.com'`: esta VM no tiene credenciales de GitHub guardadas (no hay `credential.helper` configurado ni `gh` instalado), aunque sí tiene acceso de red a github.com (test con `curl` devolvió 200). **El usuario debe ejecutar el `git push` desde su Mac real** (fuera de esta VM aislada), o configurar un credential helper/token accesible desde la VM si quiere que Claude pueda hacer push en el futuro.

## 6. Pruebas realizadas

- Pruebas con Playwright (Supabase mockeado) de la iteración "álbum de fotos" (anterior al rediseño CMS actual): confirmado que el drag & drop reordena el DOM y persiste `sort_order` en Supabase (mock) para categorías y proyectos; capturas de pantalla en overview, portfolio, contenido, IA y vista móvil sin errores de JS.
- El nuevo rediseño CMS (`index.html` + `studio.css`) **todavía no se ha probado** porque `studio.js` no se ha reescrito para que coincida.

## 7. Trabajo pendiente

1. Reescribir `studio/studio.js` completo para que coincida con la nueva estructura de `index.html`/`studio.css` (ver lista detallada de requisitos en la sección "Siguiente acción recomendada").
2. Añadir el listener de `postMessage` en `main.js` para la vista previa en vivo del editor de contenido.
3. Crear `supabase/migration_dashboard_v2.sql` y añadir el mismo bloque a `supabase/schema.sql` (columna `status` en `portfolio_projects`).
4. Decidir y codificar el reparto de campos Hero vs. Textos.
5. Resolver la duplicación entre la pestaña "Servicios" del menú principal y la sub-pestaña "Servicios" dentro de "Contenido del sitio" (ambas editan `site_content.serviceList`): usar una única función de render/guardado compartida.
6. Probar todo con Playwright (Supabase mockeado) antes de sincronizar.
7. Sincronizar los archivos nuevos/modificados al Mac del usuario, hacer commit, y avisar de que falta el `git push` (el usuario debe hacerlo desde su Mac real, ver sección 5).
8. Entregar al usuario el informe final que pidió explícitamente: qué archivos se modificaron, qué funcionalidades se conservaron, qué partes nuevas se añadieron, y cómo abrir/probar el dashboard.

## 8. Siguiente acción recomendada

Reescribir `/home/claude/open-grain/studio/studio.js` en su totalidad para que:
- Unifique el `data-theme` en `document.body` y conecte el botón `#theme-toggle` y los botones `[data-theme-pick]` de Ajustes, persistiendo en `localStorage` (`og_studio_theme`).
- Implemente el nuevo despachador de pestañas (`data-tab`: `overview`, `content`, `projects`, `galleries`, `services`, `ugc`, `messages`, `clients`, `bookings`, `analytics`, `inventory`, `quotes`, `settings`) y los enlaces `[data-jump]` del Inicio.
- Reescriba `loadOverview()`: saludo según hora del día, 4 acciones rápidas, 4 estadísticas reales, proyecto destacado/más reciente, dos mini-listas (mensajes/reservas), barra de estado de publicación, y tira de trabajo reciente.
- Reescriba Proyectos: filtros por categoría reales, botón "Nuevo proyecto" que muestra el formulario oculto, y estados borrador/publicado/oculto (con fallback defensivo mientras no exista la columna `status` en Supabase).
- Implemente Galerías, Servicios, UGC, Analíticas y Ajustes con datos reales (nunca inventados).
- Conserve intactas todas las llamadas CRUD existentes a Supabase (clientes, reservas/"projects", inventario, presupuestos, posts sociales, mensajes/enquiries, categorías y proyectos de portfolio, contenido del sitio, y el asistente de IA).
- Solo después de todo esto: pruebas con Playwright, sincronización al Mac, commit, y aviso del `git push` pendiente + informe final.
