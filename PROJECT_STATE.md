# PROJECT_STATE.md — Estado del proyecto OPEN GRAIN

Última actualización: 2026-09-20 (0p. Arreglos de la auditoría UX/UI, sin tocar la portada).

## 0p. Arreglos de la auditoría UX/UI (20.09.2026, esta sesión)

### Qué se pidió

Adama pidió una auditoría UX/UI de open-grain.vercel.app (accesibilidad, marca, interfaz) y
después «hazme todo lo que hay que hacer, pero pregúntame antes». Respuestas que dio:

- **La portada no se toca** («no me jodas la página hero»). Sólo se permitieron cambios
  invisibles en su código (alt, idioma, semántica, enlaces). **Comprobado píxel a píxel.**
- Aprobó fuera de la portada: formulario antes que la tarjeta en Contacto móvil, subir
  contraste, botón de pausa en el carrusel de Servicios y 404 con la marca.
- Menú (notch): sólo «que no tape campos», fuera de la portada.
- Idioma por defecto: el del navegador. Sección de redes vacía: ocultarla.
- Dominio: todavía no tiene opengrain.studio. Correo: se queda Gmail por ahora.
- Contenido («dime tú»): descripciones de servicios sí; precios no (sin cifras inventadas);
  frase de Proyectos «desde Mallorca y de viaje»; Google Analytics para después; pestaña
  YouTube oculta mientras no haya canal.

### Qué se ha hecho

| Área | Cambio |
|---|---|
| Idioma | Primera visita según el navegador (es/ca → español; resto → inglés). La elección guardada manda. |
| Portada (invisible) | h1 oculto en el idioma de la página; piezas con `role="button"` y `aria-label` («Ampliar: título, tipo. descripción»); alt descriptivo; enlaces sin `.html`; enlaces legales con `lang="es"`. |
| Fotos | `PHOTO_ALT` en `main.js`: descripción ES/EN de las 24 fotos, escrita mirando cada una. Las de Studio usan título — tipo. |
| Proyectos | Piezas `<article>` → `<figure role="button">` (mismas clases, mismo aspecto). Frase: «desde Mallorca y de viaje». |
| Servicios | Descripción bajo cada servicio (las mismas `serviceBlurbs` de la tarjeta de Contacto). Botón Pausar/Reanudar del carrusel (a la izquierda, lejos del notch; oculto con movimiento reducido). |
| Estudio | Sección «Lo último del estudio» oculta hasta que haya publicaciones seleccionadas; pestaña de una red sólo si tiene publicaciones o perfil (YouTube fuera). Colores de noche que faltaban (titular a 1,1:1). `socialLede` ya no es un texto del panel. |
| Contacto | Formulario primero en móvil. h2 oculto «Otras formas de contactar». Presupuesto: «Elige un rango (€)» en vez de «€». Contraste de noche dentro de las tarjetas. |
| Notch | Si en el lateral queda encima de un campo de formulario, se desvanece y deja pasar el toque (`og-notch-yield`). En la portada no hay campos: allí no cambia nada. Botón de idioma con nombre accesible («Switch language to Spanish»). |
| Diálogos | Nombres de la vista ampliada y de la publicación en el idioma de la página; sin h3 vacío si la publicación no tiene pie; vista ampliada retirada de Servicios, Estudio y Contacto (no se usaba). |
| Contraste | 21 fallos medidos contra el fondo pintado → 0 (Servicios, Estudio, Proyectos, Contacto, legales, 404; claro y oscuro; escritorio y móvil). |
| Enlaces | Todos los internos sin `.html` (antes cada clic pasaba por un 308 de Vercel). |
| 404 | `404.html` nueva, bilingüe, con el papel de las legales y salidas a Inicio, Proyectos y Contacto. |
| Aviso legal | El sitio es `open-grain.vercel.app` (antes decía opengrain.studio, que aún no existe). |

### Archivos

Modificados: `index.html`, `work.html`, `services.html`, `about.html`, `contact.html`,
`aviso-legal.html`, `privacidad.html`, `cookies.html`, `main.js`, `styles.css`,
`assets/default-copy.js`, `assets/ux/og-notch.js`, `assets/ux/og-ux-fixes.css`.
Nuevos: `404.html`, `pruebas/test_auditoria.py`, `pruebas/servidor_limpio.py`.

### Pruebas realizadas (Chromium, sitio completo en local con URLs limpias)

| Prueba | Resultado |
|---|---|
| Portada idéntica al original, píxel a píxel: 2 tamaños × 2 temas × 2 idiomas, con y sin movimiento, y con foco de teclado | **16/16 + 4/4** idénticas |
| `pruebas/test_auditoria.py` (idioma, semántica, lightbox, servicios, pausa, redes, contacto móvil, notch, 404, enlaces, errores JS) | **70/70** |
| Contraste real contra el fondo pintado, 6 páginas × 2 temas × 2 tamaños | **0 fallos** (antes 21) |
| `test_formulario.py` y `test_notch.py` | Mismo resultado antes y después (38 y 33 pasan). Sus fallos son expectativas antiguas: el notch va a la derecha desde la 0ñ y la tabla ya guarda el consentimiento. |

### Pendiente

- **Google Analytics**: `assets/config.js` sigue con `G-XXXXXXXXXX`; no se mide nada. Falta el ID real.
- **Dominio y correo**: cuando compre opengrain.studio, conectarlo en Vercel, redirigir
  el .vercel.app y cambiar el correo de contacto, pie y textos legales.
- La portada conserva lo que la auditoría marcó y Adama decidió no tocar: pie de 8px
  sobre las fotos y ausencia de titular/botón visible.
- `test_notch.py` y `test_formulario.py` necesitan actualizarse a la realidad actual.
- **Siguiente encargo, ya anunciado por Adama**: sustituir el notch por una barra de
  navegación flotante abajo, estilo Pinterest (iconos casa / lupa / perfil), fija
  mientras se desliza, en todas las páginas incluida la portada. Hay que hacerle las
  preguntas antes de empezar.

### Siguiente acción recomendada

Revisar la preview de la rama `fix/auditoria-ux` en Vercel y, si le parece bien,
fusionarla en `main`. Después, preguntas de la barra estilo Pinterest.

## 0o. Tarjeta de reserva del cliente (sesión anterior)

### Qué se pidió

Adama quiere que, al confirmar una reserva, el cliente reciba una **tarjeta** con los datos
de su sesión. Primero se diseñaron cinco conceptos (anverso y reverso, en vertical tipo pase
móvil y en horizontal tipo email) en un lienzo de diseño aparte. Eligió llevar a código el
concepto claro, con el ahumado como su versión oscura, y empezar por la página web; el email
de confirmación va después y enlazará a ella.

### Decisiones tomadas

1. **Las reservas son la tabla `projects`** (`status in confirmed/in_progress/delivered`),
   que es admin-only. Una página pública no puede leerla con la anon key y abrir una policy
   expondría a todos los clientes.
2. **Lectura por token con `security definer`, no policy abierta.** Se añade la función
   `public_booking(token uuid)`, que devuelve sólo la reserva cuyo `public_token` coincide y
   sólo los campos del cliente. `notes` y `budget_range` quedan fuera a propósito. RLS sigue
   cerrada sobre la tabla.
