# PROJECT_STATE.md — Estado del proyecto OPEN GRAIN

Última actualización: 2026-09-12 (0e. Auditoría completa de navegación de Studio tras el rediseño — el usuario pidió que "los botones, las pestañas... lleven a una parte, cada uno con sus formularios o páginas, con su diseño visual" y se hizo trabajando sin supervisión, para revisión al día siguiente). Sustituye/anula la sección 0 y la mayor parte de 2/2b/2c/2d de más abajo.

## 0e. Auditoría de navegación de Studio — botones/pestañas y su diseño (esta sesión, sin supervisión)

El usuario, tras confirmar que el rediseño ya estaba en producción (web pública + Studio), pidió: "que los botones, las pestañas y tal llevaran a una parte, cada uno con sus formularios o páginas, con su diseño visual y todo eso" — y dio permiso explícito para trabajar de forma autónoma y dejarlo listo para revisar al día siguiente ("te doy pleno derecho a hacer los cambios... mañana lo revisaré").

**Interpretación asumida** (no se pudo preguntar, el usuario se había desconectado): el mensaje se refería al panel Studio, ya que venía justo después de confirmar que el rediseño de Studio estaba en producción.

**Trabajo realizado — auditoría exhaustiva, no reconstrucción**:
1. Se sincronizó el workspace con el último commit real en GitHub (incluye la limpieza de `.git_stale_locks*` hecha desde el Mac).
2. Se listaron las 13 pestañas de `studio/index.html` (`overview, content, projects, galleries, services, ugc, messages, clients, bookings, analytics, inventory, quotes, settings`) y se confirmó en `studio.js` que **cada una ya tiene** un loader real conectado a Supabase (`tabLoaders`), su propio formulario/página, y ningún `TODO`/placeholder/"próximamente".
3. Se montó un arnés de pruebas Playwright + mock de Supabase (tablas: `clients, enquiries, inventory_items, media, portfolio_categories, portfolio_projects, projects, quotes, site_content, social_posts`) que inicia sesión y recorre las 13 pestañas + la pantalla de login, capturando pantalla y errores de consola de cada una.
4. Resultado: **0 errores de consola en las 13 pestañas** y en la pantalla de login. Todas las pestañas ya muestran una página/formulario propio, con el mismo lenguaje visual del rediseño (tarjetas `.og-card`, botones `.og-btn`, tipografía del sistema).
5. Se hizo además una comprobación automática de clases CSS "huérfanas" (usadas en el HTML pero sin ninguna regla en `styles.css`/`studio.css`) en ambos `index.html`. Se encontró **un bug real**: el botón "Sign in →" de la pantalla de login de Studio usaba clases antiguas (`btn btn-solid full-width`) que ya no existen en `studio.css` desde la reescritura del panel — se veía como un botón de navegador sin estilo (sin padding correcto, sin borde redondeado, sin ancho completo, sin animación de pulsación), justo en la primera pantalla que ve cualquiera al entrar en Studio.
6. **Arreglo aplicado**: clase cambiada a `og-btn login-submit` en `studio/index.html`, y se sustituyó la regla suelta `.login-form-panel .btn-solid{...}` por una nueva `.login-submit{...}` completa en `studio.css` (ancho completo, centrado, mismo color crema sobre panel oscuro que ya estaba pensado, con las transiciones/press-feedback del sistema `.og-btn`). Verificado por Playwright: botón ahora de 375×39px, esquinas redondeadas (999px), fondo correcto.
7. Se revisó también el sitio público (`index.html`) buscando enlaces/botones muertos (`href="#"` sin acción, botones sin clase de estilo) — no se encontró ninguno; todos los enlaces/CTAs ya llevan a secciones reales, WhatsApp, email, redes sociales o páginas legales reales.
8. Se volvió a correr el script de verificación del rediseño anterior (`verify_redesign.py`) para comprobar que no hay regresiones: sin errores nuevos (el único aviso, `.og-topbar` sin `.scrolled` en la pestaña "projects", es el mismo falso positivo ya diagnosticado en la sesión anterior — el viewport de prueba no genera scroll suficiente con tan poco contenido de ejemplo, no ocurre con datos reales).

**Conclusión para revisar mañana**: el panel Studio **ya estaba completo** — las 13 pestañas siempre llevaron a su propia página/formulario funcional conectado a Supabase; no hicieron falta páginas nuevas. El único problema real encontrado (y corregido) fue el botón de inicio de sesión sin estilo. **Si lo que Adama tenía en mente era otra cosa** (por ejemplo, que al hacer clic en un proyecto/cliente/reserva concretos de una lista se abra una página de detalle propia, en vez de editarse en línea en la misma lista — eso no existe todavía y sería un desarrollo nuevo, no un arreglo), pedir que lo aclare con un ejemplo concreto de qué botón/pestaña no le llevaba a donde esperaba.

**No se tocó**: ninguna tabla de Supabase, ningún loader/lógica de negocio en `studio.js` ni `main.js`, ningún dato real.

**Archivos modificados esta sesión**: `studio/index.html` (clase del botón de login), `studio/studio.css` (regla `.login-submit`).

## 0d. Rediseño visual completo — principios de interfaz fluida de Apple (esta sesión)

El usuario pidió explícitamente rediseñar toda la web (pública + Studio) usando la skill de diseño "Apple" (basada en las charlas de Apple sobre interfaces fluidas: respuesta instantánea, interrupción de animaciones, springs en vez de easings fijos, materiales translúcidos, tipografía óptica por tamaño). Se preguntó el alcance y eligió **rediseño visual completo** aplicado a **web pública + Studio**.

Se mantuvo la identidad de marca (paja/blanco cálido + negro casi puro, un único color de acento, etiquetas monoespaciadas editoriales) — esto es una pasada de diseño y artesanía, no un cambio de marca. Cambios concretos:

