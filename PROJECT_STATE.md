# PROJECT_STATE.md — Estado del proyecto OPEN GRAIN

Última actualización: 2026-09-05 (orbe de IA + galerías privadas de cliente, con ZIP + descarga individual + registro de descargas — terminado, probado y commiteado).

## 1. Estado actual del proyecto

- **Sitio público**: funcionando en Vercel. Sigue habiendo commits sin subir a GitHub (ver sección 5) — el usuario debe hacer `git push` desde su Mac.
- **Panel Studio (admin)**: REDISEÑO CMS TERMINADO (commit `ec99482`/`0d14f07`, sesión anterior).
- **Galerías de cliente**: orbe de IA + galería privada por proyecto, hechos y commiteados en `35ba04a`.
- **NUEVO ESTA SESIÓN (continuación)**: las galerías de cliente ahora soportan archivos originales a tamaño completo con tres cosas nuevas — descarga en ZIP, descarga foto por foto, y un registro de qué ha descargado cada cliente. Commiteado en `3e4b2ac`. **Sigue pendiente el `git push`** (ver sección 5) y **ejecutar `supabase/migration_gallery_downloads.sql` en Supabase** (ver sección 5) antes de que funcione en producción.
- **Pendiente de fuera**: el usuario va a diseñar él mismo un mockup visual para la página pública `gallery.html` (le pasé la lista de qué debe contener) — cuando lo mande, hay que maquetar `gallery.html` con ese diseño sin tocar la lógica ya construida.

## 2. Novedades de esta sesión (continuación — originales + ZIP + descargas)

- **Decisión de diseño (cambio respecto a antes)**: el usuario aceptó pagar el coste de espacio en Supabase a cambio de tener ZIP, descarga individual y registro de descargas — cosas que no son posibles solo con un enlace externo. Los archivos originales ahora SÍ pueden subirse a Supabase Storage, foto por foto.
- **En Studio**: cada foto de la galería tiene un botón "Adjuntar original" para subir el archivo a tamaño completo correspondiente a esa foto de vista previa. Una vez subido, se ve "✓ Original: nombre.jpg (tamaño)" y se puede quitar.
- **Nueva sección en Studio**: "Descargas del cliente" — lista qué ha descargado el cliente (una foto en concreto, o "todas las fotos (ZIP)") y cuándo.
- **En la página pública `gallery.html`**:
  - Botón "Descargar todo (ZIP)" — solo aparece si al menos una foto tiene su original adjunto. Al pulsarlo, arma un ZIP en el propio navegador del cliente con todos los originales disponibles y lo descarga.
  - Botón de descarga individual en cada foto — solo aparece en las fotos que tienen su original adjunto.
  - Cada descarga (ZIP o individual) queda registrada automáticamente.
  - Si una galería NO tiene ningún original subido, se mantiene el comportamiento antiguo: el botón usa el enlace externo (Drive/WeTransfer/etc.) como respaldo.

## 3. Archivos modificados esta sesión (ya sincronizados y commiteados en el Mac, commit `3e4b2ac`)

- `studio/index.html` — botón "Adjuntar original" por foto y sección nueva "Descargas del cliente".
- `studio/studio.js` — subida de originales a Supabase Storage, guardar/quitar original por foto, cargar y mostrar el registro de descargas.
- `gallery.html` — botón de ZIP (con la librería JSZip vía CDN), descarga individual por foto, y el registro de cada descarga.
- `supabase/schema.sql` — añadidas las columnas de original y la tabla `gallery_downloads` al final del archivo.
- `supabase/migration_gallery_downloads.sql` — **archivo nuevo**, para ejecutar en Supabase (ver sección 5).

## 4. Errores encontrados y corregidos en esta sesión (histórico)

- El botón "Descargar todas las fotos" se veía en pantalla incluso antes de meter el PIN correcto (bug de CSS). Corregido y verificado — commit `35ba04a`.
- Nada nuevo que corregir en esta continuación (originales + ZIP + registro) — todas las pruebas pasaron a la primera.

## 5. Pendiente — acciones del usuario

1. **Hacer `git push origin main` desde una terminal en el Mac real** (esta VM de Cowork no tiene credenciales de GitHub guardadas). Hay varios commits esperando, incluyendo `3e4b2ac` (originales + ZIP + registro), `35ba04a` (orbe + galerías) y, si tampoco se subieron antes, `0d14f07`/`ec99482` (rediseño del Studio).
2. **Ejecutar en el editor SQL de Supabase, en este orden si no se ha hecho ya**:
   - `supabase/migration_client_galleries.sql` (crea `client_galleries`, `gallery_photos`, `gallery_favorites`)
   - `supabase/migration_gallery_downloads.sql` (añade columnas de original a `gallery_photos` + crea `gallery_downloads`)
3. Opcional (de sesiones anteriores, si no se hizo ya): `supabase/migration_dashboard_v2.sql` para la columna `status` de proyectos.
4. **El usuario va a diseñar un mockup visual para `gallery.html`** — cuando lo envíe, aplicar ese diseño sobre la lógica ya construida (no reescribir la lógica, solo la maqueta/estilos).

## 6. Cómo usar la función completa (una vez publicado)

1. Abrir Studio → Proyectos → elegir un proyecto → botón "Galería cliente".
2. Activar la galería, poner un PIN si se quiere proteger.
3. Subir las fotos de vista previa.
4. Para las fotos que el cliente deba poder descargar en calidad completa: pulsar "Adjuntar original" en cada una y subir el archivo a tamaño completo.
5. (Opcional) Pegar un enlace externo de descarga como respaldo, por si alguna foto no tiene original adjunto.
6. Copiar el enlace y enviárselo al cliente.
7. El cliente abre el enlace, marca favoritas, descarga fotos sueltas o todas juntas en ZIP.
8. En Studio → esa misma galería → "Descargas del cliente" se ve el historial de qué ha descargado.

## 7. Pruebas realizadas

- Orbe de IA, galería privada, PIN, favoritas: probado en la sesión anterior (commit `35ba04a`) — ver historial de commits para el detalle.
- Esta continuación (originales + ZIP + registro), con Playwright y Supabase mockeado: subir un original a una foto en Studio actualiza la tarjeta correctamente (aparece "✓ Original…" y "Quitar original"); el registro de descargas en Studio muestra correctamente entradas de tipo "foto" y "ZIP" con su fecha; en la página pública, una galería SIN originales muestra el botón con el enlace externo de respaldo y sin botones de descarga individual; una galería CON al menos un original muestra el botón "Descargar todo (ZIP)" y el botón de descarga individual solo en esa foto; se probó el flujo de ZIP completo (arma el archivo y dispara la descarga en el navegador) y que cada descarga (individual o ZIP) queda registrada. Capturas revisadas visualmente. Cero errores reales de JavaScript.
- No se ha probado contra la base de datos real de Supabase (solo mockeada) — hay que ejecutar las migraciones SQL (sección 5) antes de probarlo en producción real.

## 8. Siguiente acción recomendada

Cuando el usuario vuelva: confirmar que ha hecho el `git push` y ejecutado ambas migraciones SQL pendientes en Supabase, y entonces probar la función real (subir una foto y su original en una galería de prueba, abrir el enlace en una ventana privada para simular al cliente, descargar la foto individual y el ZIP, y comprobar que aparecen en "Descargas del cliente"). Si el usuario manda su mockup visual para `gallery.html`, aplicar ese diseño sobre la lógica ya construida sin tocarla.