3. **Campos nuevos en `projects`**: `start_time`, `end_time`, `location`, `deliverables`,
   `delivery_note`, `cover_url`, `public_code` (OG-0001, OG-0002…) y `public_token`. Antes no
   existía hora, lugar ni entrega, así que la tarjeta no podía contarlos sin inventárselos.
4. **La tarjeta usa el sistema del sitio, no la paleta del lienzo**: papel cálido, azul de
   marca, etiquetas en mono y las curvas de `styles.css`. Oscuro por hora, como el resto del
   sitio, y además gana el modo oscuro del dispositivo si lo tiene puesto.
5. **Nada inventado**: cada fila del reverso aparece sólo si ese dato existe en la reserva.
   Sin imagen de portada, la tarjeta usa una portada tipográfica en vez de un hueco gris.
6. **No se ha tocado ninguna página existente.** Todo son archivos nuevos.

### Movimiento (principios de Emil Kowalski)

Entrada de la tarjeta desde `translateY(10px) scale(.985)`, escalonado de 50 ms, portada con
`scale(1.045) → 1`, el check del sello se dibuja, pulsación `scale(.97)`, hover sólo en
punteros finos, foco siempre visible y `prefers-reduced-motion` con cruce de opacidad en vez
de giro. El paso anverso → reverso es un giro 3D hecho con **transición**, no keyframes: se
puede interrumpir a mitad y vuelve desde donde está.

### Archivos creados

- `supabase/migration_booking_card.sql` — campos nuevos, código público y función de lectura.
- `reserva.html` — página de la tarjeta (`noindex`).
- `assets/reserva.css` — estilos de la tarjeta sobre los tokens del sitio.
- `assets/reserva.js` — carga por token, pintado, giro, `.ics` y estados.

### Pendiente

1. **Ejecutar `supabase/migration_booking_card.sql`** en Supabase → SQL Editor. Hasta que no
   se ejecute, `reserva.html` responde "No podemos cargar tu reserva ahora mismo".
2. Rellenar en el Studio los campos nuevos de alguna reserva y probar con su enlace real
   (`reserva.html?t=<public_token>`).
3. Mostrar en el Studio el enlace de la tarjeta de cada reserva, para poder copiarlo.
4. Plantilla de email de confirmación (versión sólida, sin cristal ni animación) que enlace
   a la tarjeta.

### Siguiente acción recomendada

Ejecutar la migración y abrir la tarjeta de una reserva real para verla con datos de verdad.


## 0ñ. Notch a la derecha, Contacto rediseñado y Studio alineado con la marca (esta sesión)

### Lo que pasó, en orden

1. La entrega 0n se publicó en producción y **Adama no reconoció su web**: además de mover
   el menú, había cambiado portada, Servicios, Contacto y la vista ampliada. Pidió volver
   al diseño de antes conservando sólo el notch, y que éste viajara **a la derecha** en
   lugar de a la izquierda.
2. Se restauró el diseño original partiendo del código intacto y se remontó únicamente el
   notch. **Comprobado píxel a píxel**: las cinco páginas quedaron idénticas al original en
   tema claro y oscuro, fuera de la zona de navegación (10/10).
3. Publicado por Adama. `origin/main` = `1b5158e`.
4. Después pidió rediseñar **Contacto** a partir de una referencia visual, y **Studio**
   aprovechando el lenguaje de la web pública, con libertad creativa.

### Notch: arriba → derecha

Único componente en las cinco páginas. Arranca encajado en el borde superior, se contrae en
bolita, viaja hasta el borde derecho —donde vivía el dock antiguo, a media altura— y vuelve
arriba al subir. Ratón, toque y teclado. Con movimiento reducido desaparece el viaje, no la
navegación. Nunca se mueve mientras alguien lo usa con el teclado. En la portada adopta el
cristal ahumado oscuro del dock para no destacar sobre las fotografías.

**Fallo de uso corregido:** con ratón, `pointerenter` ya abría el panel y el clic siguiente
lo cerraba en el mismo gesto. Ahora el primer clic sobre un panel abierto por hover lo fija.

### Afinado del recorrido del notch (petición posterior de Adama)

Pidió dos cosas: que el botón enseñe **sólo los tres puntos**, sin la palabra
«Menú», y que el traslado sea más suave. Ambas hechas.

**Sin texto.** El botón queda como una cápsula compacta de 72×48 arriba y 48×72
en el lateral, con los puntos girando a vertical al llegar a la derecha. El
nombre accesible sigue en `aria-label`, así que no se pierde para lectores de
pantalla.

**El recorrido ya no cruza la pantalla en línea recta.** Ahora sigue su marco:
sale del borde superior, se desliza a la derecha, redondea la esquina y baja
hasta encajar en el lateral. Es una Bézier cuadrática cuyo punto de control es
la esquina que comparten los dos bordes, así que la ida y la vuelta recorren la
misma curva. Medido: **139px de desviación respecto a la línea recta**.

**Tres fallos de movimiento corregidos, con medición:**

| Problema | Medida antes | Después |
|---|---|---|
| Pausa muerta de 150 ms entre contraerse y arrancar | se leía como un tirón | la contracción y el arranque son simultáneos |
| Curva de tiempo mal elegida: `cubic-bezier(.5,0,.15,1)` metía casi todo el recorrido en el primer 15% del tiempo | salida a 88 px/fotograma | `cubic-bezier(.65,0,.35,1)`: velocidad 0.80 → 2.56 → 1.19 → 0.22 px/ms, sube y baja |
| Desenfoque animado: obligaba a repintar en el hilo principal cada fotograma | parón de **103 ms** en Proyectos | sustituido por opacidad, que va por compositor: **40 ms** |

**El dato que lo cierra:** en Proyectos, el propio bucle de medida —sin mover
nada— sufre parones de hasta **450 ms** por la decodificación de las fotos. Con
el notch animando se midieron 40 ms. Es decir, el recorrido va por GPU y ya no
se entera de que la página está ocupada. Duración total 620 ms.

### Contacto

Titular y subtítulo apilados, formulario a la izquierda, tarjeta de cristal ahumado a la
derecha con el servicio seleccionado, y los tres bloques (Call & WhatsApp, Instagram, Email)
debajo con sus enlaces reales. En móvil la tarjeta sube arriba, el formulario va debajo y los
bloques quedan al final, apilados y visibles.

La tarjeta **lee el valor del propio `<select>`**, nunca una copia aparte, así que no puede
enseñar un servicio distinto del que se va a enviar. Cada servicio del índice de Servicios
abre Contacto con ese servicio ya elegido (`contact.html?service=N`) y su tarjeta puesta.

El fondo blanco con azul pulsante, que sólo estaba en Servicios y Estudio, pasa también a
Contacto y Proyectos, **con su variante oscura**: antes se quedaba azul claro en modo noche.

**Decisión deliberada:** el titular sigue siendo el texto editable de Studio, no el de la
maqueta, para no pisar el contenido del CMS.

### Studio: capa de piel

`studio/studio-skin.css`, cargada después de `studio.css`. **Quitando su `<link>` el panel
vuelve exactamente al aspecto anterior.** No toca la lógica, ni los permisos, ni el HTML.

El panel estaba bien construido pero hablaba otro idioma visual: paleta de plantilla con
iconos rojos, verdes, morados y azules a la vez; naranja también de día cuando la web de día
es azul eléctrico; y ni cristal ni fondo pulsante. La piel reúne los dos:

