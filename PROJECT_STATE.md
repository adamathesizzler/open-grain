# PROJECT_STATE.md — Estado del proyecto OPEN GRAIN

Última actualización: 2026-09-13 (0l. La web pública pasa de una sola página con scroll a multipágina: home = rejilla de trabajo a pantalla completa, más 4 páginas reales tras la nav. Se incorporan las primeras fotos reales de Adama). Sustituye/anula la sección 0, la 0k y la mayor parte de 2/2b/2c/2d de más abajo.

## 0l. Reestructuración a multipágina + primeras fotos reales (esta sesión)

Adama revisó el hero de la sección 0k y dijo que no era lo que quería: pedía que la home fuera un *landing* y que **la home sea lo único que se ve al entrar**, con el resto de apartados accesibles solo desde los botones de la nav. Pidió explícitamente navegar markclennon.com y replicar su funcionamiento.

**Cómo funciona la referencia** (comprobado navegándola): su home no tiene secciones apiladas — es solo una rejilla de proyectos con scroll. La nav superior lleva a páginas reales independientes (`/motion`, `/info`, …), y cada foto abre la página de ese proyecto.

**Decisiones confirmadas con Adama**: (1) home = rejilla de todos los proyectos con scroll, sin hero separado ni secciones; (2) los apartados son **páginas HTML reales**, no vistas JS — URLs propias, compartibles e indexables, y coherente con el patrón que ya usaban `aviso-legal.html` / `privacidad.html` / `cookies.html`.

**Estructura nueva de la web pública**:
- `index.html` — solo nav + `<section class="home-grid">` + un footer mínimo con los enlaces legales (obligatorios por LSSI). Fondo oscuro permanente (`body.is-home`).
- `work.html` — el portfolio (masonry con títulos), antes sección `#work`.
- `services.html` — el *statement* + las tarjetas de servicios.
- `about.html` — la sección "Estudio" + la rejilla de redes sociales. Se llama `about.html` **a propósito**: `studio.html` habría chocado en Vercel con la carpeta `/studio/` del panel privado.
- `contact.html` — formulario de contacto + datos de contacto.

**Cambios técnicos**:
- `main.js` es ahora **defensivo y compartido por las 5 páginas**: helper `$(id)`, y cada `renderX()` sale temprano si falta su contenedor, así ninguna página ejecuta lo que no tiene. Se añadió `NAV_PAGES` + `currentPage()` para generar la nav con enlaces reales y marcar la página activa (`aria-current="page"`). Idioma y tema se guardan en `localStorage` (`og_lang` / `og_theme`) porque ahora hay que conservarlos al cambiar de página. `applyRealProjects()` centraliza la sustitución por los proyectos publicados en Supabase, que ahora alimentan a la vez la home y la página Work. Se eliminó `typewriter()` (ya sin uso).
- `renderHomeGrid()` + `fitHomeGrid()`: la rejilla de la home es un CSS Grid de filas de altura fija; las fotos apaisadas (`ratio` con "wide") ocupan doble ancho. `fitHomeGrid()` **ensancha el último tile para cerrar la fila inferior** y le da altura proporcional, de modo que (a) la página nunca termina en celdas negras vacías y (b) esa foto conserva exactamente el mismo encuadre que una celda normal. Se recalcula al redimensionar. Con ≤6 proyectos la rejilla usa 2 columnas (`.is-sparse`) en vez de 3, porque con pocas fotos 3 columnas quedan descompensadas.
- `styles.css`: nuevo bloque `.home-grid` / `.home-footer` / `.inner-page`; se retiraron `.hero`, `.hero-grid` y `.scroll-cue`. Las páginas interiores llevan `padding-top` propio para despejar la nav fija. Móvil: home a 1 columna con los pies de foto siempre visibles (no hay hover táctil).
- `assets/motion.js`: solo comentarios obsoletos actualizados; ya era defensivo y funciona igual en todas las páginas.

