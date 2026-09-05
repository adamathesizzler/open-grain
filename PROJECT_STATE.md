# PROJECT_STATE.md — Estado del proyecto OPEN GRAIN

Última actualización: 2026-09-05 (galería de cliente v2 + pasada de fidelidad visual contra los dos mockups originales — ver sección 2b; pendiente `git push` + migraciones SQL).

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