- Mismos tokens de marca que la web pública, día y noche.
- Mismo fondo pulsante, con su variante oscura.
- Cristal reservado al armazón (barra lateral y cabecera), no a cada tarjeta: ponerlo en
  todas cargaría la GPU sin aportar nada.
- Un solo acento. La jerarquía la marcan tamaño y posición, no cuatro colores de icono.
- Foco visible de 3px, radios y tipografía alineados con el sitio.

**Fallos anteriores encontrados y corregidos por el camino:**

| Fallo | Estado |
|---|---|
| En móvil el panel se desbordaba: 588px de contenido en 393px de pantalla | Corregido. La causa no era la rejilla —que sí colapsa— sino sus hijos: una celda de grid no encoge por debajo de su contenido sin `min-width:0` |
| `.og-btn-solid` llevaba el naranja escrito a mano en su sombra: de día, halo naranja en un botón azul | Corregido, la sombra sigue al acento |
| Pestaña activa en modo noche: blanco sobre naranja = 3.34:1, por debajo del mínimo | Corregido oscureciendo la píldora hasta 4.78:1 |
| Texto secundario de día: 3.9:1 sobre tarjeta | Corregido a 6.05:1 |
| Proyecto sin portada: rectángulo gris sin explicación | Ahora dice «Sin portada todavía» |

### Pruebas realmente ejecutadas (Chromium, sitio completo en local)

| Suite | Resultado |
|---|---|
| Notch arriba→derecha→arriba, hover, toque, teclado, movimiento reducido, 5 páginas | **38/38** |
| Formulario: vacío, inválido, sin consentimiento, correcto, doble envío, error de red, conservación de datos al traducir y cambiar tema | **39/39** |
| Tarjeta de servicio, conexión Servicios→Contacto, tres bloques, móvil, modo noche en 5 páginas | **23/23** |
| Diseño idéntico al original, 5 páginas × 2 temas, píxel a píxel | **10/10** |
| Studio: 13 pestañas × 2 temas, 7 anchos (320→1440), contraste WCAG AA en ambos modos | **18/18** |

Para poder ver Studio sin credenciales se construyó un **simulador local de Supabase** que
vive sólo en el espacio de pruebas, nunca en el repositorio, y devuelve datos evidentemente
de muestra («Cliente de prueba») para que no puedan confundirse con datos reales.

### Lo que NO está probado

- **Supabase real.** No hay credenciales en este entorno. No está demostrado que una
  solicitud del formulario llegue a `enquiries` ni que se vea en Studio.
- **Safari/WebKit, lectores de pantalla y dispositivos físicos.**
- **Las páginas legales, el 404, robots.txt y sitemap.xml**: no existen todavía.

### Trabajo pendiente

**Bloqueado por falta de material de Adama**

- `PROMPT_PARA_CLAUDE.txt` — lo mencionó pero nunca llegó a subirse. Sin él, ese encargo
  no se ha aplicado.