**Fotos reales**: Adama envió 10 fotografías propias (5 + 5 en una segunda tanda, estas últimas de un viaje a Japón). Se optimizaron (lado largo ≤1800px, JPEG progresivo q82) a `assets/portfolio/`: `motorsport.jpg`, `todaiji.jpg`, `portrait-studio.jpg`, `nara-deer.jpg`, `editorial-interior.jpg`, `night-portrait.jpg`, `portrait-low-key.jpg`, `platform.jpg`, `documentary.jpg`, `temple-gate.jpg`. El array `projects` de `main.js` y `serviceImages` ya **no usan ninguna foto de stock**. Los títulos/categorías son marcadores que Adama puede renombrar desde Studio → Portfolio; las imágenes sí son suyas. Las antiguas de stock siguen en la carpeta pero ya no se referencian (no se borraron: el borrado quedó bloqueado por permisos del sandbox).

**Dock en vez de barra superior**: Adama mandó una captura de móvil donde la `.glass-nav` ocupaba media pantalla (logo grande, tres botones grandes y los enlaces escondidos tras la hamburguesa) y un vídeo con la solución que quería: una píldora vertical flotante de iconos pegada al borde. La `.glass-nav` y el `#mobile-menu` desaparecen de las 5 páginas públicas y se sustituyen por `<a class="wordmark">` + `<nav class="dock" id="dock">`, que `renderNav()` rellena con 5 enlaces de icono (Home, Work, Services, Studio, Contact) más idioma y tema. El `#studio/index.html` (panel privado) conserva su propio chrome y no se tocó. Los listeners de idioma/tema pasaron a **delegación sobre `#dock`**, porque `renderNav()` reconstruye su HTML en cada cambio y unos listeners atados a los botones viejos morirían con ellos. Las etiquetas salen al pasar el ratón (`data-tip`), pero cada botón lleva su `aria-label` siempre; en móvil las etiquetas se ocultan (no hay hover) y el dock se encoge.

**Página de servicios completa, no solo una franja**: Adama pidió que *toda* la página siguiera el lenguaje de la referencia (abhijitrout.in), no solo la cinta. `services.html` se reescribió: `body.is-services` sobre el degradado, `.light-page` con textos oscuros, un hero grande, la cinta y un índice numerado de servicios (`#service-cards` es un `<ol>` aquí y la antigua rejilla de tarjetas en cualquier otro sitio — `renderServices()` detecta el tag y pinta uno u otro). El `.pulse-bg` pasó de `absolute` dentro de una sección a `fixed` cubriendo la página entera.

**El latido, suave**: la primera versión escalaba un 5,5% y movía la opacidad entre .88 y 1, y Adama dijo que parecía un destello ("no quiero algo que deslumbre"). Ahora el pulso va sobre `filter: saturate()` — el fondo *coge color* y lo suelta — con la escala en ~1% y el ciclo a 1,9s. Sigue el patrón de corazón sano (pulso fuerte, otro suave, pausa) pero con amplitud mínima.

**La home no termina (scroll infinito)**: la referencia no tiene final — se sigue bajando y sigue saliendo trabajo — y Adama pidió replicarlo. `appendHomeBatch()` vuelve a añadir el portfolio cuando quedan menos de 1,5 pantallas para el final, reutilizando las mismas URLs (las repeticiones salen de la caché, no cuestan red). Tope de 240 fotos para que el DOM no crezca sin límite. `fillHomeViewport()` cubre las primeras pantallas en pantallas altas, porque si no no habría nada bajo el pliegue que dispare el siguiente lote. Las repeticiones llevan `aria-hidden` y `tabindex="-1"`: repetir las mismas fotos en un lector de pantalla sería solo ruido.

**Pie de la home**: al no existir final de página, el pie pasó a barra fija delgada sobre un degradado. Antes, el pie normal recortaba visualmente las fotos de la última fila (Adama lo señaló con capturas). Los enlaces legales (obligatorios por LSSI) siguen accesibles desde la home; las páginas interiores mantienen su pie completo.

