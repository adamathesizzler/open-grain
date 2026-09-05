# PROJECT_STATE.md — Estado del proyecto OPEN GRAIN

Última actualización: 2026-09-05 (orbe de IA + galerías privadas de cliente — terminado, probado y commiteado).

## 1. Estado actual del proyecto

- **Sitio público**: funcionando en Vercel. Sigue habiendo commits sin subir a GitHub (ver sección 5) — el usuario debe hacer `git push` desde su Mac.
- **Panel Studio (admin)**: REDISEÑO CMS TERMINADO (commit `ec99482`/`0d14f07`, sesión anterior).
- **NUEVO ESTA SESIÓN**: orbe animado de IA + sistema completo de galerías privadas por proyecto para que los clientes vean, marquen favoritas y descarguen sus fotos. Código escrito, probado con Playwright sin errores, sincronizado al Mac y commiteado en `35ba04a`. **Sigue pendiente el `git push`** (ver sección 5) y **ejecutar la migración SQL nueva en Supabase** (ver sección 7) antes de que funcione en producción.

## 2. Novedades de esta sesión

### Orbe de IA (Asistente IA)
- Círculo animado (glow + anillos tipo onda) encima del formulario del Asistente IA, con colores SIEMPRE opuestos al tema de la página (naranja/rojo cuando la página está en modo día; azul cuando está en modo noche).
- Se acelera automáticamente ("thinking") mientras se espera la respuesta de la IA.

### Galerías privadas de cliente
- Cada proyecto tiene un botón "Galería cliente" que abre un panel para: activar/desactivar la galería, copiar el enlace privado para el cliente, poner un PIN opcional, subir fotos de vista previa, y ver qué fotos ha marcado como favoritas el cliente.
- Página pública nueva `gallery.html`: el cliente abre el enlace (sin necesitar cuenta), pone el PIN si hay uno, ve las fotos y las marca con el corazón.
- **Decisión de diseño clave (por el coste de espacio en Supabase)**: las fotos que se suben dentro de Studio son solo de vista previa/calidad reducida — cuentan poco espacio. Para las fotos originales a tamaño completo, Studio tiene un campo aparte "Enlace de descarga de las fotos originales" donde se pega un enlace externo (Google Drive, WeTransfer, Dropbox, etc.). Ese enlace aparece como botón "Descargar todas las fotos" en la página del cliente. Así las fotos pesadas nunca se guardan en Supabase y no aumentan el coste de almacenamiento.

## 3. Archivos creados o modificados esta sesión (ya sincronizados y commiteados en el Mac, commit `35ba04a`)

- `studio/index.html` — añadido el orbe de IA y el panel completo de "Galería cliente" por proyecto.
- `studio/studio.css` — añadidas las animaciones del orbe (colores invertidos según tema).
- `studio/studio.js` — añadida toda la lógica de gestión de galerías (crear, guardar ajustes, subir fotos, ver favoritas) y el toggle del orbe durante la petición a la IA.
- `gallery.html` — **archivo nuevo**: página pública que ve el cliente.
- `supabase/schema.sql` — añadidas las tablas nuevas al final del archivo.
- `supabase/migration_client_galleries.sql` — **archivo nuevo**, para ejecutar en Supabase (ver sección 5).

## 4. Errores encontrados y corregidos esta sesión

- El botón "Descargar todas las fotos" se veía en pantalla incluso antes de meter el PIN correcto, porque su propia regla CSS (`display:inline-flex`) ganaba por encima del atributo `hidden`. Corregido añadiendo una regla `.g-download-all[hidden]{ display:none; }`. Verificado de nuevo con Playwright: ya no aparece hasta desbloquear la galería.
- (Errores de sesiones anteriores, ya resueltos: desajuste `data-theme` `<html>` vs `<body>`, mock de Supabase en pruebas — ver historial de commits si hace falta el detalle.)

## 5. Pendiente — acciones del usuario

1. **Hacer `git push origin main` desde una terminal en el Mac real** (esta VM de Cowork no tiene credenciales de GitHub guardadas — no se puede hacer desde aquí). Hay varios commits esperando a subir, incluyendo `35ba04a` (orbe + galerías) y, si tampoco se subieron antes, `0d14f07`/`ec99482` (rediseño del Studio).
2. **Ejecutar `supabase/migration_client_galleries.sql` en el editor SQL de Supabase** — crea las tablas `client_galleries`, `gallery_photos` y `gallery_favorites` con sus permisos. Sin esto, el botón "Galería cliente" en Studio dará error al intentar abrir o crear una galería.
3. Opcional (de la sesión anterior, si no se hizo ya): `supabase/migration_dashboard_v2.sql` para la columna `status` de proyectos.

## 6. Cómo usar la nueva función (una vez publicado)

1. Abrir Studio → Proyectos.
2. Elegir un proyecto → botón "Galería cliente".
3. Activar la galería, poner un PIN si se quiere proteger, pegar el enlace externo de descarga (Drive/WeTransfer/etc.) para las fotos originales.
4. Subir las fotos de vista previa (tamaño reducido).
5. Copiar el enlace y enviárselo al cliente.
6. El cliente abre el enlace, ve las fotos, las marca con el corazón, y descarga las originales desde el botón que lleva al enlace externo.

## 7. Pruebas realizadas

- Playwright con Supabase mockeado: el orbe aparece y se acelera durante una petición simulada a la IA; el panel de galería en Studio abre correctamente una galería existente (con sus fotos y favoritas) y crea una nueva automáticamente si el proyecto no tenía; guardar ajustes (PIN, activo, enlace de descarga) funciona; la página pública `gallery.html` carga la galería por su enlace, respeta el PIN (rechaza el incorrecto, acepta el correcto), muestra/oculta el botón de descarga según corresponda, y marcar/desmarcar favoritas funciona. Capturas de pantalla revisadas visualmente (orbe día/noche, panel de Studio, galería pública día/noche, pantalla de PIN) — coinciden con lo esperado. Cero errores reales de JavaScript en todas las pruebas.
- No se ha probado contra la base de datos real de Supabase (solo mockeada) — hay que ejecutar la migración SQL (sección 5) antes de probarlo en producción real.

## 8. Siguiente acción recomendada

Cuando el usuario vuelva: confirmar que ha hecho el `git push` y que ha ejecutado `supabase/migration_client_galleries.sql` en Supabase, y entonces probar la función real (crear una galería de prueba, subir 2-3 fotos, abrir el enlace en una ventana privada del navegador para simular al cliente). Si pide más cambios sobre esto, partir de esta base ya funcional.