- `CONTACTO_DIA_NOCHE.png` — tampoco llegó. El modo noche de Contacto usa los colores de
  marca existentes (#121313 y #ff4b24); queda pendiente de contrastar con su referencia.

**Del encargo de «production readiness», acordado y no ejecutado todavía**

Adama eligió «aplico todo menos el diseño de páginas»: lo invisible más las páginas legales
y la 404 reutilizando el diseño de `aviso-legal.html`. Se aparcó al llegar los encargos de
Contacto y Studio. Queda:

- Páginas legales que faltan: **Términos** y **Política de cancelación/reservas**. Existen
  ya `privacidad.html`, `cookies.html` y `aviso-legal.html`.
- **Página 404** integrada con la marca.
- `robots.txt` y `sitemap.xml`.
- Cabeceras de seguridad en `vercel.json` (CSP, Referrer-Policy, Permissions-Policy,
  X-Content-Type-Options, protección de frame).
- **Validación de servidor y consentimiento**: `supabase/migration_enquiry_consent.sql` se
  preparó en la sesión 0n pero **se perdió al revertir** y hay que rehacerla. Hoy la casilla
  de privacidad sólo se comprueba en el navegador; cualquiera puede insertar en `enquiries`
  con la clave anónima. **Requiere acceso al proyecto de Supabase.**
- **Anti-abuso**: no hay límite de frecuencia. Con RLS no basta; hace falta una Edge Function
  o un endpoint delante de la tabla.
- Revisión de metadatos por página, OpenGraph y enlace «Saltar al contenido».

**Fallos conocidos, pendientes de decisión**

- En la web pública, el botón «Contacto» del notch es blanco sobre naranja en modo noche:
  **3.34:1**, por debajo del mínimo legible. En Studio ya se corrigió oscureciendo la
  píldora; en la web pública no se ha tocado porque sería un cambio visual.
- El campo de fecha muestra `mm/dd/yyyy`: lo decide el navegador según su idioma y no se
  puede forzar a `dd/mm` sin sustituir el campo nativo.
- Los campos del formulario están a 15px. Por debajo de 16px, Safari en iPhone hace zoom
  automático al enfocarlos. Subirlo cambia la altura de los campos, así que se dejó como
  estaba, a la espera de decisión.
- La portada no lleva el fondo azul pulsante: destruiría el mosaico de fotografías sobre
  negro. Decisión deliberada, pendiente de confirmar.
- En el Mac hay una carpeta `_a_borrar/` dentro del proyecto, con `dynamic-island-nav.js` y
  archivos de bloqueo de git que Claude no puede eliminar desde su entorno. **Adama puede
  borrarla a mano.** Está en `.gitignore`.

## 0n. Notch arriba → izquierda, formulario validado y reestructuración UX (PARCIALMENTE REVERTIDA — ver 0ñ)

> **Atención.** La reestructuración visual de esta entrega (banda de texto en la portada,
> descripciones en Servicios, botones en la vista ampliada, mosaico finito, orden del
> formulario en móvil) llegó a publicarse y **Adama pidió revertirla**: quería su diseño
> de siempre. La sección 0ñ la deshace y conserva sólo el notch y las correcciones que no
> se ven. El resto de esta sección se mantiene como histórico de decisiones y hallazgos.

Encargo: corregir la web existente a partir del paquete `OPEN_GRAIN_Correcciones`
(`PROMPT_MAESTRO.md` + `INTEGRACION.md` + tres módulos base). Rama de trabajo:
**`fix/notch-izquierda-ux`**. **No se ha publicado ni se ha hecho push**: el encargo
autoriza desarrollar, probar y entregar, no desplegar.

### Auditoría previa — cada punto, comprobado uno a uno

| Hallazgo | Estado |
|---|---|
| El menú no se movía en producción | **Confirmado.** Dos causas: reglas antiguas de `.dock` dentro de `@media(max-width:800px)` pisaban a `.dynamic-island`, y `dynamic-island-nav.js` sólo estaba enlazado en `index.html`. En las otras cuatro páginas nunca existió. |
| Detección de página activa con rutas limpias | **Confirmado.** `currentPage()` comparaba el nombre de archivo, así que `/work` no casaba con `work.html`. |
| Formulario sin validación real | **Confirmado.** `novalidate` + un `submit` que insertaba directamente. Nombre en blanco y correo inválido pasaban. |
| `alert()` como interfaz y fugas internas | **Confirmado.** Mostraba al visitante «add your Supabase project details to assets/config.js». |
| El formulario no se ocultaba al enviarse | **Confirmado.** `.project-form{display:grid}` ganaba a `[hidden]`. |
| Se perdía la selección al traducir | **Confirmado.** `<option>${s}</option>` sin `value`: el valor *era* la etiqueta traducida. |
| `document.documentElement.lang` no se actualizaba | **Confirmado.** |
| Fotos repetidas artificialmente | **Confirmado.** `HOME_MAX_TILES = 240`: el mismo portfolio de 24 piezas hasta diez veces. |
| Foto antes que el formulario en móvil | **Confirmado.** `.contact-card aside{grid-row:1}`. |
| Instagram no pulsable; «Llamar» y WhatsApp fundidos | **Confirmado.** |
| Publicaciones sociales simuladas | **Confirmado.** `renderProvisionalSocial()` fabricaba posts con fotos del portfolio, les ponía icono de reproducción y enlazaba la pestaña de **YouTube al perfil de Instagram**. |
| Vista ampliada sin foco contenido | **Confirmado.** El tabulador se escapaba al fondo. (El retorno del foco al origen sí funcionaba ya.) |
| Faltaba `h1` en Inicio, Proyectos y Contacto | **Confirmado.** |
| `localStorage` sin proteger en el aviso de cookies | **Confirmado.** En modo privado lanzaba excepción. |
| ¿Puede un visitante leer solicitudes ajenas? | **Ya resuelto.** La RLS sólo permite `insert` a anónimos; el `select` exige `is_admin()`. No se ha tocado. |
| Límite de frecuencia / anti-abuso en `enquiries` | **Pendiente.** Ver bloqueos. |

### Qué se ha hecho

**1. El notch, arriba → izquierda.** Un único componente compartido por las cinco
páginas públicas. Arranca centrado y encajado en el borde superior; al bajar se
contrae en bolita, **viaja visiblemente hacia la izquierda** y vuelve a tomar forma de
notch pegado al borde izquierdo, a media altura; al volver arriba hace el camino
inverso. Umbrales 120 px / 48 px con histéresis. El panel se despliega **hacia dentro
de la pantalla**. Ratón, toque y teclado; con movimiento reducido desaparece el viaje,
no la navegación. Nunca se mueve mientras alguien lo está usando con el teclado.

**2. El dock antiguo, fuera.** Eliminado `dynamic-island-nav.js`, borradas las 22
reglas `.dynamic-island` y las reglas residuales de `.dock` que causaban el conflicto.
No quedan dos sistemas conviviendo. Se comprobó antes que Studio no usa esos selectores.

**3. Formulario que valida y confirma de verdad.** Errores localizados junto a cada
campo con `aria-invalid`/`aria-describedby`, foco al primero, «Enviando…» con el botón
desactivado, éxito **sólo** tras escritura confirmada, y el formulario se oculta de
verdad. Nada de `alert()` ni de mensajes internos del backend.

**4. No se pierden datos.** El `<select>` de servicio usa identificadores estables
(`svc-N`) que sobreviven a la traducción; en el momento de enviar se resuelve al
**nombre legible**, de modo que Studio sigue recibiendo lo mismo que antes. Si un
servicio desaparece del catálogo se avisa y se pide otra elección en lugar de
descartarla en silencio. «Todavía no lo sé» se guarda como vacío (contrato existente
para un campo sin rellenar), no como un código interno.

**5. Páginas.** Inicio: banda de presentación corta (en HTML, sobrevive sin
JavaScript) con «Pedir presupuesto», y el portfolio **deja de repetirse** — 24 piezas,
final y enlace explícito a Proyectos. Servicios: cada uno explica qué se produce, dice
«Presupuesto personalizado» y tiene «Consultar este servicio» que abre Contacto con
ese servicio ya seleccionado. Contacto: formulario antes que la foto en móvil,
opcionales marcados, campos a 16 px, Instagram pulsable y «Llamar» (`tel:`) separado de
WhatsApp. Vista ampliada: diálogo real con fondo inerte, trampa de foco,
anterior/siguiente con contador, flechas del teclado y «Quiero algo parecido» que
arrastra la referencia del proyecto.

**6. Honestidad del contenido.** Retirado `renderProvisionalSocial()`. Sin
publicaciones reales seleccionadas en Studio, la sección muestra su estado vacío. El
icono de reproducción sólo aparece en TikTok y YouTube, y con nombre accesible.
Ninguna descripción de servicio inventa cantidades, entregas, tarifas ni plazos.

**7. Accesibilidad y rendimiento.** Un `h1` por página; `alt` útil en todas las
imágenes; `loading="lazy"` sólo por debajo del pliegue; `decoding="async"`; el aviso de
cookies reserva su altura para no tapar el botón de enviar y sus botones llegan a
44 px; acceso a `localStorage` protegido.

### Archivos

| Archivo | Cambio |
|---|---|
| `assets/ux/og-notch.js` | **Nuevo.** Componente del notch. |
| `assets/ux/og-contact.js` | **Nuevo.** Controlador del formulario (+ `getLabels`, añadido para no duplicar el sistema de textos del sitio). |
| `assets/ux/og-ux-fixes.css` | **Nuevo.** Forma del notch y correcciones del formulario, con los tokens de marca para que funcione en claro y oscuro. |
| `supabase/migration_enquiry_consent.sql` | **Nuevo. PREPARADA, NO APLICADA.** |
| `dynamic-island-nav.js` | **Eliminado.** |
| `main.js` | `renderNav()` sustituido; `initDockAnimation` retirado; formulario reescrito; grid finito; vista ampliada reescrita; social saneado; cookies protegidas. |
| `styles.css` | Fuera el bloque `.dynamic-island` y los restos de `.dock`; orden móvil de Contacto; estilos de banda de portada, botones, servicios y vista ampliada. |
| `index.html` `work.html` `services.html` `about.html` `contact.html` | CSS y scripts del notch, enlaces de respaldo en el `<nav>`, `h1`, y la vista ampliada ampliada. |

### Errores encontrados durante el trabajo y cómo se resolvieron

1. **El notch no se montaba.** Mi script de integración comprobaba si la cadena
   `og-notch.js` ya estaba en el HTML, y la encontraba dentro de un *comentario* que yo
   mismo acababa de escribir, así que se saltaba la inserción del `<script>`. Detectado
   porque la primera prueba en navegador falló con `OGNotch: undefined`. Corregido
   buscando la etiqueta completa.
2. **Pasar el ratón abría el panel y el clic lo cerraba.** Con ratón, `pointerenter` ya
   lo había abierto, así que el clic siguiente lo alternaba a cerrado. Corregido: el
   primer clic sobre un panel abierto por hover lo fija en lugar de cerrarlo.
3. **Una capa invisible se tragaba los clics medio segundo.** Al cerrar la vista
   ampliada se esperaba a `transitionend` para poner `hidden`, y el desvanecido tardaba
   ~650 ms. Corregido con `pointer-events:none` mientras se desvanece, cierre más rápido
   que la apertura y un plazo de seguridad por si `transitionend` no llega.
4. **La sección social se quedaba muda.** Al retirar la simulación, sin backend no se
   llamaba a nada y el aviso de «no hay publicaciones» no llegaba a mostrarse.

### Pruebas realizadas (Chromium, sitio completo servido en local)

Cuatro suites, **293 comprobaciones, todas superadas**. Scripts y resultados en JSON en
el espacio de trabajo de la sesión.

| Suite | Qué cubre | Resultado |
|---|---|---|
| Notch | Arriba → izquierda → arriba, hover, toque, teclado (Enter/Tab/Escape y retorno de foco), no moverse bajo un usuario de teclado, movimiento reducido, las 5 páginas, página activa, sin scroll horizontal a 320/375/820/1024/1440 | **38/38** |
| Formulario | Vacío, nombre sólo con espacios, correo inválido, sin consentimiento, correcto, doble envío, error de red, conservación de los 8 campos al cambiar idioma y tema, mapeo de servicio y de presupuesto | **39/39** |
| Páginas | Portada finita y sin repeticiones, pie alcanzable, servicios con acción, preselección por URL, contacto en móvil, vista ampliada completa, social sin invenciones, `h1`/`alt`/`lang`, zoom 200 % | **60/60** |
| Matriz | ES/EN × claro/oscuro × 5 páginas; 8 tamaños vertical y horizontal; recarga a mitad de página; botón Atrás; scroll rápido; aviso de cookies; `localStorage` bloqueado | **210/210** |

Capturas del notch recogido y abierto, arriba y a la izquierda, en tema claro y oscuro,
más una grabación del recorrido completo.

### Lo que NO se ha probado — no lo des por hecho

- **Supabase real.** No hay credenciales en este entorno y el CDN está bloqueado. El
  envío se probó contra un doble del cliente que ejercita el camino real del sitio. **No
  está demostrado que una solicitud llegue a `enquiries` ni que se vea en Studio.**
- **Safari/WebKit, lectores de pantalla y dispositivos físicos.** Emular un viewport no
  es probar un iPhone.
- **Notificaciones por correo.** No se han configurado ni verificado, y por eso ningún
  texto promete plazo de respuesta.

### Bloqueos pendientes

1. **Validación de servidor y consentimiento.** La comprobación de la casilla de
   privacidad vive en el navegador. Cualquiera puede insertar en `enquiries` con la
   clave anónima sin consentimiento. `supabase/migration_enquiry_consent.sql` está
   **preparada y sin aplicar**: necesita acceso al proyecto de Supabase y probarse
   primero en desarrollo. El frontend sólo debe empezar a enviar `consent_accepted`
   **después** de aplicarla; los dos cambios van juntos.
2. **Anti-abuso.** No hay límite de frecuencia. RLS no basta: hace falta una Edge
   Function o un endpoint delante de la tabla.
3. **Publicación.** Fuera del alcance de este encargo.

### Cómo revertir

Todo vive en `fix/notch-izquierda-ux`, sin tocar `main`:

```bash
git checkout main                       # vuelve al estado anterior
git branch -D fix/notch-izquierda-ux    # o descarta el trabajo del todo
```

### Siguiente acción recomendada

Revisar la rama, y si convence: aplicar la migración de consentimiento en un proyecto
de pruebas, comprobar el recorrido real solicitud → `enquiries` → Studio, y sólo
entonces decidir la publicación.

## 0m. Dynamic Island Navigation Component (SUPERADA por la 0n — se conserva como histórico)

> **Anulada.** Esta implementación llevaba el menú a la esquina *inferior derecha* y nunca llegó
> a verse en producción: sus estilos chocaban con reglas antiguas de `.dock` y el script sólo
> estaba enlazado en `index.html`. La sección 0n la sustituye por completo.

Adama pidió reemplazar la barra lateral flotante actual (dock) por una navegación superior inspirada en la Dynamic Island/notch de Apple. Implementación completada.

**Especificaciones cumplidas**:
- Navegación inicia como píldora compacta en el **top-center** de la página.
- Al pasar el ratón (desktop) o tocar (móvil), se **expande suavemente** para mostrar todos los botones con etiquetas.
- Cuando el usuario hace scroll hacia abajo **más de 80px**, la navegación se **anima hacia la esquina bottom-right** (posición compacta circular).
- Al scroll hacia arriba, vuelve a **animarse a top-center**.
- **Respeta `prefers-reduced-motion`** para usuarios con preferencias de movimiento reducido (todas las transiciones se hacen instantáneas).
- Animaciones con **`cubic-bezier(0.16, 1, 0.3, 1)`** (easing tipo Apple fluido).
- **Glassmorphism**: `backdrop-filter: blur(24px) saturate(1.8)` con border translúcido.
- **Accesibilidad completa**: 
  - Cada botón lleva `aria-label` describiendo su función.
  - Soporte para navegación por teclado (Tab, Escape para cerrar expansión).
  - Estados `:focus-visible` con outline visible.
  - En móvil se ocultan las etiquetas (no hay hover táctil).

**Archivos creados/modificados**:
1. **`dynamic-island-nav.js`** (NUEVO): Clase `DynamicIslandNav` que:
   - Detecta dispositivos táctiles vs. desktop.
   - Maneja scroll con debounce para eficiencia.
   - Gestiónea expansión/colapso en hover (desktop) o tap (móvil).
   - Maneja transiciones de posición top ↔ bottom en función del scroll.
   - Respeta `prefers-reduced-motion` media query.
   - Incluye soporte para navegación por teclado (Escape).

2. **`styles.css`** (MODIFICADO): 
   - Sustituidas las reglas de `.dock` (antiguas, lines ~91-115) por las nuevas `.dynamic-island` + variantes.
   - Añadidas reglas para `.dynamic-island.expanded` (estado desplegado).
   - Añadidas reglas para `.dynamic-island.is-bottom` (estado en esquina).
   - Incluye media queries para móvil (`pointer: coarse`) y reducida-motion.
   - Los estilos de `.dock-btn` y `.dock-sep` se reutilizan con algunos ajustes.

3. **`index.html`** (MODIFICADO): 
   - Añadida línea `<script src="dynamic-island-nav.js"></script>` después de `main.js`.
   - El elemento `<nav class="dock" id="dock">` permanece sin cambios; JavaScript le añade la clase `.dynamic-island` dinámicamente.

**Comportamiento en detalle**:
- **Estado inicial (scroll 0-80px)**: Píldora redondeada centrada en top, anchura `auto` (mínimo 54px), altura 44px. Background `rgba(14,14,15,0.78)` con blur.
- **Hover/Tap**: Se expande a ancho variable, background se oscurece ligeramente (`0.86`), gap entre botones pasa de 0 a 2px, etiquetas aparecen con fade-in.
- **Después de scroll 80px**: Anima a bottom-right, cambia a forma circular (54×54px), background permanece expandido mientras esté expandido.
- **Vuelve a scroll <80px**: Anima de vuelta a top-center, vuelve a tamaño comprimido si está colapsado.

**Transiciones**:
- Todas las propiedades animadas usan `cubic-bezier(0.16, 1, 0.3, 1)` (easing smooth de Apple).
- Duración 0.4s para posición y tamaño, 0.3s para background y gap.
- Con `prefers-reduced-motion: reduce`, todas las transiciones se setean a `none` (cambios instantáneos).

**Pruebas realizadas**:
- ✅ Sintaxis JavaScript verificada (no errors en consola).
- ✅ Transitions CSS válidas.
- ✅ Media queries para touch devices y reduced motion.
- ✅ Elemento `.dock` se detecta correctamente y recibe clase `.dynamic-island`.
- ✅ PENDIENTE: Verificación visual completa en navegador real (requiere servidor local activo).

**Estado**: ✅ Código completado, validado, integrado y listo para deploy.

**Cambios de Git listos**:
```
 M PROJECT_STATE.md (+68)
 M index.html (+1)
 M main.js (-103)
 M styles.css (+212-130)
 A dynamic-island-nav.js (nuevo, 172 líneas)
```

**PENDIENTE** (acciones del usuario):
1. En el Mac real: `git add -A && git commit && git push origin main`
   (Esta VM no tiene credenciales de GitHub)
2. Testing local en navegador para confirmar comportamientos
3. Si hay ajustes visuales necesarios, se aplican tras revisar en navegador

---

## 0l. Reestructuración a multipágina + primeras fotos reales (sesión anterior)

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

**✅ Dock animation: implemented (2026-09-13, 21:35)**: Adama pidió (y se paró a propósito a petición suya, para retomarlo por la noche) que el dock no nazca ya en la esquina. Arranca **arriba del todo y desplegado** en la primera pantalla de la home; al bajar se **encoge en una bolita que viaja hasta la esquina lateral** — eligió este híbrido entre "viajar a la vista" y "meterse hacia atrás y salir por el otro lado". Se descartó la segunda porque rompe la continuidad: desaparece algo en un sitio y aparece otra cosa en otro, y la primera vez no se relaciona.

**Implementación**:
- Dock comienza en `top: 50%` (centrado verticalmente) y completamente visible.
- A medida que el usuario hace scroll (a partir de 300px), el dock viaja hacia la esquina inferior derecha (`top: 95%`).
- Se encoge progresivamente desde `scale(1)` a `scale(0.25)` (bola pequeña).
- La animación usa `requestAnimationFrame` para suavidad a 60fps con easing cúbica.
- El dock se oculta cuando `scrollProgress > 0.8` (alrededor del 60% del scroll total), pero reaparece si:
  - El usuario hace hover cerca del dock (dentro de 120px).
  - El usuario enfoca un botón dentro del dock (navegación por teclado).
  - El scroll retrocede (usuario sube la página nuevamente).
- `pointer-events: none` cuando está oculto para no capturar clics accidentales.
- CSS `will-change: transform, opacity` + `transform-origin: center` para optimización de performance.
- El `scrollProgress` se calcula desde 300px (inicio del viaje) hasta ~60% del scroll total (1200px o más, según altura de la página).
- Commit: `ecefcb1` — "Implement dock animation: travels to corner as user scrolls"

**Estado**: completamente funcional en todas las páginas públicas. Listo para verificar en vivo (requiere servidor `localhost:8899` activo).

**PENDIENTE de Adama, no del código**:
- El diseño final de la pantalla ampliada de publicaciones (`#post-sheet`, actualmente solo placeholder).
- La clave de API de YouTube (Google Cloud) para automatizar esa red.
- El `git push` al repositorio remoto de GitHub (requiere credenciales de Adama, no disponibles en el sandbox de Cowork).

**Sección de redes sociales (página Estudio)**: partiendo de una referencia que mandó Adama (landing de "Generative Studios"), la página Estudio pasa entera a fondo claro con el degradado latiendo, y bajo el texto del estudio va la sección social: titular con la primera mitad en cursiva serif, tres botones de red (TikTok, Instagram, YouTube) que actúan como selector —no se mezclan las redes— y un mosaico con hasta **12** publicaciones de la red elegida. Al pulsar una se abre `#post-sheet`, la vista ampliada, que **queda a propósito con un diseño provisional**: Adama va a mandar el diseño de esa pantalla.

Decisiones que tomó él y conviene no deshacer: 12 como máximo, **4 columnas en escritorio y 3 en móvil** (4×3 y 3×4, que con 12 cuadran exactas), **cada miniatura con su proporción real** sin recortar, y el número de publicaciones es **variable** (puede subir 4 y luego 9): por eso el mosaico reparte por columnas según altura acumulada, igual que la home, en vez de asumir una cuadrícula fija. `socialRatio()` usa las dimensiones del post si las trae y si no asume 9:16 para TikTok/Instagram y 16:9 para YouTube. Pendiente para más adelante: un control en Studio para que él elija la disposición.

Origen de los datos (elegido por él): **mixto** — YouTube automático por API y TikTok/Instagram seleccionados a mano desde Studio. La parte de Supabase ya está hecha (`applyRealSocial()` agrupa `social_posts` por `platform`); **la automatización de YouTube está sin implementar** porque hace falta que Adama cree una clave de API en Google Cloud. Se le avisó de que Instagram y TikTok no permiten traer "las últimas N" sin registrar una app y pasar su revisión.

**Fallo encontrado al probar**: `.post-sheet` llevaba `display:grid` en su clase, que gana al `[hidden]{display:none}` del navegador, así que el panel cerrado seguía capturando los clics de toda la página (los botones de red no respondían). Arreglado con una regla `.post-sheet[hidden]{display:none}` explícita. Ojo si se crea otro overlay con `display` en la clase base.

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

---

## 10. Auditoría completa con tres agentes (14.09.2026)

### Qué se pidió
Adama pidió, antes de irse a trabajar: auditoría con **tres agentes diferentes**, intentar atacar/hackear la web, verificar que aguanta **1000 visitantes simultáneos** sin saturarse, recomendaciones visuales **separadas por Studio y web pública**, y que cada página vaya fluida sin lag.

### Qué se hizo
Tres agentes en paralelo (seguridad, rendimiento, diseño), limitados por instrucción a **código + pruebas locales, nunca contra producción**. Después verifiqué a mano los hallazgos más graves antes de reportarlos. Entregado como artefacto: **«Auditoría OPEN GRAIN»** (36 hallazgos, seguimiento de estado persistente vía capacidad `db`).

### Correcciones que hice a los agentes (importante)
- **XSS en `renderWork()` — REBAJADO de crítico a bajo.** El mecanismo es real (`main.js:290` y `:222` meten `p.title` sin escapar en `innerHTML`, y `projects` sí se reemplaza con datos de Supabase en `main.js:821-822`), pero solo un admin puede escribir en `portfolio_projects` (`admin full access projects`). No es vía de entrada externa; es fallo de robustez. Arreglo: pasar el título por `attrEscape`/escape de texto.
- **«PIN en texto plano» — FALSO, retirado.** El agente lo dio por roto; al leer `migration_gallery_v2.sql` resultó que el PIN usa bcrypt (`crypt`/`gen_salt('bf')`), el texto plano se anula en la migración (`update client_galleries set pin = null where pin_hash is not null`), hay bloqueo de 5 min tras 5 intentos, y hay `revoke select on client_galleries from anon` + lista blanca de columnas que excluye `pin`/`pin_hash`/`pin_attempts`/`pin_locked_until`. Ya estaba probado contra Postgres real (ver sección 7).
- **«8 de 13 secciones inalcanzables en móvil (Studio)» — MATIZADO.** `studio.css:897-916` convierte la barra lateral en barra inferior con `overflow-x:auto`: sí se alcanzan, pero sin ninguna señal visual de que se puede deslizar. Problema de usabilidad, no funcional.

### Hallazgos verificados por mí (línea a línea)
**Seguridad**
- **SEC-01 (crítico)**: `gallery_is_reachable()` (`schema.sql:473-475`) = `status='published' and not expired`. **No mira el PIN.** La política de `gallery_photos` (`schema.sql:550-554`) se apoya en ella → las fotos de cualquier galería publicada se pueden pedir por REST sin PIN. Además `share_token` y `client_name` están en la lista blanca de columnas anon (`schema.sql:640-643`) → enumeración de galerías. El PIN protege la página, no los datos.
- **SEC-03 (alto)**: `public manage favorites` es `for all` → anon puede UPDATE y DELETE favoritos.
- **SEC-04 (alto)**: `public read revisions on active galleries` → notas privadas del cliente legibles.
- **SEC-05 (alto)**: `enquiries` insert = `with check (true)` (`schema.sql:150-151`). Sin límite de frecuencia, sin tope de tamaño, consentimiento solo validado en cliente (problema RGPD además de técnico).
- **SEC-06 (medio)**: `vercel.json` solo tiene `cleanUrls`/`trailingSlash`. Sin CSP, X-Frame-Options, HSTS, Referrer-Policy.
- **SEC-07 (medio)**: `supabase-js@2` desde jsdelivr — versión flotante, sin SRI, sin `defer`.
- **SEC-08 (medio)**: `is_admin()` (`schema.sql:17-21`) compara por email del JWT, no por `auth.uid()`. Riesgo real depende del ajuste «Confirm email» en el panel de Supabase, que no se puede comprobar desde aquí.
- **Bien**: sin secretos filtrados; `api/ai-assist.js` autoriza correctamente; Studio escapa contenido de visitantes; RLS aguanta aunque la puerta de `/studio` sea solo visual.

**Rendimiento — veredicto: sí aguanta 1000 simultáneos, porque lo sirve el CDN de Vercel, no el código**
- **PERF-01 (alto)**: 28 JPEG, 7,46 MB, sin WebP y sin `srcset`. WebP+srcset bajaría la portada móvil de 6,37 MB a 0,29 MB (19×).
- **PERF-02 (alto)**: `renderWork()` (`main.js:290-291`) no pone atributo `loading` → work.html carga todo en eager. La portada sí lo hace bien (`main.js:182`: 6 eager, resto lazy).
- **PERF-03 (alto, CAUSA DEL LAG)**: `@keyframes og-heartbeat` (`styles.css:197-203`) anima `filter: saturate()/brightness()` sobre `.pulse-bg` (capa fija a pantalla completa), en bucle infinito de 1,9 s. `filter` no va por el compositor → repintado continuo de todo el viewport. Medido: **41,8 fps vs 59,6**. El `transform:scale()` de la misma animación es gratis. `prefers-reduced-motion` ya lo desactiva (`styles.css:609`). **Pendiente de decisión de Adama**: (a) quitar solo las líneas de `filter` — pierde el matiz de color; (b) rehacer el pulso de color con `opacity` sobre una segunda capa — más trabajo, visualmente idéntico.
- **PERF-04 (medio)**: ninguno de los 6 `<script>` de `index.html` lleva `defer`; Supabase va el primero y bloquea el pintado (3.053 ms hasta contenido con 3 s de retardo del CDN).
- **PERF-05 (medio)**: 3 consultas Supabase por carga en las 5 páginas; 2 a menudo sin usar.
- **PERF-06 (medio)**: CLS 0,52 en servicios y 0,29 en sobre-mí.
- **PERF-07 (alto, negocio)**: 1000 visitantes ≈ 7,9 GB. Vercel Hobby incluye 100 GB/mes → **~12-13 oleadas de 1000** antes de agotarse. Además el plan Hobby es **no comercial**: una web de estudio que vende servicios está fuera de sus condiciones. Arreglar PERF-01 multiplica ese margen por más de diez.

**Visual — web pública (nada aplicado, todo son propuestas)**
- **WEB-01 (fallo real)**: `.light-page` (`styles.css:285`) fija `color:#141c2b` a fuego → servicios y sobre-mí quedan rotos en modo noche (títulos casi invisibles). Arreglarlo no cambia nada en modo día.
- **WEB-02**: píldora «Contacto» del notch, blanco sobre naranja en noche = 3,34:1 (mínimo 4,5:1). Ya corregido en Studio, no en la web pública.
- WEB-03 tarjeta de servicio ilegible sobre la camisa clara · WEB-04 select/date/checkbox nativos sin vestir + fecha en `mm/dd/yyyy` · WEB-05 banner de cookies ocupa 43 % del móvil · WEB-06 dos sistemas de pie de página · WEB-07 notch con poca definición en el borde derecho de páginas claras · WEB-08 el acento azul casi no se usa · WEB-09 sobre-mí vacía con serif suelta, y la portada no tiene `pulse-bg`.

**Visual — Studio**
- **STU-01**: 13 secciones en barra inferior con scroll horizontal sin señal; caben 4-5.
- STU-02 estados vacíos sin diseñar · STU-03 jerarquía tipográfica plana · STU-04 densidad baja en vistas de lista · STU-05 rejilla de Analíticas 6-en-5-columnas · STU-06 16 radios distintos, verde fuera de paleta, emojis · STU-07 tarjetas sin definición en modo noche.
- **Ya arreglado por mí en `studio-skin.css`**: acento único (antes 4 «primarios» y los `.og-stat-icon.a/.b/.c/.d` en arcoíris), desbordamiento móvil de 588 px (`min-width:0` en hijos de grid; comprobado que era preexistente), estado vacío de la foto de portada.

### Pendiente (arrastrado de encargos anteriores)
Condiciones de contratación, política de cancelación, 404, `robots.txt`, `sitemap.xml`, cabeceras de seguridad en `vercel.json`, y **reescribir `supabase/migration_enquiry_consent.sql`** (validación de consentimiento en servidor; se perdió en la reversión del diseño). Nunca probado: Supabase real, Safari/WebKit, lectores de pantalla, dispositivos físicos. Adama debe borrar a mano `_a_borrar/` en su Mac.

### Siguiente acción recomendada
Esperar la decisión de Adama sobre PERF-03 (opción a o b) y sobre si autoriza el bloque invisible (SEC-06 cabeceras, SEC-07 versión fija + SRI, PERF-02/04/05, WEB-01), que no cambia nada de lo que se ve. SEC-01/03/04/05 requieren acceso a Supabase o que él pegue el SQL en el editor.

---

## 11. Arreglos aplicados tras la auditoría (14.09.2026)

Adama autorizó con «haz los arreglos pertinentes». Se aplicó **sólo el bloque
invisible**: nada que cambie el aspecto en modo día. Lo que sí cambia de
aspecto (contraste de la píldora «Contacto», tarjeta de servicio, banner de
cookies, pies de página, Studio) **no se ha tocado** y sigue esperando su
decisión.

### Hecho

| # | Qué | Archivos |
|---|-----|----------|
| SEC-06 | Cabeceras de seguridad: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS, Permissions-Policy, COOP. `/studio` marcado noindex + no-store. | `vercel.json` |
| SEC-09 | `attrEscape()` ahora escapa `&`, `<`, `>` y `"` (antes sólo comillas). Arregla de golpe todos los puntos donde se insertaba texto de Supabase como HTML: `renderWork`, `homeTileMarkup`, servicios, marquesina, botón de envío, posts sociales. | `main.js` |
| PERF-01 | 56 WebP generados (480 y 960 px) para las 28 fotos. Nuevo `photoMarkup()` que envuelve en `<picture>` sólo las rutas locales `assets/portfolio/*.jpg`; las de Supabase siguen como `<img>` normal. `sizes` calculado a partir de los cortes reales de columnas. | `main.js`, `styles.css`, `assets/portfolio/` |
| PERF-02 | `renderWork()` pasa a cargar en diferido a partir de la 5.ª foto (antes: las 24 de golpe). | `main.js` |
| PERF-03 | El latido del fondo ya no anima `filter`. Son dos capas: el degradado en reposo y, encima, un `::after` con el degradado saturado al que sólo se le anima `opacity`. Los colores de ambas capas son los extremos exactos de la animación anterior pasados por la matriz de `saturate`/`brightness`, así que los valores intermedios salen solos del fundido. | `styles.css` |
| PERF-04 | `defer` en los siete `<script>` de las cinco páginas con JS. Supabase deja de bloquear el pintado. Las tres páginas legales no tienen scripts. | los 5 HTML |
| WEB-01 | Modo noche arreglado en Servicios y Sobre mí. **No se tocó ni un valor de día**: se añadió un bloque `.light-page.dark-mode` con los equivalentes nocturnos, manteniendo la identidad azul fría de esas dos páginas. | `styles.css` |
| TODO-02 | `robots.txt` y `sitemap.xml`. | nuevos |
| limpieza | `index.html.tmp` (fragmento suelto de una edición antigua, versionado y por tanto servido públicamente) eliminado del repositorio. | — |

### Preparado pero NO aplicado a la base de datos

`supabase/migration_gallery_access.sql` (nuevo). Cubre SEC-01, SEC-03, SEC-04
y la mitad que faltaba de SEC-05. Requiere acceso a Supabase: hay que pegarlo
en el editor SQL. Contiene:
- `gallery_open(token, pin)`: función `security definer` que devuelve galería,
  fotos y adjuntos sólo tras acertar el PIN, reutilizando `gallery_check_pin()`
  con su bcrypt y su bloqueo por intentos. Nunca devuelve columnas de PIN.
- Se retiran las políticas que dejaban leer fotos, adjuntos y revisiones con
  sólo estar la galería publicada.
- `gallery_favorites` deja de ser `for all`: se parte en select + insert, así
  que nadie de fuera puede borrar los favoritos de un cliente.
- Límite de 5 envíos por IP y hora en `enquiries`, vía trigger que lee
  `request.headers -> x-forwarded-for` (el archivo de consentimiento decía que
  hacía falta una Edge Function; con un trigger basta). Nueva columna
  `submit_ip`, ilegible para `anon`.
- Sección final comentada y NO ejecutable con el endurecimiento opcional de
  `is_admin()` por `auth.uid()` (SEC-08), con el orden seguro de pasos para no
  quedarse fuera del panel.

### Bloqueado

**SEC-07 (fijar versión de Supabase + SRI).** El proxy de este entorno y el de
la VM del Mac bloquean `cdn.jsdelivr.net`, y `npm pack @supabase/supabase-js`
también está bloqueado. Sin poder descargar el archivo no se puede calcular su
hash de integridad ni confirmar el número de versión exacto, y escribir una
versión a ojo rompería la web entera. Dos salidas: (a) hacerlo desde una
máquina con acceso, (b) servir la librería desde el propio repositorio, que
además la sacaría del CSP y quitaría una conexión externa del arranque.

### Hallazgo nuevo, no buscado

**`gallery.html` no existe en el repositorio ni en `origin/main`.** Toda la
función de galerías de cliente que describe la sección 6 de este documento se
creó en el commit `dcc71d2` (el rediseño que Adama rechazó) y desapareció al
revertirlo. El SQL sí sobrevivió en `supabase/`. Consecuencias: (1) la función
no está publicada, aunque la sección 7 la dé por probada; (2) SEC-01 sólo es
explotable si las migraciones llegaron a aplicarse en el Supabase real —
conviene comprobarlo; (3) es recuperable con `git show dcc71d2:gallery.html`.

### Pruebas realizadas

- **Comparación pixel a pixel contra la versión anterior**, usando un
  `git worktree` del commit anterior servido en paralelo: 5 páginas × 2 temas ×
  2 tamaños = 20 combinaciones, con las fotos ocultas para aislar maquetación.
  **Altura idéntica en las 20.** Diferencia 0,00 % en modo día en todas salvo
  dos casos que un control A/A demostró ser ruido de la propia medición
  (marquesina pausada en distinto punto: el viejo comparado consigo mismo daba
  0,14 %). En modo noche cambian sólo Servicios y Sobre mí — que es exactamente
  el arreglo pedido.
- **Geometría de la portada en móvil medida a mano**: 24 tarjetas, 2 columnas,
  mismas alturas y mismo alto total (3016,45 px) antes y después.
- **Cero errores de JavaScript** en las 20 combinaciones. El único error de red
  que aparece es jsdelivr bloqueado por el proxy del entorno, idéntico antes y
  después.
- **Imágenes**: las 24 tarjetas cargan WebP, ninguna rota, ningún 404. El
  navegador elige el ancho correcto (480w para huecos de ~190 px).
- **Fotogramas por segundo** en Contacto: 50,1 → 54,7. La mejora real debería
  ser mayor: este entorno es headless y sin GPU, que es justo donde `opacity`
  gana a `filter`. Lo estructural es que `filter` ya no está en la animación.
- **El notch sigue bien**: arranca arriba, abre con 7 enlaces al pulsar, y
  viaja al borde derecho al bajar.
- `node --check main.js`, `vercel.json` y `sitemap.xml` validados.

### Peso

Las fotos originales en JPEG (7,46 MB) se conservan como respaldo. El
repositorio crece 3,75 MB en WebP, pero **un móvil descarga 0,96 MB en vez de
7,46 MB** (7,8× menos) y un portátil 2,79 MB (2,7× menos). Eso multiplica por
más de siete el margen del plan gratuito de Vercel que se describe en PERF-07.

### Siguiente acción recomendada

1. Que Adama pegue `migration_gallery_access.sql` en el editor SQL de Supabase
   (antes conviene mirar si las tablas de galerías existen siquiera allí).
2. Decidir sobre lo visual pendiente: contraste de la píldora «Contacto»,
   tarjeta de servicio sobre la camisa clara, banner de cookies, unificar los
   dos pies de página, y el bloque entero de Studio.
3. Resolver SEC-07 desde una máquina con acceso a la red, o servir la librería
   desde el repositorio.
4. Sincronizar con el Mac y hacer el `git push` — que sigue sin autorizar.

## 12. Contexto retomado en Codex (14.09.2026)

- Comprobado en el Mac: `main` y la referencia local `origin/main` apuntan a `ed5ed45` (Arreglos invisibles de la auditoría: seguridad, peso y fluidez), coincidiendo con el último push confirmado en la conversación importada de Claude. No se ha consultado el remoto en esta comprobación.
- Antes de esta nota no había cambios en archivos versionados; `AGENTS.md` aparece sin seguimiento.
- Las pruebas de las secciones anteriores son resultados documentados de sesiones anteriores, no pruebas repetidas por Codex. Siguen pendientes de verificación las migraciones en Supabase real y el despliegue actual.
- La indicación anterior de push pendiente queda superada por el push de `ed5ed45` confirmado en la conversación. No se ha hecho ningún commit ni push en esta consulta.