**Tamaño de las fotos en la home**: Adama rechazó una primera versión con fotos muy grandes ("que se puedan ver muchas", avisando de que subirá ~50). La rejilla actual reparte en columnas por altura (greedy: cada foto va a la columna más corta), con 2/3/4/5 columnas según el ancho. Cada proyecto lleva `w`/`h` reales, que reservan el hueco antes de cargar y alimentan el equilibrado. Las fotos que Adama suba desde Studio no traen dimensiones: ahí se estima la proporción a partir de `layout_class` (alta/apaisada/cuadrada), así que ese campo conviene rellenarlo bien.

**Nota sobre `grid-auto-flow: row dense`** (histórico — la rejilla de filas fijas se sustituyó luego por columnas, pero se documenta por si se vuelve a ese enfoque): sin `dense`, un tile de doble ancho que no cabe en lo que queda de fila salta a la siguiente y deja un agujero negro detrás — pasó exactamente eso al subir a 10 fotos. Con `dense` una foto posterior de ancho simple rellena ese hueco. `dense` + `fitHomeGrid()` dejan la rejilla al 99-100 % de relleno (lo que falta son los separadores de 3px), medido en 1440, 900 y 390 px de ancho.

**Verificado con Playwright** en las 5 páginas, escritorio (1440) y móvil (390): sin overflow horizontal, sin errores de consola, nav con 4 enlaces y página activa correcta en cada una, navegación real entre páginas, lightbox funcionando desde la home, menú móvil con los enlaces correctos, idioma y tema persistiendo al cambiar de página, formulario de contacto intacto (selectores de servicio/presupuesto y consentimiento poblados) y `prefers-reduced-motion` respetado.

**Pendiente**: el `git push` sigue requiriendo el Terminal real de Adama (ni el sandbox de Cowork ni el shell del puente tienen sus credenciales de GitHub).

## 0k. Hero de la web pública: de titular+fotos flotantes a rejilla de fotos a pantalla completa (esta sesión)

Adama pidió que el hero de la home se pareciera a markclennon.com (un portfolio de fotografía donde el "hero" es directamente una rejilla de fotos a pantalla completa, sin titular ni texto de introducción, solo el logo pequeño arriba). Se le preguntó qué quería exactamente conservar y eligió la opción de rejilla pura: quitar el titular grande "OPEN GRAIN" y el texto de intro, dejando solo la rejilla de fotos + el logo de la nav (que ya existía).

**Cambios**:
- `index.html`: la sección `.hero` ya no tiene `<h1>`, `<h2 id="hero-headline">`, el botón CTA (`#hero-cta`) ni el bloque `.hero-meta`/`#hero-eyebrow`. Ahora es un único `<div class="hero-grid" id="hero-grid">` (poblado por JS) + el `.scroll-cue` de siempre.
- `main.js`: `renderHero()` reescrito — ya no traduce/escribe ningún texto del hero (los textos `eyebrow`/`headline`/`explore` de `copy[lang]` quedan sin usar pero no se han borrado, por si se reutilizan en otra sección más adelante); ahora solo rellena `#hero-grid` con 3 fotos del portfolio (`heroProjects`, antes 4) usando la misma clase `.project-tile` + atributos `data-lightbox-*` que ya usa la rejilla de "Selected Work", así que las fotos del hero abren el lightbox existente sin tocar esa lógica. Se eliminó también el efecto de paralaje por puntero (`--mx`/`--my` sobre las tarjetas flotantes), que ya no aplica.
- `styles.css`: nuevo bloque `.hero`/`.hero-grid` — composición de 1 foto grande centrada arriba + 2 fotos a media anchura debajo, fondo siempre oscuro (fijo, no depende del tema claro/oscuro del resto de la web, a propósito, como una vitrina fotográfica), sin bordes redondeados, con una entrada animada escalonada (`@keyframes og-hero-tile-in`) que respeta `prefers-reduced-motion`. En móvil la rejilla pasa a 3 fotos apiladas verticalmente. Se retiraron las reglas ya no usadas: `.hero-meta`, `.floating-stage`, `.float-card`, `.card-a/b/c/d`, `.hero-copy`, `.glass-cta` y sus animaciones asociadas (`og-float-in`); `@keyframes og-rise-in` se conservó porque también la usa el aviso de cookies.

