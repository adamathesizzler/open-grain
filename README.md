# OPEN GRAIN — proyecto propio (web + panel Studio)

Reconstrucción de la web de OPEN GRAIN como código 100% tuyo: sin depender de
la herramienta de ChatGPT, lista para vivir en tu propio repositorio de
GitHub, con hosting en Vercel y backend en Supabase.

## Qué hay aquí

```
open-grain/
├── index.html          → web pública (una sola página, como la original)
├── styles.css
├── main.js
├── assets/
│   ├── favicon.svg
│   └── config.js       → credenciales de Supabase para la web pública
├── studio/              → panel privado de gestión
│   ├── index.html
│   ├── studio.css
│   ├── studio.js
│   └── config.js       → credenciales de Supabase para el panel
└── supabase/
    └── schema.sql       → toda la base de datos (tablas + seguridad)
```

No hay paso de compilación (no Next.js, no npm install obligatorio para verla
funcionar) — son ficheros estáticos que cualquier hosting puede servir tal
cual. Esto fue una decisión deliberada: así puedes previsualizarlo abriendo
`index.html` en el navegador sin instalar nada.

## Los 7 bugs de la web original, corregidos aquí

1. Título "OPEN GRAIN" desbordado en móvil → tamaño de fuente fluido con `clamp()`.
2. El header fijo tapaba los títulos al hacer scroll → `scroll-margin-top` en cada sección.
3. Hueco vacío enorme entre secciones → espaciados normalizados.
4. Carrusel de servicios sin indicar que se puede deslizar → deja ver un
   trozo de la siguiente tarjeta + puntos indicadores.
5. Texto interno "Posts can be selected from the studio panel" visible al
   público → la sección social ahora se oculta por completo hasta que haya
   posts reales seleccionados.
6. Mezcla de idiomas (español/inglés) → todo en inglés, consistente.
7. Enlaces "#" sin destino → apuntan a las URLs reales de Instagram/TikTok.

Además: las fotos ya no se repiten entre proyectos — cada una es un bloque de
color único (con su nombre encima) hasta que subas tus fotos reales.

## Paso 1 — Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com), crea una cuenta/proyecto nuevo (gratis).
2. En el panel del proyecto, abre **SQL Editor** → pega el contenido de
   `supabase/schema.sql` → **Run**. Esto crea todas las tablas, la seguridad
   (RLS) y las categorías de tu portafolio.
3. Ve a **Authentication → Users** → **Add user** → crea tu usuario (tu email
   y una contraseña). Este es el usuario con el que entrarás al panel Studio.
4. Vuelve al **SQL Editor** y ejecuta:
   ```sql
   insert into admins (email) values ('adamabalde1998@gmail.com');
   ```
   (o el email que hayas usado en el paso 3 — es el que da permiso de admin).
5. Ve a **Project Settings → API** y copia **Project URL** y **anon public key**.
6. Pega esos dos valores en `assets/config.js` y en `studio/config.js`
   (sustituyendo `YOUR-PROJECT-ref` y `YOUR-ANON-PUBLIC-KEY`).

## Paso 2 — Subirlo a GitHub

Desde el Terminal de tu Mac (no hace falta nada especial, ya tienes git):

```bash
cd ~/Desktop/open-grain
git init
git add .
git commit -m "Initial commit: Open Grain site + Studio panel"
```

Luego, en [github.com](https://github.com/new), crea un repositorio nuevo
**vacío** (sin README, sin .gitignore — ya los tenemos) llamado por ejemplo
`open-grain`. GitHub te dará dos comandos parecidos a estos — cópialos tal
cual como te los muestre:

```bash
git remote add origin https://github.com/TU-USUARIO/open-grain.git
git branch -M main
git push -u origin main
```

## Paso 3 — Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) → inicia sesión con tu cuenta de GitHub.
2. **Add New → Project** → selecciona el repositorio `open-grain`.
3. Vercel detecta que es un sitio estático automáticamente — no toques la
   configuración de build, dale a **Deploy**.
4. En un par de minutos tendrás una URL tipo `open-grain.vercel.app` ya en vivo.

## Paso 4 — Tu dominio propio

En el proyecto dentro de Vercel: **Settings → Domains** → añade tu dominio
(cómpralo antes en Namecheap, GoDaddy, IONOS, etc., si no lo tienes) →
Vercel te da los registros DNS exactos que tienes que añadir en tu proveedor
del dominio. Una vez propagado (minutos a pocas horas), tu web vive en tu
propio dominio.

## Lo que funciona en el panel Studio

Inicio de sesión, Overview (contadores), Portfolio (categorías + proyectos,
publicar/despublicar), Social posts (añadir enlaces de Instagram/TikTok y
marcarlos como seleccionados), Enquiries (leer las que llegan del formulario
público), Clients, Calendar, Inventory e Quotes & contracts — las ocho
pestañas están conectadas a Supabase (tabla en `schema.sql` + lista/formulario
en `studio.js`).

**Nota sobre Instagram/TikTok**: conectar las cuentas de verdad (para que los
posts se sincronicen solos) requeriría solicitar acceso a las APIs oficiales
de Meta y TikTok, que exigen un proceso de revisión de la app — por eso aquí
se añaden los posts a mano pegando el enlace, que es lo realista para
empezar.

## Diseño y fotos reales

El diseño público (`index.html` + `styles.css` + `main.js`) está portado
1:1 desde el código real que tenía ChatGPT: mismo layout, misma tipografía,
mismo gradiente de marca (azul de día / rojo anaranjado de noche), Liquid
Glass sólo en navbar/botones, grid masonry, parallax con el puntero en el
Hero y cambio automático día/noche según la hora local.

Las 4 fotos que se ven ahora mismo (`assets/portfolio/*.jpg`) son las
mismas imágenes provisionales que ya usaba la web de ChatGPT — siguen
siendo provisionales hasta que subas material real. Para sustituir una:

1. Añade tu foto en `assets/portfolio/` (o cualquier ruta dentro del proyecto).
2. Edita el array `projects` al principio de `main.js` y cambia el campo
   `image` del proyecto correspondiente por la ruta de tu foto.

En cuanto publiques proyectos reales desde Studio → Portfolio (marcados como
"Published"), la sección "Selected work" de la web pública los usará
automáticamente en vez de estos provisionales — lo mismo pasa con Social
posts en cuanto marques publicaciones reales como "seleccionadas".
