# PROJECT_STATE.md — Estado del proyecto OPEN GRAIN

Última actualización: 2026-09-05 (galerías de cliente: aspect ratio real, categorías/etiquetas por foto, y peticiones de revisión del cliente — terminado, probado y commiteado).

## 1. Estado actual del proyecto

- **Sitio público**: funcionando en Vercel. Sigue habiendo commits sin subir a GitHub (ver sección 5) — el usuario debe hacer `git push` desde su Mac.
- **Panel Studio (admin)**: REDISEÑO CMS TERMINADO (commit `ec99482`/`0d14f07`, sesión anterior).
- **Galerías de cliente**: orbe de IA + galería privada (commit `35ba04a`), originales + ZIP + descarga individual + registro de descargas (commit `3e4b2ac`).
- **NUEVO ESTA SESIÓN (continuación)**: 1) cada foto se muestra en la galería del cliente con su aspecto real (4:3, 16:9, 1:1…) en vez de recortada a cuadrado; 2) cada foto puede etiquetarse con para qué sirve (Stories, Publicación, Reel, Envío directo) y el cliente puede filtrar por eso; 3) el cliente puede seleccionar una o varias fotos y pedir una revisión con un comentario, y tú le respondes y la marcas resuelta desde Studio. Commiteado en `da8dcfd`. **Sigue pendiente el `git push`** (ver sección 5) y **ejecutar dos migraciones SQL nuevas en Supabase** (ver sección 5) antes de que funcione en producción.
- **Pendiente de fuera**: el usuario va a diseñar él mismo un mockup visual para la página pública `gallery.html` (le pasé la lista de qué debe contener, incluida esta sesión la parte de revisiones) — cuando lo mande, hay que maquetar `gallery.html` con ese diseño sin tocar la lógica ya construida.

## 2. Novedades de esta sesión

### Aspecto real de las fotos
Al subir una foto de vista previa en Studio, se capturan automáticamente sus dimensiones reales (ancho/alto). La galería del cliente ya no fuerza un recorte cuadrado — cada foto se ve en su proporción real. (El grid de miniaturas dentro de Studio sí se mantiene cuadrado a propósito, por compacidad — solo la página pública respeta el aspecto real.)

### Categorías / para qué sirve cada foto
En Studio, cada foto tiene casillas para marcarla como "Stories", "Publicación", "Reel" y/o "Envío directo" (una foto puede tener varias a la vez). En la página del cliente, esas etiquetas se ven debajo de cada foto, y aparecen chips de filtro arriba de la cuadrícula para ver solo las de una categoría.

### Peticiones de revisión del cliente
- El cliente puede pulsar "Seleccionar fotos", marcar una o varias, y pulsar "Pedir revisión" para escribir un comentario (ej. "estas dos más claras por favor"). No es un chat — es una nota única.
- Aparece una sección "Mis revisiones" en su galería con el estado (pendiente/resuelta) y tu respuesta cuando la haya.
- Las fotos con una revisión pendiente llevan una etiqueta "Revisión pendiente".
- En Studio, nueva sección "Revisiones del cliente": ves el comentario, las fotos a las que se refiere, puedes escribir una respuesta y marcarla como resuelta.

## 3. Archivos modificados esta sesión (ya sincronizados y commiteados en el Mac, commit `da8dcfd`)

- `studio/index.html` — casillas de categoría por foto y sección nueva "Revisiones del cliente".
- `studio/studio.js` — captura de ancho/alto al subir, guardar categorías, cargar/responder/resolver revisiones.
- `gallery.html` — aspecto real por foto, etiquetas y filtro de categorías, modo selección, modal para pedir revisión, lista "Mis revisiones", etiqueta de pendiente.
- `supabase/schema.sql` — añadidas las columnas de dimensiones/categorías y las tablas de revisiones al final del archivo.
- `supabase/migration_gallery_photo_meta.sql` — **archivo nuevo** (dimensiones + categorías), para ejecutar en Supabase.
- `supabase/migration_gallery_revisions.sql` — **archivo nuevo** (revisiones), para ejecutar en Supabase.

## 4. Errores encontrados y corregidos esta sesión