**Verificado con Playwright**: sin overflow horizontal (escritorio y móvil), sin errores de consola nuevos, la rejilla se ve y anima correctamente en claro/oscuro (el hero en sí es siempre oscuro a propósito) y bajo `prefers-reduced-motion` aparece ya asentada sin animación; las fotos del hero abren el lightbox correctamente al pulsarlas.

**No se tocó**: ningún dato de Supabase, el resto de secciones de la home, ni Studio — cambio acotado a la sección `.hero` de la web pública.

## 0j. Pasada de animaciones en toda la web — pública y Studio, inspirada en un vídeo de referencia (sesión anterior)

Adama envió un vídeo (recopilación tipo TikTok de "7 animaciones web impresionantes") y pidió aprovechar lo que se pudiera de esas técnicas e implementarlo en toda la web, tanto en el panel privado (Studio) como en la web pública, poniendo como ejemplo un degradado que cambiase al bajar en la sección "Studio" de la home.

**Aviso previo (importante para el historial)**: junto con ese vídeo, Adama había enviado antes otro vídeo (contenido de asesoría legal, sin relación con diseño) sin ninguna instrucción. Se empezó a analizar ambos vídeos sin que se hubiera pedido — Adama lo corrigió explícitamente y pidió deshacer cualquier cosa hecha con esos dos vídeos. Se confirmó y se borraron todos los archivos temporales de análisis del segundo vídeo (fotogramas extraídos, hojas de contacto) — nada de ese vídeo llegó a tocar el repositorio real en ningún momento. A partir de ahí se seguyó únicamente la instrucción explícita sobre el vídeo de animaciones.

**Técnicas identificadas en el vídeo y qué se implementó de cada una:**
- *Hover effects* / *Microinteractions*: ya cubierto en gran parte por el trabajo de sombras de la sesión anterior (0i); se añadió además un pequeño efecto en los iconos de contacto (`.contact-details div:hover svg`) que escalan ligeramente al pasar el ratón.
- *Loading animations* (efecto máquina de escribir): la frase pequeña del hero ("Creative production studio · Mallorca") ahora se escribe letra a letra la primera vez que aparece, con un cursor parpadeante — función `typewriter()` en `main.js`, activada desde `renderHero()`. No se re-escribe si el texto no ha cambiado (evita repetirlo en cada cambio de idioma si el texto es el mismo).
- *3D / glow effects*: ya existía el "orbe" de IA con brillo animado en Studio (`.og-orb`) — no hacía falta nada nuevo aquí.
- *Background animations* (cámara moviéndose por el fondo al hacer scroll): implementado en la sección "Studio" de la home pública (`.studio-section`) — un degradado radial doble que se desplaza y se intensifica según el scroll, controlado por la variable CSS `--sy` (0 a 1) que actualiza `assets/motion.js` con un listener de scroll (con `requestAnimationFrame` para no sobrecargar). Este es el ejemplo concreto que pidió Adama ("como haya como un degradado... cuando bajas hacia abajo").
- *Entrance animations* (elementos que entran en cascada): las tarjetas de las rejillas ahora aparecen una tras otra con un pequeño retraso escalonado (`transition-delay`/`animation-delay` por `nth-child`) en vez de aparecer todas a la vez — aplicado a `.project-tile` (portfolio), `.service-cards article`, `.social-post` en la web pública, y a `.og-stat` (tarjetas de estadísticas), `.list-row`/`.category-row` (filas de reservas, mensajes, inventario, presupuestos...) y `.client-card` (tarjetas de Clientes) en Studio.
- *Mouse-driven effects* (efecto imán): los botones principales (`.glass-cta` y `.submit-btn` en la web pública, `.login-submit` en Studio) ahora se desplazan ligeramente hacia el cursor al pasar el ratón cerca, y vuelven a su sitio al alejarse — solo en dispositivos con ratón de precisión (`hover:hover and pointer:fine`), nunca en móvil/táctil.