- **Tipografía**: `body{font-family:...}` en `styles.css` pasa de `Arial, Helvetica` a la pila de fuente del sistema (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial`) — en Mac/iPhone esto renderiza en San Francisco, la fuente de Apple, con su tracking óptico ya afinado por tamaño. Afecta a toda la web pública y a Studio a la vez (Studio no fijaba su propia fuente, heredaba de `body`).
- **Movimiento**: nuevas variables CSS `--ease-smooth`/`--ease-bounce`/`--ease-out` y `--dur-instant/fast/base/slow` en `styles.css` (aproximan con `cubic-bezier` los dos parámetros de un muelle de Apple — amortiguación y respuesta — ya que CSS no tiene muelles reales sin una librería JS). Se aplican a: nav (subrayado animado en los enlaces, botones con feedback instantáneo al pulsar), tarjetas de proyecto (elevación al pasar el ratón, compresión al tocar), CTA y botón de envío del formulario, tarjetas de servicios, redes sociales, y en Studio a los botones (`.og-btn`), tarjetas (`.og-card`) y elementos de navegación lateral (`.og-nav-item`) — todos ya tenían algo de esto, ahora usan las mismas variables en vez de valores sueltos.
- **Materiales**: la barra de navegación pública (`.glass-nav`) y la barra superior de Studio (`.og-topbar`) ahora "reaccionan" al hacer scroll — se compactan y su cristal (`backdrop-filter: blur`) se intensifica solo después de haber bajado un poco, en vez de tener siempre el mismo aspecto fijo. Nuevo `assets/motion.js` (web pública) y `studio/motion.js` (Studio) — scripts pequeños, sin dependencias, que solo añaden/quitan clases CSS (`.scrolled`, `.is-visible`); no tocan lógica de negocio ni datos.
- **Scroll-reveal**: cada sección de la web pública (`work`, `statement`, `services`, `studio`, `contact`, `social`, footer) aparece con una animación de aparición (opacidad + desplazamiento) la primera vez que entra en la pantalla, vía `IntersectionObserver` en `assets/motion.js` y el atributo `data-reveal` puesto directamente en `index.html` (puesto en el HTML, no por JS, para que no haya parpadeo visible-oculto-visible al cargar). El hero tiene su propia animación de entrada aparte (ya existía parcialmente, ahora más pulida) y no usa este sistema. Respeta `prefers-reduced-motion`: sin esa preferencia, solo cross-fade de opacidad, sin desplazamiento.
- **Arreglo de bug real encontrado durante la verificación**: en móviles estrechos (~390px o menos) el titular `OPEN GRAIN` del hero se salía de la pantalla porque forzaba una sola línea (`white-space:nowrap`) a un tamaño de letra que no cabía. Arreglado permitiendo que pase a dos líneas por debajo de 800px de ancho (`white-space:normal`) y ajustando el tamaño; comprobado sin desbordamiento horizontal en 320/390/430px.
- **Responsividad**: los paddings de sección (`.section-pad`) ahora usan `clamp()` en vez de saltos fijos en cada `@media`, para que la transición entre tamaños de pantalla sea más gradual (pedido explícito de sesiones anteriores sobre que la web se adapte "de forma fluida").

**No se tocó**: la lógica de negocio de `main.js` ni de `studio.js` (ningún `render*`, ninguna llamada a Supabase), ni la estructura de datos, ni ningún `id`/`class` del que dependa JavaScript para funcionar — solo se añadieron atributos `data-reveal` y dos `<script>` nuevos. El contenido (textos, fotos, proyectos) no cambió.

**Verificado con Playwright** (mock de Supabase): las 12 pestañas de Studio siguen cargando sin errores de consola, el scroll-reveal marca `.is-visible` en todas las secciones tras hacer scroll completo, la nav y la topbar de Studio ganan `.scrolled` al bajar, y se comprobó que no hay desbordamiento horizontal en 320/390/430/1440px. Capturas de pantalla en claro y oscuro, escritorio y móvil, revisadas visualmente antes de escribir en tu Mac.

## 0c. Recorte de fotos del portfolio público corregido

El usuario reportó que en la web pública una foto del portfolio salía "cortada" — se veía solo el torso de la persona, sin la cabeza. Causa: `.project-tile img` usa `object-fit:cover` dentro de una caja de proporción fija (`tall`=3/4, `wide`=4/3, `square`=1/1 en `styles.css`), y por defecto recorta centrado (`object-position:50% 50%`), lo que en fotos de personas suele cortar por arriba (la cabeza) igual que por abajo. No hay (todavía) un control por foto para elegir qué parte de la imagen se conserva.

**Arreglo aplicado**: cambiado el recorte por defecto de todas las fotos del portfolio a `object-position:50% 20%` (sesgado hacia arriba) en vez de centrado — así se prioriza conservar la cabeza/parte superior de la persona, a costa de recortar algo más por abajo, que suele notarse mucho menos. Esto es un ajuste global (afecta a todas las fotos del portfolio), no una solución por foto — si después de este cambio esa foto (u otra) sigue sin verse bien, la solución completa sería añadir un control de "posición de la foto" (arriba/centro/abajo, o un punto focal) por proyecto en Studio — no se ha construido todavía porque no se pidió explícitamente, pero es sencillo de añadir si hace falta.

Sobre "que las fotos se adapten al tamaño de pantalla/dispositivo": esto **ya funcionaba** antes de esta sesión — `.masonry-grid` usa `columns` (4 en escritorio → 3 en tablet → 2 en móvil, ver los `@media` en `styles.css`) y las imágenes son 100% del ancho de su columna con `aspect-ratio`, sin ningún ancho/alto fijo en píxeles ni en el HTML ni en el CSS. Se comprobó que no hace falta ningún cambio ahí — el problema real era solo el recorte (arriba), no la falta de responsividad.

## 0b. Biblioteca de archivos (Studio → Galerías) — ahora se puede borrar y copiar la URL (esta sesión)

El usuario reportó que en "Galerías → Biblioteca de archivos" podía subir archivos pero no borrarlos ni modificarlos. Revisando el código, esto era literalmente así: `loadGalleries()` en `studio.js` solo pintaba `<img>` por cada archivo del bucket `media/portfolio` en Supabase Storage — nunca se implementó ningún botón de acción sobre esos archivos. No era un bug de un botón roto, sino que la función nunca se construyó.

**Añadido**: cada miniatura de la Biblioteca de archivos tiene ahora dos botones superpuestos — copiar URL pública (icono de enlace) y eliminar (icono de papelera, con confirmación que avisa de que si esa foto se usa como portada de un proyecto o en el contenido del sitio dejará de verse ahí, ya que solo se borra el archivo del Storage, no las referencias que apunten a su URL). Eliminar llama a `supabaseClient.storage.from('media').remove([...])`. No se ha añadido "renombrar" (movería el archivo a otra ruta y rompería cualquier URL ya usada en un proyecto) — si hace falta, se puede añadir aparte.

## 0a. Galería de cliente eliminada del todo (esta sesión — anula la sección 0 de más abajo)

Tras simplificarla a "solo enlace externo" (ver sección 0 más abajo, de la sesión anterior), el usuario pidió ir un paso más allá y **quitarla por completo**: él mismo comparte el enlace de WeTransfer/Drive con el cliente por privado (WhatsApp o correo), sin que Studio ni la web pública tengan ninguna pieza de "galería de cliente". El panel de Studio se queda solo para uso propio (contenido del sitio, proyectos/portfolio público, servicios, UGC, mensajes, clientes, reservas, analíticas, inventario, presupuestos, ajustes) — el contenido que ven los visitantes de la web (portfolio, proyectos) no se ha tocado, solo se quitó la parte de compartir archivos en privado con un cliente concreto.

**Quitado**:
- El botón "Galería cliente" de cada tarjeta de proyecto en Studio → Proyectos.
- Todo el panel `data-panel="client-gallery"` en `studio/index.html` (la tarjeta con Cliente/Enlace privado/PIN/caducidad/enlace de descarga que se había dejado en la sesión anterior).
- Todo el módulo JS correspondiente en `studio.js`: `openClientGallery`, `loadClientGallery`, `galleryShareUrl`, `effectiveGalleryStatus`, `renderStatusPill`, `GALLERY_STATUS_LABELS`/`GALLERY_STATUS_PILL`, y los listeners de `cg-back`/`cg-preview-btn`/`cg-publish-btn`/`cg-pin-toggle`/`cg-save`/`cg-copy-link`.
- El archivo `gallery.html` (la página que veía el cliente) — movido a `_to_delete/gallery.html` en tu Mac en vez de borrado directamente (esta sesión no tenía permiso de borrado sobre tu carpeta); puedes borrar esa carpeta `_to_delete` tú mismo cuando quieras, o pedírmelo la próxima vez y lo hago yo con permiso.

**No se tocó**: `supabase/schema.sql` ni ninguna migración (las tablas `client_galleries`, `gallery_photos`, etc. siguen existiendo en la base de datos, simplemente ya no las usa ningún código — no hace falta ejecutar nada en Supabase para este cambio, y si algún día se quiere recuperar la función, las secciones 2/2b/2c/2d de más abajo documentan cómo funcionaba). Tampoco se tocó el resto del panel de Studio (Proyectos, Galerías, Servicios, UGC, Mensajes, Clientes, Reservas, Analíticas, Inventario, Presupuestos, Ajustes) ni la web pública (portfolio, proyectos, formulario de contacto).

**Verificado con Playwright** (mock de Supabase): el botón y el panel ya no existen en el DOM, las 12 pestañas de Studio cargan sin errores de JavaScript, y de paso se probaron los dos arreglos de las secciones 0b/0c de arriba (borrar/copiar URL en la Biblioteca de archivos, y el nuevo recorte de fotos). Los archivos (`studio/index.html`, `studio/studio.js`, `studio/studio.css`, `styles.css`) se escribieron directamente en tu Mac — **pendiente `git add -A && git commit && git push`**.

## 0. (Sesión anterior, ya anulada por la 0a de arriba) Galería de cliente simplificada a "solo enlace externo"

El usuario pidió explícitamente dejar de alojar fotos/vídeos en la Galería de cliente (con PIN, categorías, estrella de portada, papelera, adjuntos, revisiones, actividad y vista previa en vivo — todo lo descrito en las secciones 2/2b/2c/2d) y sustituirlo por algo mucho más simple: él sube el material a un servicio externo (WeTransfer, Drive, Dropbox…) y pega ese enlace; el cliente abre el enlace privado de OPEN GRAIN y ve un único botón "Descargar tus fotos" que lleva a ese enlace externo. Se preguntó explícitamente si sustituir del todo o dejarlo como alternativa manteniendo la galería completa — el usuario eligió **sustituir del todo**.

Qué se mantiene igual: el enlace privado por proyecto (`share_token`), el interruptor "Galería activa", "Proteger con PIN" (con verificación en servidor, sin cambios en `gallery_set_pin`/`gallery_check_pin`), la fecha "Disponible hasta", el nombre del cliente, y el estado borrador/publicada con su píldora. La tabla `client_galleries` no cambió de esquema — se sigue usando su columna `download_url`, que ya existía como "respaldo" en la v2 y ahora pasa a ser el campo principal.

Qué se quitó (de la interfaz; las tablas siguen existiendo en `schema.sql` por si se quiere recuperar más adelante, pero nada del código las usa ya): la zona de arrastrar-y-soltar para subir fotos/vídeos, la cuadrícula de medios (categorías, estrella de portada, papelera, "calidad completa", adjuntar original), la barra de selección múltiple, la sección "Archivos adjuntos", la tarjeta "Actividad del cliente" (favoritas/descargas/última visita), el panel "Vista del cliente" con iframe en vivo, y en la página pública: el masonry de fotos, el filtro de categorías, el modal de vídeo, marcar favoritas, el ZIP de descarga, y "Pedir revisión". El botón "Vista previa" ahora abre `gallery.html` en una pestaña nueva (ya no hay iframe embebido). `studio.js` se quedó ~1000 líneas más corto (se retiraron `handleGalleryUploads`, `renderClientGalleryPhotos`, `renderClientGalleryAttachments`, `renderClientGalleryActivity`, `renderClientGalleryRevisions`, `refreshPreviewFrame`, `uploadFileWithProgress`, `mediaPath`, `readVideoMeta`, `readImageDimensions` y las constantes `GALLERY_CATEGORIES`/`EXT_COLORS`, todas sin otro uso en el archivo).

**Archivos tocados**: `gallery.html` (reescrita a una página de 4 estados: código PIN, cargando, enlace roto, y la pantalla final con el botón de descarga — o "todavía no hay nada aquí" si el fotógrafo no ha puesto el enlace); `studio/index.html` (panel "Galería de cliente" reducido a una sola tarjeta: cliente, enlace privado, galería activa/PIN/caducidad, y el campo de enlace de descarga); `studio/studio.js` (ver arriba). No se tocó `supabase/schema.sql` ni ninguna migración — no hace falta ejecutar nada nuevo en Supabase para este cambio.

**De paso, se corrigió un bug real encontrado al verificar con Playwright**: en `gallery.html`, el mensaje "Código incorrecto" del PIN se veía siempre desde el primer instante (aunque tuviera el atributo `hidden`), porque la regla `.g-gate p.error{ display:flex; ... }` ganaba por especificidad al `display:none` que el navegador aplica a `[hidden]`. Es el mismo patrón de fallo ya documentado varias veces en las secciones de abajo (un `hidden` que pierde contra una clase CSS propia). Corregido añadiendo `[hidden]{ display:none !important; }` como regla global al principio de la hoja de estilos de `gallery.html`, así este patrón de bug no puede volver a colarse ahí.

**Verificado con Playwright** (mock de Supabase en memoria, sin tocar la base de datos real): panel de Studio simplificado carga sin errores, guardar ajustes con enlace de descarga + PIN funciona, "Publicar cambios" funciona; en `gallery.html` — sin enlace todavía → pantalla "todavía no hay nada aquí", con enlace → botón de descarga con el `href` correcto, con PIN activado → pide código, código correcto desbloquea y muestra el botón, token inexistente → pantalla de enlace roto. Cero errores de JavaScript en consola en todos los casos. Los archivos se escribieron directamente en el Mac del usuario (carpeta `open-grain` en el Escritorio, enlazada a esta sesión) — **pendiente que el usuario revise `git diff` y haga el commit + `git push`**.

**Pendiente / a considerar más adelante** (no bloquea el uso ya mismo): si en algún momento se quiere recuperar la galería con fotos propias para otro proyecto, el código de las secciones 2/2b/2c/2d de abajo describe exactamente cómo funcionaba y las tablas de la base de datos (`gallery_photos`, `gallery_attachments`, `gallery_favorites`, `gallery_downloads`, `gallery_revisions`, etc.) siguen intactas en `schema.sql` — no hace falta rehacer el diseño desde cero.

---

**Todo lo de abajo (secciones 1 a 9) documenta la v2 de la Galería de cliente con fotos/PIN/papelera, ya retirada de la interfaz según la sección 0 de arriba. Se deja como referencia histórica y por si se recupera esa función más adelante — no describe el comportamiento actual de `gallery.html` ni del panel "Galería de cliente" de Studio.**

## 2d. Auditoría completa de código (misma sesión, a petición del usuario: "revisa bien y elimina los errores/inconsistencias/simulaciones")

Tras publicar y migrar la base de datos real (ver sección 5 — el usuario encontró en el camino un bucket de Storage y una migración antigua, `migration_content_editor.sql`, que faltaban en su proyecto Supabase; no eran fallos de código, sino piezas de base de datos nunca ejecutadas en ese proyecto), el usuario pidió una revisión completa de `gallery.html`, `studio/index.html`, `studio.js`, `studio.css` y todas las migraciones SQL en busca de errores, inconsistencias y código simulado/falso. Se hizo con dos métodos:

- **Auditoría estática**: se comparó, por script, cada tabla/columna/función RPC/bucket de Storage que el JavaScript usa contra lo que `schema.sql` realmente define — todo coincide, no hay referencias rotas. Se comparó cada `getElementById` contra los IDs reales del HTML (los 3 "huérfanos" encontrados son elementos creados dinámicamente por JS justo antes de buscarlos — no son un fallo). Se buscó código de relleno/simulado (`TODO`, `fake`, `dummy`, `placeholder`, `mock`) en todo el proyecto — no hay ninguno; toda la lógica entregada es real y está conectada a Supabase.
- **Simulación real en navegador (Playwright)**: se cargó `gallery.html` con datos falsos en todos sus estados (galería completa en escritorio y móvil, enlace roto, sin token, con PIN correcto/incorrecto, galería vacía) y **todo el panel de Studio** (las 12 pestañas + el editor de galería de cliente completo, con interacciones reales: marcar categoría, marcar portada con estrella, selección múltiple, "Publicar cambios", vista previa) — cero errores de JavaScript reales en consola en cualquiera de esos estados.

**Único fallo real encontrado y corregido**: en los paneles "Contenido del sitio" y "Servicios", los campos de español e inglés debían ir uno al lado del otro (así lo indica el propio nombre de la clase CSS, `content-field-row`) pero faltaba la regla que los pone en fila — se apilaban uno debajo del otro, ocupando el doble de alto de lo necesario. Corregido en `studio.css` (nueva regla `.content-field-row{ display:flex; gap:10px }`, con vuelta a apilado en móvil estrecho). Este fallo es anterior a esta sesión (viene del rediseño del CMS de sesiones pasadas), no está relacionado con la galería de cliente.

**Segundo fallo real, encontrado justo después por el propio usuario (con una captura real del navegador) y no por la simulación automática**: al abrir Studio, se veía el panel completo (menú, "Buenos días, Adama", etc.) apilado detrás/encima de la pantalla de inicio de sesión, incluso sin haber iniciado sesión. Causa: `#dashboard` tiene el atributo `hidden` por defecto, pero su clase `.studio-shell` fija `display:flex` sin ninguna regla `.studio-shell[hidden]{ display:none }` que gane la partida — el atributo `hidden` del navegador pierde siempre contra una regla de una hoja de estilos propia (aunque tengan la misma especificidad, gana la hoja de estilos del autor sobre la del navegador). Es el mismo patrón de fallo que ya se había corregido antes en `.login-screen`, `.cg-bulk-bar`, etc., pero aquí faltaba. Revisando ese mismo patrón en el resto del proyecto aparecieron dos casos más con el idéntico problema: la burbuja roja "0" de Mensajes en el menú lateral (`#badge-messages` / `.og-nav-badge`, se quedaba visible aunque no hubiera mensajes nuevos) y el formulario "Nuevo proyecto" (`#project-form` / `.inline-form`, aparecía siempre abierto en Proyectos en vez de solo al pulsar el botón). Se añadió la regla `[hidden]{ display:none }` que faltaba a las tres clases. Verificado de nuevo con Playwright simulando "sin sesión" (el panel ya no aparece hasta iniciar sesión) y "con sesión, 0 mensajes" (la burbuja y el formulario ya no se ven de más) — sin efectos secundarios en el resto de formularios que comparten esas mismas clases.

La primera pasada de auditoría automática no detectó esto porque siempre simulaba una sesión ya iniciada desde el principio, así que nunca llegó a comprobar cómo se ve la página en el instante en que todavía no hay sesión — quedó documentado aquí como aprendizaje para la próxima revisión.

No se encontró ningún otro error, inconsistencia o dato simulado en el resto del código.

## 2c. Segunda pasada de fidelidad visual (misma sesión, el usuario pidió máxima fidelidad estructural)

Tras la primera corrección de fidelidad (sección 2b), el usuario pidió una reproducción mucho más literal del mockup: composición, jerarquía, espaciados, tipografía, radios, Liquid Glass y grid, en escritorio (1440×900) y móvil (390×844), con capturas reales de comparación. Cambios de esta pasada:

- **Cabecera del héroe (`gallery.html`)**: el subtítulo ahora es el texto corto "Toca el corazón para marcar tus favoritas" (como en el mockup) en vez del texto genérico "Galería privada". El nombre del cliente, cuando existe, se muestra como una pequeña etiqueta ("PARA MARTA GARCÍA") encima del título en vez de debajo — más parecido a un eyebrow de mockup, y desaparece limpiamente cuando no hay cliente asignado (antes siempre decía "GALERÍA PRIVADA"). Héroe más alto y con más padding, tipografía del título más grande.
- **4 pantallas de estado, reescritas para igualar el mockup**: "Introduce el código" (antes tenía un subtítulo más largo), con el campo de PIN en borde rojo + fondo rojo tenue y "⚠ Código incorrecto" cuando falla (antes solo un texto). "Cargando…" ahora tiene su propio título + "Un momento, por favor" como subtítulo (antes solo una frase). El enlace roto ahora tiene un icono circular de aviso en rojo y el texto exacto del mockup. **Nueva pantalla de galería vacía** ("Todavía no hay fotos aquí / Cuando el fotógrafo las comparta, aparecerán en esta galería.") con icono, que se muestra a pantalla completa cuando la galería no tiene ni fotos ni archivos adjuntos todavía (antes esto solo mostraba un texto suelto dentro de la cuadrícula).
- **Archivos adjuntos**: ya no es una lista de filas de ancho completo — ahora cada archivo es una "chip" redondeada compacta (icono + nombre + tamaño + descargar) en una fila que se ajusta según el ancho, y el botón "Descargar archivos" es una chip más al final de esa misma fila (antes vivía en la cabecera de la sección). Así en escritorio se ve igual que el mockup.
- **Panel de Studio — fila de ajustes en 3 columnas**: "Galería activa", "Proteger con PIN" y "Disponible hasta" ahora están en una sola fila de tres columnas (cada una con su interruptor o campo debajo), igual que en el mockup, en vez de estar apiladas una debajo de otra como antes.
- **Panel de Studio — zona de subida**: ahora tiene icono redondo + "Sube fotos y vídeos" en negrita + "Arrastra archivos aquí o selecciónalos" + botón "Seleccionar archivos" + formatos aceptados, todo en una fila (antes era una sola línea de texto). Cuando hay una subida en curso, aparece una chip a la derecha con miniatura real del archivo + nombre + porcentaje + barra de progreso (antes era una barra suelta debajo de la zona, sin miniatura).
- **Panel de Studio — barra de selección múltiple**: ahora es una barra clara con borde (como una tarjeta más), igual que el mockup — antes era una barra oscura invertida (fondo casi negro con texto claro), que no correspondía al mockup en absoluto.

**Limitación honesta que no se pudo resolver por completo**: el mockup de escritorio muestra tarjetas de ancho variable en la cuadrícula (por ejemplo, un vídeo más ancho que las fotos de alrededor, ocupando el espacio de casi dos columnas). La cuadrícula real usa un masonry por columnas CSS (`column-count`), que solo puede variar la ALTURA de cada tarjeta, no su ancho — todas las columnas miden lo mismo. Reproducir anchos variables de verdad requeriría un motor de "packing" tipo Pinterest (JavaScript calculando la posición de cada tarjeta) o CSS Grid con `grid-column: span N` calculado por tarjeta, que es un cambio de arquitectura de la cuadrícula bastante más grande. Se dejó documentado aquí en vez de darlo por bueno sin más — si quieres que se implemente el packing de ancho variable, dilo y se hace como una tarea aparte.

Verificado con capturas reales de Playwright a 1440×900 (escritorio) y 390×844 (móvil), en las 4 pantallas de estado y en el panel de Studio con la barra de selección activa. Los tests automáticos de Playwright de sesiones anteriores (`test_studio_gallery_v2.py`, `test_gallery_fidelity.py`) se volvieron a ejecutar después de estos cambios y siguen pasando sin errores de JavaScript.

## 1. Estado actual del proyecto

- **Sitio público**: funcionando en Vercel. Sigue habiendo commits sin subir a GitHub (ver sección 5) — el usuario debe hacer `git push` desde su Mac.
- **Panel Studio (admin)**: CMS general terminado (commit `ec99482`/`0d14f07`). El nav completo (Inicio, Contenido, Proyectos, Galerías, Servicios, UGC, Mensajes, Clientes, Reservas, Analíticas, Inventario, Presupuestos, Ajustes) **se mantiene tal cual** — no se ha sustituido por el nav simplificado de los mockups (Resumen/Galerías/Clientes/Archivos/Actividad/Ajustes), porque habría significado tirar secciones ya funcionales sin necesidad. Decisión tomada de forma autónoma según tu instrucción de "toma la opción más lógica y continúa".
- **Galería de cliente — v1/v1.5 (sesiones anteriores)**: galería privada con PIN, favoritas, originales + ZIP + descarga individual + registro de descargas, aspecto real por foto, 4 categorías, peticiones de revisión.
- **NUEVO ESTA SESIÓN — Galería de cliente v2**, implementada a partir de los dos mockups que enviaste (editor de Studio + página del cliente en modo claro/oscuro): ver sección 2. Commiteado localmente en el Mac (pendiente de hacer en esta sesión — ver sección 5). **Pendiente ejecutar `supabase/migration_gallery_v2.sql` en Supabase** antes de que funcione en producción.

## 2. Novedades de esta sesión (galería de cliente v2)

### Diseño fiel a los mockups
- `gallery.html` reescrita: cabecera fija con efecto Liquid Glass (blur), portada tipo hero con título/subtítulo, cuadrícula **masonry** real (columnas CSS, 1 en móvil → 4 en escritorio) donde cada tarjeta respeta su proporción real y muestra una etiqueta de formato (16:9, 9:16, 1:1, 4:3…), modo claro/oscuro persistido (antes solo dependía de la hora).
- El panel "Galería de cliente" en Studio se ha rediseñado para acercarse al mockup del editor: cabecera con miga de pan, píldora de estado, botones "Vista previa" / "Publicar cambios"; portada; campo Cliente; enlace + PIN + caducidad; zona de subida arrastra-y-suelta con barra de progreso real; cuadrícula de medios con badges de formato/estado/portada/calidad; barra de acciones en bloque; sección de archivos adjuntos; tarjeta de actividad del cliente; panel de "Vista del cliente" en vivo (pestañas móvil/escritorio, un iframe apuntando al enlace real).

### Vídeo (nuevo tipo de contenido)
Las fotos y los vídeos conviven en la misma galería. Al subir un vídeo, se capturan automáticamente su duración y una miniatura real (un fotograma), todo en el navegador — sin servidor de transcodificación. En la vista del cliente, el vídeo se ve con icono de reproducir y la duración encima, y al pulsar se abre en un reproductor a pantalla completa con controles nativos (play/pausa/volumen/progreso/pantalla completa). El vídeo original se sirve directamente desde Supabase Storage, que ya soporta "range requests", así que el cliente puede adelantar el vídeo sin descargarlo entero primero.

### Categorías (ahora 5, como en el mockup)
Stories, Publicación, Reel, **Mensajes** (antes "Envío directo") y **Web** (nueva). La migración renombra automáticamente las fotos que ya tenían la etiqueta antigua. El filtro de categorías en la web del cliente ahora muestra el recuento junto a cada una, igual que en tu mockup.

### Archivos adjuntos (función nueva)
Puedes añadir cualquier archivo (PDF, DOCX, TXT, XLSX, ZIP, audio…) a una galería desde Studio. El cliente los ve en una sección "Archivos adjuntos" con icono, nombre y tamaño, puede descargarlos uno a uno o todos juntos en un ZIP con "Descargar archivos". Desde Studio puedes renombrarlos, descargarlos o eliminarlos.

### Borrador / publicación / caducidad
Cada galería tiene ahora un estado (Borrador, Publicada, Desactivada, Caducada, Archivada) visible como píldora en Studio, un botón "Publicar cambios", y una fecha "Disponible hasta" opcional — pasada esa fecha, el enlace deja de funcionar automáticamente para el cliente aunque la galería siga "publicada" en la base de datos.

### Portada y calidad por foto
Puedes marcar cualquier foto de la cuadrícula con una estrella para usarla como portada de la galería (o subir una portada aparte), y cada foto/vídeo tiene un interruptor "Calidad completa" que decide si se ofrece para descarga individual/ZIP aunque tenga un archivo original adjunto.

### Selección múltiple y acciones en bloque en Studio
Como en el mockup: seleccionas varias fotos/vídeos de la cuadrícula y les asignas una categoría, cambias "Calidad completa" o las eliminas todas a la vez.

### Actividad del cliente
Tarjeta con favoritas totales, descargas totales y fecha de la última visita — con un registro real de visitas nuevo (antes esto no existía).

### Seguridad del PIN (cambio importante)
Antes, el PIN se guardaba en texto plano y el navegador del cliente lo comparaba él mismo — cualquiera podía verlo mirando la respuesta de red. Ahora:
- El PIN se guarda **solo como hash** (nunca en texto plano) y ni siquiera el rol público de la base de datos puede leer esa columna (bloqueado a nivel de base de datos, no solo en el código).
- La comprobación del PIN la hace una función en el servidor (Supabase), con un límite de 5 intentos y bloqueo de 5 minutos si se falla demasiadas veces.
- Esto se ha probado directamente contra una base de datos Postgres real (ver sección 7) — no solo simulado.

## 2b. Pasada de fidelidad visual contra los mockups (misma sesión, tras revisión del usuario)

El usuario señaló que la primera versión de la v2 no respetaba bien el diseño exacto de los dos mockups. Se comparó pantalla a pantalla (capturas reales con Playwright, datos de prueba realistas) contra ambas imágenes y se corrigieron las diferencias reales encontradas:

- **Botones primarios de la galería pública en color de acento (naranja/azul) en vez de monocromo**: el mockup usa botones blancos (modo oscuro) / negros (modo claro) para "Descargar todo (ZIP)" y "Entrar" (PIN), igual que ya hace `.btn-solid` en el sitio público principal (`styles.css`). Corregido en `gallery.html` para usar `var(--fg)/var(--bg)` en vez de `var(--accent)` en esos botones. (En Studio, el botón naranja "Publicar cambios"/"Guardar ajustes" se dejó igual a propósito: es el estilo `.og-btn-solid` ya usado en todo el panel de administración desde antes de esta sesión, no algo nuevo — cambiarlo solo aquí habría creado una inconsistencia con el resto de Studio.)
- **Etiqueta de proporción (9:16, 16:9…) mal colocada**: en el mockup aparece como texto junto a las categorías, debajo de la foto — no como una pastilla flotando encima de la imagen. Corregido: ahora vive en la misma fila que las categorías.
- **Iconos de archivos adjuntos sin color**: el mockup usa un cuadrado de color por tipo (rojo=PDF, azul=Word, gris=texto…). Añadida esa misma codificación de color en `gallery.html` y en Studio.
- **Cabecera móvil desbordada**: el botón "Descargar todo (ZIP)" con su texto no cabía junto al logo en móvil. Ahora se convierte en un botón circular solo con icono por debajo de 480px, como en el mockup (que no muestra el texto en la versión móvil).
- **Selector de portada en Studio**: el mockup muestra una miniatura compacta con "Cambiar portada" superpuesto encima de la imagen; la versión anterior usaba una caja grande vacía + un botón aparte al lado. Rehecho como miniatura de 120×120 con la etiqueta superpuesta.
- **Categorías por foto en Studio con casillas de formulario visibles**: el mockup las muestra como chips/etiquetas limpias sin checkbox visible. Se ocultó visualmente el `<input type="checkbox">` (sigue ahí y sigue funcionando, solo que ya no se ve el cuadradito). También se añadió el nombre de archivo + estado ("foto1.jpg · Listo") debajo de cada miniatura, que faltaba y sí aparece en el mockup.

No se tocó el nav lateral completo de Studio (se mantiene la decisión ya documentada en la sección 1 de conservar el CMS existente en vez del nav simplificado del mockup) — ese es un cambio de alcance mucho mayor, arriesga romper secciones ya funcionales, y no se ha rehecho sin confirmación explícita.

Verificado de nuevo con Playwright tras el cambio: los tests anteriores de Studio siguen pasando sin cambios de comportamiento, y se añadió un test nuevo (`test_gallery_fidelity.py`) que comprueba específicamente estos puntos (sin badge de proporción flotante, botón ZIP en color `--fg`, iconos de adjuntos con colores distintos, botón ZIP sin texto y cabecera sin desbordar en 390px de ancho). Cero errores de JavaScript en ambos casos.

## 3. Archivos modificados/creados esta sesión (en el workspace de Claude; **pendiente sincronizar y commitear en el Mac ahora mismo, ver sección 5**)

- `gallery.html` — reescrita por completo (Liquid Glass, masonry, vídeo, adjuntos, 5 categorías, PIN vía servidor, tema persistido).
- `studio/index.html` — sección "Galería de cliente" rediseñada (portada, cliente, PIN/caducidad, dropzone, badges, barra de selección en bloque, adjuntos, actividad, vista previa en vivo). El resto del panel no se ha tocado.
- `studio/studio.js` — módulo de galería de cliente ampliado: subida con progreso real (foto y vídeo), captura de metadatos de vídeo + miniatura, badges de formato/estado, estrella de portada, calidad completa, selección múltiple + acciones en bloque, CRUD de adjuntos, actividad (favoritas/descargas/última visita), borrador/publicación, vista previa en vivo.
- `studio/studio.css` — estilos nuevos para todo lo anterior (cuadrícula de medios con badges, dropzone, barra de selección en bloque, adjuntos, tarjeta de actividad, panel de vista previa).
- `supabase/schema.sql` — ampliado con el bloque "Client gallery v2" (ver `migration_gallery_v2.sql`).
- `supabase/migration_gallery_v2.sql` — **archivo nuevo**, para ejecutar en Supabase (ver sección 5).

## 4. Errores encontrados y corregidos esta sesión

- Mismo patrón de siempre: un elemento nuevo (`cg-upload-progress`, la barra de progreso de subida en Studio) tenía `hidden` en el HTML pero su clase CSS forzaba `display:flex` sin condición, así que se veía aunque estuviera "oculto". Corregido añadiendo la regla `[hidden]{ display:none !important; }` — se revisaron **todos** los elementos nuevos que se ocultan así, en ambos archivos, para no dejar ningún otro caso.
- Bug de diseño evitado a tiempo: la primera versión del PIN seguro comprobaba "¿hay PIN?" llamando a la misma función que valida el PIN con una cadena vacía — eso habría gastado uno de los 5 intentos permitidos cada vez que alguien simplemente abriera el enlace. Se corrigió añadiendo una columna pública `has_pin` (sin ningún dato sensible) para saber si hay que pedir PIN, sin tocar el contador de intentos.

## 5. Pendiente — acciones del usuario

1. **Hacer `git push origin main` desde una terminal en el Mac real** en cuanto esta sesión termine de sincronizar los archivos (esta VM de Cowork no tiene credenciales de GitHub guardadas).
2. **Ejecutar en el editor SQL de Supabase, en este orden si no se ha hecho ya**:
   - `supabase/migration_client_galleries.sql`
   - `supabase/migration_gallery_downloads.sql`
   - `supabase/migration_gallery_photo_meta.sql`
   - `supabase/migration_gallery_revisions.sql`
   - `supabase/migration_gallery_v2.sql` **(nuevo — obligatorio para todo lo de esta sesión)**
3. Opcional (de sesiones anteriores, si no se hizo ya): `supabase/migration_dashboard_v2.sql` para la columna `status` de proyectos.

## 6. Cómo usar la función completa (una vez publicado + migrado)

1. Abrir Studio → Proyectos → elegir un proyecto → botón "Galería cliente".
2. Rellenar cliente, subir portada (o marcar una foto con la estrella), activar PIN si se quiere, poner fecha de caducidad si aplica.
3. Arrastrar fotos y/o vídeos a la zona de subida — se procesan automáticamente (aspecto real, miniatura y duración de los vídeos).
4. Asignar categorías y "calidad completa" por foto, o seleccionar varias y hacerlo en bloque.
5. Añadir archivos adjuntos si hace falta compartir un PDF, contrato, etc.
6. Pulsar "Publicar cambios" (o activar "Galería activa" + Guardar).
7. Copiar el enlace y enviárselo al cliente.
8. El cliente abre el enlace (con PIN si lo pusiste), ve fotos y vídeos en masonry, filtra por categoría, marca favoritas, descarga fotos/vídeos/adjuntos o el ZIP, y puede pedir una revisión.
9. En Studio → esa misma galería → tarjeta "Actividad del cliente" y sección "Revisiones del cliente" para ver y responder.

## 7. Pruebas realizadas

- **Playwright + Supabase simulado** (`gallery.html`): PIN correcto/incorrecto, cuadrícula con fotos y vídeo (proporciones 16:9/9:16/1:1 correctas), badge de duración del vídeo, reproductor modal abre y cierra, botón de descarga individual solo aparece en fotos con "calidad completa", filtro de categorías con recuento (incluida la nueva "Mensajes"/"Web"), adjuntos listados y contados, ZIP de fotos y ZIP de adjuntos completan su flujo sin colgarse, marcar favorita, seleccionar fotos y pedir una revisión — todo sin errores de JavaScript. Capturas revisadas visualmente en claro/oscuro y escritorio/móvil.
- **Playwright + Supabase simulado** (Studio → Galería de cliente): panel carga sin errores, píldora de estado "Borrador" correcta, badges de formato/estado/vídeo en la cuadrícula, selección múltiple + asignación de categoría en bloque funciona, "Publicar cambios" cambia la píldora a "Publicada" y actualiza la vista previa, subida de adjunto (simulada) aparece en la lista y es editable, tarjeta de actividad muestra los contadores reales.
- **Base de datos real (Postgres, no solo simulada)**: se aplicó `schema.sql` completo (con el bloque nuevo incluido) contra una base de datos limpia sin errores. Se probó de punta a punta la función de PIN seguro: hash correcto, PIN incorrecto incrementa el contador, 5 fallos bloquean 5 minutos (incluso el PIN correcto falla mientras está bloqueado), y — el punto más importante — el rol público (`anon`) recibe un **error de permiso denegado** al intentar leer la columna del PIN directamente, y una galería "Desactivada" o "Borrador" desaparece por completo para ese rol, mientras que una "Publicada" sí se ve. Esto confirma que el PIN y las galerías no publicadas están realmente protegidos a nivel de base de datos, no solo escondidos en la interfaz.
- HTML de `gallery.html` y `studio/index.html` verificado con un analizador de etiquetas — sin etiquetas mal cerradas. `studio.js` y el script de `gallery.html` verificados con `node --check` — sin errores de sintaxis.
- No se ha podido probar contra el proyecto real de Supabase en la nube (sin credenciales aquí) — se probó contra una base de datos Postgres real y equivalente en este entorno, y contra Supabase simulado en el navegador. Hay que ejecutar `migration_gallery_v2.sql` en tu Supabase real antes de usarlo en producción.

## 8. Limitaciones conocidas (léelas antes de usarlo con un cliente real)

- **No hay "borrador" real de contenido**: al subir una foto o cambiar una categoría, se guarda al momento — "Publicar cambios" y el interruptor "Galería activa" controlan si el cliente puede VER la galería, pero no hay una copia de borrador separada de la publicada. Si quieres preparar cambios sin que el cliente los vea a medias, desactiva la galería mientras editas.
- **Vídeo sin transcodificación**: el vídeo que subes es el que ve el cliente (Supabase Storage sirve bien archivos grandes con soporte de reproducción parcial, pero no se generan automáticamente varias calidades). Para vídeos muy pesados, considera comprimirlos antes de subirlos.
- **Progreso de subida**: es un progreso real en bytes (no simulado) para cada archivo, pero no hay reintento automático si una subida falla a mitad — habría que volver a intentarlo manualmente.
- **Vista previa en vivo**: el panel "Vista del cliente" en Studio muestra el enlace real tal y como está guardado ahora mismo (se actualiza sola tras guardar/subir, o con el botón "Actualizar") — no refleja cambios sin guardar mientras escribes.
- El asistente de IA (`/api/ai-assist.js`) no se ha tocado ni tiene relación con la galería de cliente.

## 9. Siguiente acción recomendada

Cuando el usuario vuelva: confirmar que ha hecho el `git push` y ejecutado `migration_gallery_v2.sql` (y las anteriores si faltaban) en Supabase, y entonces probar la función real de punta a punta con fotos y vídeos reales, un PIN de verdad, y un archivo adjunto real.