- Igual que pasó antes con el botón de descarga: la barra de selección, la fila de filtros y la ventana de "pedir revisión" se quedaban visibles encima de todo aunque estuvieran técnicamente "ocultas", por el mismo motivo de CSS (una regla de `display` pisando el atributo `hidden`). Corregido con la misma solución que la vez anterior, verificado con pruebas — ya no ocurre.

## 5. Pendiente — acciones del usuario

1. **Hacer `git push origin main` desde una terminal en el Mac real** (esta VM de Cowork no tiene credenciales de GitHub guardadas). Commits esperando: `da8dcfd` (aspecto real + categorías + revisiones), `3e4b2ac` (originales + ZIP + registro), `35ba04a` (orbe + galerías) y, si tampoco se subieron antes, `0d14f07`/`ec99482` (rediseño del Studio).
2. **Ejecutar en el editor SQL de Supabase, en este orden si no se ha hecho ya**:
   - `supabase/migration_client_galleries.sql`
   - `supabase/migration_gallery_downloads.sql`
   - `supabase/migration_gallery_photo_meta.sql` (nuevo)
   - `supabase/migration_gallery_revisions.sql` (nuevo)
3. Opcional (de sesiones anteriores, si no se hizo ya): `supabase/migration_dashboard_v2.sql` para la columna `status` de proyectos.
4. **El usuario va a diseñar un mockup visual para `gallery.html`** — cuando lo envíe, aplicar ese diseño sobre la lógica ya construida (no reescribir la lógica, solo la maqueta/estilos).

## 6. Cómo usar la función completa (una vez publicado)

1. Abrir Studio → Proyectos → elegir un proyecto → botón "Galería cliente".
2. Activar la galería, poner un PIN si se quiere proteger.
3. Subir las fotos de vista previa (se captura su aspecto real automáticamente).
4. Marcar en cada foto para qué sirve (Stories/Publicación/Reel/Envío directo) si se quiere.
5. Para las fotos que el cliente deba poder descargar en calidad completa: pulsar "Adjuntar original" y subir el archivo a tamaño completo.
6. (Opcional) Pegar un enlace externo de descarga como respaldo.
7. Copiar el enlace y enviárselo al cliente.
8. El cliente abre el enlace, marca favoritas, filtra por categoría, descarga fotos o el ZIP, y puede seleccionar fotos para pedir una revisión.
9. En Studio → esa misma galería → "Descargas del cliente" y "Revisiones del cliente" para ver y responder.

## 7. Pruebas realizadas

- Orbe de IA, galería privada, PIN, favoritas, originales, ZIP, descarga individual, registro de descargas: probado en sesiones anteriores — ver historial de commits.
- Esta continuación (aspecto real, categorías, revisiones), con Playwright y Supabase mockeado: subir una foto real en 16:9 captura sus dimensiones correctamente; marcar una categoría en Studio actualiza la foto; la galería pública muestra esa foto con su proporción real (visiblemente más ancha que alta) y con sus etiquetas debajo; el filtro de categorías reduce la cuadrícula correctamente; seleccionar varias fotos y pedir una revisión crea la petición vinculada a todas las fotos elegidas; la lista "Mis revisiones" del cliente y la de Studio muestran el comentario, el estado y la respuesta correctamente; marcar como resuelta desde Studio funciona; la etiqueta de "Revisión pendiente" aparece solo en las fotos con una revisión abierta y desaparece si está resuelta. Capturas revisadas visualmente. Cero errores reales de JavaScript.
- No se ha probado contra la base de datos real de Supabase (solo mockeada) — hay que ejecutar las migraciones SQL (sección 5) antes de probarlo en producción real.

## 8. Siguiente acción recomendada

Cuando el usuario vuelva: confirmar que ha hecho el `git push` y ejecutado las migraciones SQL pendientes en Supabase, y entonces probar la función real de punta a punta (subir fotos con distintos aspectos, etiquetarlas, pedir una revisión como si fuera el cliente, responderla desde Studio). Cuando llegue el mockup visual del usuario para `gallery.html`, aplicar ese diseño sobre la lógica ya construida sin tocarla.