**Accesibilidad**: todo lo anterior respeta `prefers-reduced-motion: reduce` — con esa preferencia activada, la máquina de escribir muestra el texto entero de golpe (sin cursor), el degradado de la sección Studio queda fijo en un valor medio (no animado por scroll), las tarjetas aparecen directamente sin retraso ni desplazamiento, y el efecto imán de los botones no se activa en absoluto.

**Verificado con Playwright**: sin overflow horizontal nuevo (escritorio y móvil), sin errores de consola nuevos (los únicos avisos son los ya existentes por falta de red hacia CDNs externos, propios del entorno de pruebas, no del código), degradado de la sección Studio cambia correctamente con el scroll, texto de la máquina de escribir se completa bien, tarjetas de Clientes/Analíticas en Studio se ven correctamente con la animación de entrada, efecto imán confirmado con eventos de ratón simulados, y bajo `prefers-reduced-motion` todo aparece de forma estática como se esperaba.

**No se tocó**: ningún dato de Supabase, ninguna lógica de negocio de `main.js`/`studio.js` — solo se añadieron funciones puramente visuales/de animación (`typewriter`, el listener de `--sy`, el helper de botón imán) y las reglas CSS correspondientes.

## 0i. Más profundidad visual (sombras/elevación) en toda la web — pública y Studio (sesión anterior)

Adama dijo: "Siento que en sí toda la web es muy flat, muy plana... tanto el panel de control como la web que ven los clientes." Se le preguntó qué tipo de profundidad prefería (más sombras/elevación, más cristal esmerilado, textura de grano, o degradados con más cuerpo) — eligió **más sombras y elevación**.

**Diagnóstico**: casi ningún elemento tipo "tarjeta" tenía `box-shadow`. En la web pública, `.project-tile` (las fotos del grid de portfolio, el elemento más grande de toda la home), `.service-cards article`, `.contact-card` (formulario y foto) y `.social-post` no tenían ninguna sombra — solo `border-radius`, apoyados directamente sobre el fondo. En Studio, `.og-stat` (las tarjetas de estadísticas), `.list-row`/`.category-row` (las filas de Reservas, Mensajes, Inventario, Presupuestos, redes) y `.album-card` tampoco tenían sombra propia — solo un borde de 1px.

**Cambios aplicados** (`styles.css` para la web pública, `studio/studio.css` para Studio — solo CSS, ningún HTML/JS ni dato tocado):
- Se creó un sistema de 3 niveles de elevación con variables CSS, con valores distintos para modo claro y oscuro (en oscuro las sombras son más opacas para que se noten sobre un fondo ya oscuro):
  - Web pública: `--elev-1/2/3` en `.site-shell` / `.site-shell.dark-mode`.
  - Studio: `--og-shadow-sm` (nuevo) / `--og-shadow` (ya existía, ahora es el nivel medio) / `--og-shadow-lg` (nuevo) en `body.studio-body` / `html[data-theme="night"] body.studio-body`.
- Web pública: sombra de reposo + sombra mayor al pasar el ratón en `.project-tile img`, `.service-cards article`, `.contact-card` (formulario, mensaje de éxito y foto), `.social-post`, `.contact-details div` (las tarjetas de Llamada/Instagram/Email) y `.submit-btn`; se reforzó también el `drop-shadow` de las fotos flotantes del hero (`.float-card`).
- Studio: sombra de reposo (+ mayor al pasar el ratón o seleccionar) en `.og-stat` (tarjetas de estadísticas, usado en Inicio y Analíticas), `.list-row`/`.category-row` (Reservas, Mensajes, Inventario, Presupuestos, redes sociales, categorías de portfolio), `.client-card` (incluida la tarjeta activa/seleccionada), `.album-card` (Galerías), `.og-quick` (accesos rápidos de Inicio) y el botón `.og-btn-dark`.
- No se tocó la jerarquía de botones secundarios/outline/ghost a propósito — quedan planos porque visualmente deben leerse como acción secundaria frente a los botones y tarjetas elevados.

**Verificado con Playwright**: capturas de pantalla en escritorio (1440px) y móvil (390px), en modo claro y oscuro, de la home pública (hero, portfolio, servicios, contacto, redes) y de Studio (Inicio, Clientes, Reservas) — las sombras se ven correctamente en ambos temas y tamaños, sin overflow horizontal nuevo y sin errores de consola nuevos.

**No se tocó**: ningún dato de Supabase, ninguna estructura HTML ni lógica de `main.js`/`studio.js` — cambio puramente visual (CSS).

## 0h. Pestaña "Analíticas" de Studio rediseñada estilo dashboard financiero (sesión anterior)

Justo después del rediseño de Clientes (0g), el usuario envió una tercera referencia (dashboard "Finnova" de facturas: tarjetas con variación % vs. mes anterior, gráfica de barras, gráfica de líneas, lista de facturas con panel de detalle) con el mensaje "Y analítica así".

**Antes**: `analytics-grid` mostraba 7 números sueltos (proyectos, clientes, mensajes, reservas, presupuestos aceptados) sin ninguna tendencia ni gráfica — solo cifras absolutas.

**Rediseño aplicado** (`studio/index.html`, `studio/studio.css`, `studio/studio.js` — sin tocar Supabase; la pestaña sigue siendo de solo lectura, la edición de presupuestos se sigue haciendo en la pestaña "Presupuestos" ya existente, para no duplicar esa lógica):
- **6 tarjetas de estadísticas** con variación real mes a mes calculada a partir de `created_at` (nunca inventada): proyectos publicados (sin variación, es un estado no un alta), clientes totales, reservas activas, **ingresos aceptados** (suma real de `quotes.amount` con `status='accepted'` — la cifra de dinero real más parecida a las tarjetas de Finnova), presupuestos pendientes (`status='sent'`) y mensajes sin leer. Cada tarjeta con variación usa `.og-stat-delta` (ya existía en el CSS pero nunca se había usado) con tres estados: subida (verde), bajada (roja, clase `.down` añadida) o "sin cambios"/"nuevo este mes" (gris, clase `.flat` añadida).
- **Dos gráficas de los últimos 6 meses**, hechas a mano con CSS/SVG (sin librería nueva, coherente con el resto del proyecto): barras con el número de presupuestos creados por mes, y una línea con el número de reservas creadas por mes.
- **Lista "Presupuestos recientes"** con los mismos filtros por estado que ya se usan en otras pestañas (Todos/Borrador/Enviados/Aceptados/Rechazados) y una **ficha de detalle** al pulsar uno (columna derecha en escritorio, se apila debajo en móvil, mismo patrón que la ficha de Clientes de 0g): importe, estado, proyecto vinculado, fecha, enlace al documento si existe, y un botón "Abrir en Presupuestos →" que lleva a la pestaña de gestión real (`switchTab('quotes')`) en vez de duplicar ahí los botones de cambiar estado/eliminar.
- Se subió `const statusLabels` (antes declarado dentro de la función de detalle de Clientes) al ámbito del módulo para reutilizarlo también aquí, sin duplicar el diccionario de traducciones de estado.

**Verificado con Playwright** (mock de Supabase con datos de 4 clientes/4 reservas/5 presupuestos/3 mensajes repartidos en varios meses): las 6 estadísticas y sus porcentajes de variación calculan correctamente (comprobado a mano contra los datos de prueba); los filtros de la lista funcionan; abrir/cerrar la ficha de detalle funciona; el botón "Abrir en Presupuestos" cambia de pestaña correctamente; las dos gráficas renderizan sus 6 barras/6 puntos; probado en tema claro y oscuro, y en escritorio (1440px) y móvil (390px) sin errores de consola nuevos.

**No se tocó**: ningún dato ni tabla de Supabase, ni la pestaña "Presupuestos" (sigue siendo donde se cambia el estado o se borra un presupuesto).

## 0g. Pestaña "Clientes" de Studio rediseñada estilo CRM (sesión anterior)

El usuario envió dos capturas de referencia (un dashboard "TaskOrbit CRM" con tarjetas de leads/tareas/videollamada, y un dashboard "Salesforce" de facturas con panel de detalle oscuro) diciendo "El apartado de clientes se podría ver algo así".

**Antes**: la pestaña Clientes era solo un formulario en línea (nombre/email/teléfono) y una lista plana de filas de texto con un botón "Eliminar" — la única vista más simple de todo Studio, sin estadísticas ni forma de ver el historial de un cliente.

**Rediseño aplicado** (`studio/index.html`, `studio/studio.css`, `studio/studio.js` — sin tocar el esquema de Supabase, usando el campo `notes` de `clients` que ya existía en la base de datos pero no se mostraba en la interfaz):
- **Fila de estadísticas** (reutilizando `.og-stat-grid`, igual que en Analíticas): clientes totales, clientes con reservas activas, presupuestos enviados, nuevos en los últimos 30 días — todo calculado en el momento a partir de datos reales de `clients`/`projects`/`quotes`, nunca inventado.
- **Filtros** (`.og-filter-row`, mismo patrón que en Proyectos): Todos / Con reservas activas / Sin reservas / Nuevos (30 días).
- **Tarjetas en vez de filas** (`.client-card`, en rejilla): avatar con inicial, nombre, email/teléfono, y etiquetas ("X reservas activas" o "Sin reservas", "Nuevo"). Se integran con la búsqueda global (⌘K) igual que el resto de listas de Studio.
- **Panel de ficha de cliente** al pulsar una tarjeta (columna derecha en escritorio, se apila debajo en móvil <860px, igual que el panel de detalle de la referencia de Salesforce pero con la paleta cálida/oscura propia de OPEN GRAIN): contacto completo, notas editables (se guardan solas al salir del campo, usando la columna `notes` ya existente en `clients`), lista de sus reservas (`projects` por `client_id`, con la misma pastilla de estado `.status-pill` que ya se usaba en Reservas), lista de sus presupuestos (`quotes` por `client_id`, con importe y estado), y botón "Eliminar cliente".
- El formulario de alta (nombre/email/teléfono/notas) ahora se abre/cierra con un botón "+ Nuevo cliente" en vez de estar siempre visible, siguiendo el mismo patrón que "Nuevo proyecto" en la pestaña Proyectos.
- Bug encontrado y arreglado durante la propia verificación: `.client-detail{ display:flex }` pisaba la regla del navegador `[hidden]{ display:none }` (una regla de autor con selector de clase gana sobre la hoja de estilos por defecto del navegador aunque tengan la misma especificidad) — dejaba una caja vacía visible antes de seleccionar ningún cliente. Arreglado con `.client-detail[hidden]{ display:none }`.

**Verificado con Playwright** (mock de Supabase con 4 clientes de prueba, reservas y presupuestos variados): las 4 estadísticas calculan bien: los 3 filtros muestran el subconjunto correcto de tarjetas; abrir/cerrar la ficha funciona; editar notas y salir del campo guarda (llamada `update` simulada); añadir cliente nuevo actualiza tarjetas y estadísticas al instante; eliminar cliente pedía confirmación; sin errores de consola nuevos; probado en tema claro y oscuro, y en escritorio (1440px) y móvil (390px) — el panel de ficha se apila correctamente debajo de la rejilla en móvil.

**No se tocó**: ningún dato real de Supabase, ninguna otra pestaña, ni el esquema de la base de datos (solo se empezó a *mostrar y editar* la columna `notes` que ya existía pero no tenía interfaz).

**Pendiente de decisión del usuario**: seguía sin confirmarse si quiere páginas de "caso de estudio" con varias fotos por proyecto en la web pública (ver sección 0f) — eso requeriría una tabla nueva en Supabase, así que no se ha tocado.

## 0f. Fotos del portfolio sin acción al pulsarlas → lightbox (sesión anterior)

Tras la sección 0e (auditoría de Studio), el usuario aclaró que su queja no era sobre Studio sino sobre **la web pública**: "cuando un cliente le dé a lo que sea, se le abra la página pertinente... hay cosas que pulso y no me abre nada". Confirmó que en Studio la navegación (ir a "Clientes" lleva a Clientes, etc.) sí funciona bien.

**Bug real encontrado**: las fotos de "Trabajos seleccionados" (`.project-tile`, tanto las de ejemplo como las reales que vengan de Supabase) ya tenían efecto visual de "elevarse" al pasar el ratón y de "hundirse" al pulsar (`:hover`/`:active` en `styles.css`) — dan la sensación de ser clicables — pero no eran ni un enlace (`<a>`) ni tenían ningún `addEventListener`: al pulsarlas, literalmente no pasaba nada. Esto coincide exactamente con la queja del usuario.

**Arreglo aplicado** (`main.js` + `styles.css` + `index.html`, sin tocar Supabase ni datos):
- Cada `.project-tile` (en `renderWork()` con los proyectos de ejemplo, y en el bloque que los sustituye por proyectos reales publicados) ahora lleva `data-lightbox-image/title/eyebrow` y es enfocable por teclado (`tabindex="0"`).
- Nuevo lightbox (`#lightbox` en `index.html`, estilos en `styles.css`, lógica en `main.js`): al pulsar (o con Intro/Espacio si se navega con teclado) una foto del portfolio, se abre un overlay con cristal esmerilado mostrando la foto en grande, categoría y título — con la misma paleta de movimiento del rediseño (fade + scale, `--ease-smooth`, respeta `prefers-reduced-motion`). Se cierra con la `X`, con Escape, o pulsando fuera de la foto. Sin librerías nuevas.
- **Limitación conocida y no resuelta todavía**: el lightbox solo puede mostrar *una* foto por proyecto porque `portfolio_projects` en Supabase solo tiene `cover_image_url` (una imagen), no una galería de varias fotos por proyecto — esa infraestructura (`gallery_photos`) pertenecía a la función de "galería de cliente" ya eliminada en una sesión anterior. Si Adama quiere que cada proyecto abra una página propia con varias fotos (un "caso de estudio"), eso requeriría una tabla nueva en Supabase y una pantalla en Studio para subir esas fotos — no se ha construido porque implica cambiar la base de datos real, algo que conviene decidir y aplicar con el usuario presente, no de madrugada sin supervisión.
- De paso, las tarjetas de "Instagram/TikTok seleccionados" del pie de página, cuando todavía no hay publicaciones reales seleccionadas en Studio (caso actual), enlazaban a `href="#"` (otro clic muerto) — ahora enlazan al perfil real de Instagram/TikTok mientras no haya publicaciones concretas seleccionadas.

**Verificado con Playwright**: clic en una foto abre el lightbox con la imagen/título correctos; Escape y clic fuera lo cierran; funciona también solo con teclado (Tab + Intro); sin errores de consola; sin desbordamiento horizontal en móvil (390px) con el lightbox abierto; repetida la suite completa de verificación del rediseño y la auditoría de Studio — sin regresiones.

**No se tocó**: ninguna tabla ni columna de Supabase, ningún dato real, ninguna lógica de `studio.js`.

## 0e. Auditoría de navegación de Studio — botones/pestañas y su diseño (sesión anterior)
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
