// ============================================================
// OPEN GRAIN — public site logic
// Ported 1:1 from the real ChatGPT-built React component
// (source/app/open-grain.tsx) into vanilla JS, wired to the
// Supabase backend that already replaces the Cloudflare/ChatGPT
// specific pieces (auth, D1, R2, Worker API routes).
// ============================================================

// ---------- Multi-page note ----------
// Since the site became multi-page (index = full-bleed work grid, plus
// work/services/about/contact pages), this same file is loaded by every
// page. Every render function below therefore bails out early when its
// container is missing, so each page only runs the parts it actually has.
const $ = (id) => document.getElementById(id);

if ($('year')) $('year').textContent = new Date().getFullYear();

// ---------- Portfolio ----------
// Adama's own photographs. Titles and categories are placeholders he can
// rename from Studio → Portfolio; the images themselves are his real work,
// so nothing on the page is stock any more. Published projects added in
// Studio replace this list entirely (see applyRealProjects below).
// w/h are the real pixel dimensions of each file: the home grid uses them to
// reserve each photo's space before it loads and to balance the columns.
let portfolioState = 'loading';
let socialState = 'loading';

// Reads are bounded and single-flight. A timed-out response cannot overwrite a
// retry; no cached/default portfolio is ever substituted for current public data.
const PUBLIC_READ_TIMEOUT_MS = 12000;
const publicReads = new Map();
function loadPublicResource(key, request, apply, fail) {
  if (publicReads.has(key)) return publicReads.get(key);
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Public read timed out'));
      controller.abort();
    }, PUBLIC_READ_TIMEOUT_MS);
  });
  const operation = Promise.race([
    Promise.resolve().then(() => request(controller.signal)), timeout,
  ]).then(apply).catch(fail).finally(() => {
    clearTimeout(timer);
    publicReads.delete(key);
  });
  publicReads.set(key, operation);
  return operation;
}
function retryMarkup(resource) {
  return `<button type="button" class="public-retry" data-public-retry="${resource}">${lang === 'es' ? 'Reintentar' : 'Try again'}</button>`;
}

// A successful empty response is authoritative; an error is not an empty catalogue.
function publicRows(result) {
  if (!result || result.error || !Array.isArray(result.data)) throw new Error('Public data unavailable');
  return result.data;
}
function portfolioNotice() {
  const messages = lang === 'es'
    ? { loading: 'Cargando portfolio…', error: 'No se pudo cargar el portfolio. Puedes volver a intentarlo.', ready: 'Estamos preparando nuevas historias. Pronto podrás verlas aquí.' }
    : { loading: 'Loading portfolio…', error: 'The portfolio could not be loaded. You can try again.', ready: 'New stories are on their way. See them here soon.' };
  return `<div class="portfolio-notice" role="status" aria-live="polite"><p>${messages[portfolioState]}</p>${portfolioState === 'error' ? retryMarkup('portfolio') : ''}</div>`;
}

const projects = [
  { id: '01', title: 'Formula E',   type: 'Motorsport',   image: 'assets/portfolio/motorsport.jpg',         ratio: 'wide',   w: 1800, h: 1350 },
  { id: '02', title: 'Tōdai-ji',    type: 'Architecture', image: 'assets/portfolio/todaiji.jpg',            ratio: 'tall',   w: 1200, h: 1800 },
  { id: '03', title: 'Daylight',    type: 'Portrait',     image: 'assets/portfolio/portrait-studio.jpg',    ratio: 'tall',   w: 1200, h: 1800 },
  { id: '04', title: 'Nara',        type: 'Wildlife',     image: 'assets/portfolio/nara-deer.jpg',          ratio: 'square', w: 1800, h: 1800 },
  { id: '05', title: 'Blue Room',   type: 'Editorial',    image: 'assets/portfolio/editorial-interior.jpg', ratio: 'wide',   w: 1800, h: 1200 },
  { id: '06', title: 'Nightfall',   type: 'Portrait',     image: 'assets/portfolio/night-portrait.jpg',     ratio: 'tall',   w: 1012, h: 1800 },
  { id: '07', title: 'Low Key',     type: 'Portrait',     image: 'assets/portfolio/portrait-low-key.jpg',   ratio: 'tall',   w: 1200, h: 1800 },
  { id: '08', title: 'Platform',    type: 'Street',       image: 'assets/portfolio/platform.jpg',           ratio: 'tall',   w: 1200, h: 1800 },
  { id: '09', title: 'Sobremesa',   type: 'Documentary',  image: 'assets/portfolio/documentary.jpg',        ratio: 'tall',   w: 1457, h: 1800 },
  { id: '10', title: 'Temple Gate', type: 'Street',       image: 'assets/portfolio/temple-gate.jpg',        ratio: 'tall',   w: 1200, h: 1800 },
  { id: '11', title: 'Offering',    type: 'Documentary',  image: 'assets/portfolio/incense.jpg',            ratio: 'tall',   w: 1350, h: 1800 },
  { id: '12', title: 'Five Storeys',type: 'Architecture', image: 'assets/portfolio/pagoda.jpg',             ratio: 'tall',   w: 1200, h: 1800 },
  { id: '13', title: 'Gate Tower',  type: 'Architecture', image: 'assets/portfolio/gate-tower.jpg',         ratio: 'tall',   w: 1012, h: 1800 },
  { id: '14', title: 'Roadside',    type: 'Street',       image: 'assets/portfolio/roadside.jpg',           ratio: 'tall',   w: 1012, h: 1800 },
  { id: '15', title: 'Namba Yasaka',type: 'Architecture', image: 'assets/portfolio/namba-yasaka.jpg',       ratio: 'square', w: 1800, h: 1800 },
  { id: '16', title: 'Ginza',       type: 'Motorsport',   image: 'assets/portfolio/ginza-nissan.jpg',       ratio: 'wide',   w: 1800, h: 1350 },
  { id: '17', title: 'Tokyo Tower', type: 'Architecture', image: 'assets/portfolio/tokyo-tower.jpg',        ratio: 'tall',   w: 1012, h: 1800 },
  { id: '18', title: 'Halo',        type: 'Motorsport',   image: 'assets/portfolio/halo-detail.jpg',        ratio: 'wide',   w: 1800, h: 1350 },
  { id: '19', title: 'Last Train',  type: 'Street',       image: 'assets/portfolio/last-train.jpg',         ratio: 'tall',   w: 1012, h: 1800 },
  { id: '20', title: 'Shibuya',     type: 'Street',       image: 'assets/portfolio/shibuya.jpg',            ratio: 'tall',   w: 1350, h: 1800 },
  { id: '21', title: 'Cheers',      type: 'Nightlife',    image: 'assets/portfolio/nightlife-cheers.jpg',   ratio: 'wide',   w: 1800, h: 1350 },
  { id: '22', title: 'The Crew',    type: 'Nightlife',    image: 'assets/portfolio/nightlife-crew.jpg',     ratio: 'wide',   w: 1800, h: 1350 },
  { id: '23', title: 'Crossing',    type: 'Motorsport',   image: 'assets/portfolio/nissan-crossing.jpg',    ratio: 'wide',   w: 1800, h: 1350 },
  { id: '24', title: 'Itaewon',     type: 'Street',       image: 'assets/portfolio/itaewon.jpg',            ratio: 'tall',   w: 1350, h: 1800 },
];
let portfolioRawRows = [], portfolioGroupRows = [];
// Intrinsic dimensions of existing assets, not a second CMS list.
const portfolioAssetMetadata = Object.fromEntries(projects.map(p => [p.image.replace(/^\//,''), {w:p.w,h:p.h}]));
// Texto alternativo de cada fotografía: describe lo que se ve, no sólo el
// título y la categoría. Va por idioma, igual que el resto de la web. Las fotos
// que se publiquen desde Studio no están en esta lista y usan título y tipo.
const PHOTO_ALT = {
  'assets/portfolio/motorsport.jpg':         ['Front of a pink and white Formula E car, number 23, on display.', 'Frontal de un monoplaza de Fórmula E blanco y rosa, número 23, en exposición.'],
  'assets/portfolio/todaiji.jpg':            ['Tōdai-ji temple hall reflected in a pond under a blue sky with clouds.', 'El templo Tōdai-ji reflejado en un estanque bajo un cielo azul con nubes.'],
  'assets/portfolio/portrait-studio.jpg':    ['Smiling man in a cream T-shirt and jeans, arms crossed, against a light wall.', 'Hombre sonriente con camiseta crema y vaqueros, de brazos cruzados, contra una pared clara.'],
  'assets/portfolio/nara-deer.jpg':          ['Two deer looking to the right beside a wooden fence in Nara.', 'Dos ciervos mirando a la derecha junto a una valla de madera en Nara.'],
  'assets/portfolio/editorial-interior.jpg': ['Man in a white T-shirt lounging on a brown leather sofa against a deep blue wall, hand in his hair.', 'Hombre con camiseta blanca recostado en un sofá de cuero marrón ante una pared azul intenso, con la mano en el pelo.'],
  'assets/portfolio/night-portrait.jpg':     ['Black-and-white night portrait of a woman in a light coat looking over her shoulder, with light trails behind her.', 'Retrato nocturno en blanco y negro de una mujer con abrigo claro que mira por encima del hombro, con estelas de luz detrás.'],
  'assets/portfolio/portrait-low-key.jpg':   ['Low-key portrait of a man in a cream T-shirt, arms crossed, looking aside in a dark room lit by wall lamps.', 'Retrato en clave baja de un hombre con camiseta crema, de brazos cruzados, mirando a un lado en una sala oscura con apliques encendidos.'],
  'assets/portfolio/platform.jpg':           ['Two people with backpacks, seen from behind, choosing a drink at a vending machine on a station platform.', 'Dos personas con mochila, de espaldas, eligiendo bebida en una máquina expendedora del andén.'],
  'assets/portfolio/documentary.jpg':        ['Older man in a straw hat resting against a white stone wall in the shade.', 'Hombre mayor con sombrero de paja descansando junto a un muro de piedra blanca, a la sombra.'],
  'assets/portfolio/temple-gate.jpg':        ['A man walks past a wooden temple gate hung with white banners.', 'Un hombre pasa junto a la puerta de madera de un templo con estandartes blancos.'],
  'assets/portfolio/incense.jpg':            ['Hands placing incense sticks in a large bronze burner at a temple.', 'Manos colocando varillas de incienso en un gran quemador de bronce de un templo.'],
  'assets/portfolio/pagoda.jpg':             ['Five-storey pagoda framed by autumn leaves against a soft sky.', 'Pagoda de cinco pisos enmarcada por hojas de otoño contra un cielo suave.'],
  'assets/portfolio/gate-tower.jpg':         ['Traditional tower beside a moat in hazy light, with red leaves in the foreground.', 'Torre tradicional junto a un foso con luz brumosa y hojas rojas en primer plano.'],
  'assets/portfolio/roadside.jpg':           ['Red Coca-Cola vending machine against a grey building wall.', 'Máquina expendedora roja de Coca-Cola contra la pared gris de un edificio.'],
  'assets/portfolio/namba-yasaka.jpg':       ['The giant lion-head hall of Namba Yasaka shrine, with visitors queuing below.', 'La gran cabeza de león del santuario Namba Yasaka, con visitantes haciendo cola debajo.'],
  'assets/portfolio/ginza-nissan.jpg':       ['Nissan Formula E car on display in a glass showroom.', 'Monoplaza Nissan de Fórmula E expuesto en una sala acristalada.'],
  'assets/portfolio/tokyo-tower.jpg':        ['Tokyo Tower in orange and white, seen from below between power lines.', 'La Torre de Tokio, naranja y blanca, vista desde abajo entre cables eléctricos.'],
  'assets/portfolio/halo-detail.jpg':        ['Close-up of the halo and cockpit of a pink and white Formula E car.', 'Detalle del halo y la cabina de un monoplaza de Fórmula E blanco y rosa.'],
  'assets/portfolio/last-train.jpg':         ['Empty station platform at night with a lit vending machine.', 'Andén vacío de noche con una máquina expendedora iluminada.'],
  'assets/portfolio/shibuya.jpg':            ['A Shibuya street at night lined with neon signs.', 'Una calle de Shibuya de noche llena de rótulos de neón.'],
  'assets/portfolio/nightlife-cheers.jpg':   ['Four friends hugging and laughing with drinks in hand on a night out.', 'Cuatro amigas abrazadas y riendo con bebidas en la mano en una noche de fiesta.'],
  'assets/portfolio/nightlife-crew.jpg':     ['Four friends smiling close together at a party.', 'Cuatro amigas sonriendo muy juntas en una fiesta.'],
  'assets/portfolio/nissan-crossing.jpg':    ['Front view of a red and white Formula E car on display at night.', 'Vista frontal de un monoplaza de Fórmula E rojo y blanco expuesto de noche.'],
  'assets/portfolio/itaewon.jpg':            ['A street crossing in Itaewon with a car turning and hillside houses behind.', 'Un cruce de calles en Itaewon con un coche girando y casas en la ladera al fondo.'],
};

function photoAlt(p) {
  const pair = PHOTO_ALT[String(p.image || '').replace(/^\//,'')];
  if (pair) return pair[lang === 'es' ? 1 : 0];
  return [p.title, p.type].filter(Boolean).join(' — ');
}

// Las piezas del portfolio abren la vista ampliada, así que se anuncian como
// botón y dicen qué abren: título, tipo y la descripción de la foto.
function tileLabel(p) {
  const verb = lang === 'es' ? 'Ampliar' : 'Enlarge';
  const head = [p.title, p.type].filter(Boolean).join(', ');
  return `${verb}: ${head}. ${photoAlt(p)}`;
}

// One image per service, in the same order as copy[].serviceList
// (Photography, Film & Reels, UGC, Events, Social Content).
const serviceImages = window.OGServiceCatalog.images;
let serviceCatalogReady = false;
let serviceCatalogState = 'loading';
let studioPreviewActive = false;
let serviceCatalog = window.OGServiceCatalog.legacy(window.DEFAULT_COPY || {es:{},en:{}});
function currentServices() { return window.OGServiceCatalog.active(serviceCatalog, lang); }
function applyServiceCatalog(catalog) {
  serviceCatalog = window.OGServiceCatalog.validate(catalog);
  ['es','en'].forEach(locale => { const entries = window.OGServiceCatalog.active(serviceCatalog, locale); copy[locale].serviceList = entries.map(entry=>entry.label); copy[locale].serviceBlurbs = entries.map(entry=>entry.description); });
}


// Editable marketing copy (headline, about text, etc.) lives in
// assets/default-copy.js as the fallback, and can be overridden per
// field from Studio → Site content (or via the AI assistant) — see
// the `applyContentOverrides()` call near the Supabase section below.
const defaults = window.DEFAULT_COPY || { en: {}, es: {} };

const copy = {
  en: {
    work: 'Work', services: 'Services', studio: 'Studio', contact: 'Contact',
    ...defaults.en,
    selected: 'Selected work',
    workMore: 'View services',
    viewService: 'View service',
    // Tarjeta del servicio en Contacto. Descripciones generales y honestas:
    // qué se produce y para quién, sin cantidades, entregas ni plazos, porque
    // esos paquetes no están confirmados. Editables desde Studio por su clave.
    svcChip: 'Selected service', svcPricingLabel: 'Pricing',
    svcQuote: 'Custom quote', svcLinked: 'Your selection is linked to the form.',
    svcNone: 'No service selected', svcPickOne: 'Choose one to see its details.',
    svcSelectedSuffix: 'selected — tell us what you have in mind.',
    serviceBlurbs: window.OGServiceCatalog.blurbs.en,
    processTitle: 'How we work',
    processSteps: [
      { t: 'Tell us your project', d: 'Write to us with your idea, a rough date and budget — nothing needs to be fully decided yet.' },
      { t: 'We send you a proposal', d: 'We reply with availability, how we’d approach it and a tailored quote.' },
      { t: 'Shoot and delivery', d: 'We produce the material and deliver it selected and edited.' },
    ],
    start: 'Tell us your project', sent: 'Request sent. We’ll be in touch soon.',
    social: 'Latest from the studio',
    fName: 'Name', fPhone: 'Phone', fService: 'Service', fServicePh: 'Choose a service',
    fDate: 'Preferred date', fBudget: 'Approx. budget', fMessage: 'Tell us about your idea',
    fMessagePh: 'Project, location, references…',
    fConsent: 'I have read and accept the <a href="/privacidad" hreflang="es" target="_blank" rel="noopener">Privacy Policy</a>.',
  },
  es: {
    work: 'Proyectos', services: 'Servicios', studio: 'Estudio', contact: 'Contacto',
    ...defaults.es,
    selected: 'Trabajos seleccionados',
    workMore: 'Ver servicios',
    viewService: 'Ver servicio',
    svcChip: 'Servicio seleccionado', svcPricingLabel: 'Presupuesto',
    svcQuote: 'Presupuesto personalizado', svcLinked: 'Tu selección queda enlazada al formulario.',
    svcNone: 'Ningún servicio seleccionado', svcPickOne: 'Elige uno para ver su detalle.',
    svcSelectedSuffix: 'seleccionado — cuéntanos qué tienes en mente.',
    serviceBlurbs: window.OGServiceCatalog.blurbs.es,
    processTitle: 'Cómo trabajamos',
    processSteps: [
      { t: 'Cuéntanos tu proyecto', d: 'Nos escribes con tu idea, una fecha aproximada y presupuesto orientativo — no hace falta tenerlo todo decidido.' },
      { t: 'Te enviamos una propuesta', d: 'Te respondemos con disponibilidad, cómo lo enfocaríamos y un presupuesto a medida.' },
      { t: 'Rodaje y entrega', d: 'Producimos el material y te lo entregamos seleccionado y editado.' },
    ],
    start: 'Cuéntanos tu proyecto', sent: 'Solicitud enviada. Os responderemos pronto.',
    social: 'Lo último del estudio',
    fName: 'Nombre', fPhone: 'Teléfono', fService: 'Servicio', fServicePh: 'Selecciona un servicio',
    fDate: 'Fecha aproximada', fBudget: 'Presupuesto aproximado', fMessage: 'Cuéntanos tu idea',
    fMessagePh: 'Proyecto, lugar, referencias…',
    fConsent: 'He leído y acepto la <a href="/privacidad" target="_blank" rel="noopener">Política de Privacidad</a>.',
  },
};

// Idioma de la primera visita: el del navegador. Español (y catalán, habitual
// en Mallorca) abren en español; el resto, en inglés. Si el visitante ya eligió
// idioma con el botón, manda su elección (se lee más abajo de localStorage).
let lang = (() => {
  try {
    const first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^(es|ca)\b/i.test(first) ? 'es' : 'en';
  } catch (e) { return 'en'; }
})();
let dark = (() => { const h = new Date().getHours(); return h < 7 || h >= 20; })();

// Se declaran aquí, antes de la primera llamada a renderAll(), porque
// renderContact() los usa.
let ogContactController = null;
let contactPrefilled = false;

const shell = $('site-shell');

function applyTheme() {
  if (shell) shell.classList.toggle('dark-mode', dark);
}

const svg = (d) => `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const NAV_PAGES = [
  ['/', 'home'],
  ['/work', 'work'],
  ['/services', 'services'],
  ['/about', 'studio'],
  ['/contact', 'contact'],
];

// La navegación es una barra inferior, estilo Pinterest, compartida por las
// cinco páginas: assets/ux/og-tabbar.js la monta sobre #dock. Aquí sólo le
// pasamos el idioma y los enlaces; ella actualiza sus nodos sin rehacer el DOM,
// así no se pierde el foco al cambiar de idioma.
//
// Si el script no llega a ejecutarse, el <nav> conserva sus enlaces HTML de
// respaldo (con aspecto de barra, ver og-ux-fixes.css) y la web se sigue
// pudiendo navegar.
function renderNav() {
  const dock = $('dock');
  if (dock && window.OGTabbar) {
    const t = copy[lang];
    window.OGTabbar.mount(dock, {
      lang,
      items: NAV_PAGES.map(([href, key]) => ({
        key,
        href,
        label: key === 'home' ? (lang === 'es' ? 'Inicio' : 'Home') : t[key],
      })),
    });
  }
  renderLangSwitch();
}

// Cambio de idioma: arriba a la derecha, frente al logo y con su mismo
// tratamiento (blanco en modo diferencia), así se lee sobre fotos y sobre
// fondos claros. Muestra los dos idiomas con el actual resaltado; para el
// lector de pantalla, el nombre es la acción.
function renderLangSwitch() {
  const shell = $('site-shell');
  if (!shell) return;
  let btn = $('lang-switch');
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'lang-switch';
    btn.className = 'lang-switch';
    btn.innerHTML = '<span data-l="es">ES</span><span class="lang-switch-dot" aria-hidden="true">·</span><span data-l="en">EN</span>';
    const mark = shell.querySelector('.wordmark');
    if (mark) mark.after(btn); else shell.prepend(btn);
    btn.addEventListener('click', () => {
      lang = lang === 'en' ? 'es' : 'en';
      try { localStorage.setItem('og_lang', lang); } catch (err) { /* ignore */ }
      renderAll();
    });
  }
  const es = lang === 'es';
  btn.setAttribute('aria-label', es ? 'Cambiar el idioma a inglés' : 'Switch language to Spanish');
  btn.querySelectorAll('[data-l]').forEach(s => s.classList.toggle('is-on', s.dataset.l === lang));
}

// ---------- Home: the full-bleed work grid ----------
// The home page is nothing but this grid — no headline, no intro copy, no
// stacked sections. Tiles reuse the shared .project-tile class + the
// data-lightbox-* attributes, so the existing delegated lightbox picks
// them up with no extra wiring.
function homeTileMarkup(p, i, isRepeat) {
  // aspect-ratio reserves each photo's space before it loads, so the columns
  // don't jump around as images arrive. Repeats are hidden from screen
  // readers: the same photographs announced over and over would be noise.
  const ar = tileRatio(p);
  const repeatAttrs = isRepeat
    ? ' aria-hidden="true" tabindex="-1"'
    : ` tabindex="0" role="button" aria-label="${attrEscape(tileLabel(p))}"`;
  return `
    <figure class="project-tile"${repeatAttrs} data-portfolio-key="${attrEscape(p.groupId || p.photoId || p.id)}" data-photo-index="0" data-lightbox-image="${attrEscape(p.image)}" data-lightbox-title="${attrEscape(p.title)}" data-lightbox-eyebrow="${attrEscape(p.type)}" data-lightbox-alt="${attrEscape(photoAlt(p))}" style="--i:${i};aspect-ratio:${(1 / ar).toFixed(4)}">
      ${photoMarkup(p.image, `alt="${isRepeat ? '' : attrEscape(photoAlt(p))}" loading="${!isRepeat && i < 6 ? 'eager' : 'lazy'}" decoding="async"`, SIZES_HOME)}
      <figcaption><span>${attrEscape(p.title)}</span><span>${attrEscape(p.type)}</span></figcaption>
    </figure>`;
}

// Height ÷ width. Real dimensions when we have them; otherwise inferred from
// the layout class, which is all Studio-published projects carry.
function tileRatio(p) {
  if (p.w && p.h) return p.h / p.w;
  const r = p.ratio || '';
  if (r.includes('wide')) return 0.7;
  if (r.includes('square')) return 1;
  return 1.45;
}

function homeColumnCount() {
  const w = window.innerWidth;
  if (w <= 560) return 2;
  if (w <= 900) return 3;
  if (w <= 1400) return 4;
  return 5;
}

// ---------- Endless home grid ----------
// The home never reaches a bottom: as you approach the end, the portfolio is
// appended again, so scrolling just keeps revealing work. Each pass reuses
// the same image URLs, so the repeats come straight from the browser cache.
// A hard ceiling keeps the DOM from growing without bound on a very long
// scroll; by then the visitor has seen the portfolio many times over.
const HOME_MAX_TILES = 240;

let homeCols = [];      // [{ el, height }] — height is in units of tile width
let homeTileCount = 0;

function appendHomeBatch() {
  if (!homeCols.length || homeTileCount >= HOME_MAX_TILES) return;
  projects.forEach((p, k) => {
    if (homeTileCount >= HOME_MAX_TILES) return;
    const target = homeCols.reduce((a, b) => (b.height < a.height ? b : a));
    // Animation index resets each pass so later batches still fade in quickly.
    target.el.insertAdjacentHTML('beforeend', homeTileMarkup(p, k, homeTileCount >= projects.length));
    target.height += tileRatio(p);
    homeTileCount += 1;
  });
}

function renderHomeGrid() {
  const grid = $('home-grid');
  if (!grid) return;
  if (portfolioState !== 'ready' || !projects.length) { grid.innerHTML = portfolioNotice(); homeCols = []; homeTileCount = 0; return; }

  const count = homeColumnCount();
  grid.innerHTML = Array.from({ length: count }, () => '<div class="home-col"></div>').join('');
  grid.dataset.cols = String(count);

  // Greedy balance: each photo joins whichever column is currently shortest,
  // measured in height-per-unit-width. CSS `columns` fills them in order
  // instead, which leaves the last column visibly short.
  homeCols = Array.from(grid.querySelectorAll('.home-col')).map(el => ({ el, height: 0 }));
  homeTileCount = 0;
  appendHomeBatch();
  fillHomeViewport();
}

// Make sure the first screens are covered even on a tall display, otherwise
// there would be nothing below the fold to trigger the next batch.
function fillHomeViewport() {
  let guard = 0;
  while (
    document.documentElement.scrollHeight < window.innerHeight * 2.5 &&
    homeTileCount < HOME_MAX_TILES &&
    guard++ < 20
  ) appendHomeBatch();
}

function maybeExtendHome() {
  if (!homeCols.length) return;
  const remaining = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
  if (remaining < window.innerHeight * 1.5) appendHomeBatch();
}

let homeScrollTicking = false;
window.addEventListener('scroll', () => {
  if (!homeCols.length || homeScrollTicking) return;
  homeScrollTicking = true;
  requestAnimationFrame(() => { maybeExtendHome(); homeScrollTicking = false; });
}, { passive: true });

// Re-lay out only when the column count actually changes, so an ordinary
// resize doesn't rebuild the grid (and restart its entrance animation).
let homeResizeTimer = 0, homeViewportWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === homeViewportWidth) return;
  homeViewportWidth = window.innerWidth;
  clearTimeout(homeResizeTimer);
  homeResizeTimer = setTimeout(() => {
    const grid = $('home-grid');
    if (!grid) return;
    if (grid.dataset.cols !== String(homeColumnCount())) renderHomeGrid();
    else fillHomeViewport();
  }, 150);
}, { passive: true });

// Escapa texto que va a acabar dentro de una plantilla HTML. Sirve tanto para
// un atributo entre comillas dobles como para contenido de texto, porque
// neutraliza los cuatro caracteres que pueden cambiar la estructura del
// documento. El & va primero: si no, se re-escaparían los que genera el resto.
// Los títulos de los proyectos vienen de Supabase, así que un título con un
// «<» o un «&» rompía la cuadrícula antes de esto.
function attrEscape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- Fotos: WebP en dos anchos, con el JPEG de siempre de respaldo ----
// Las fotos del portafolio viven en el repositorio y tienen, junto a ellas,
// versiones WebP de 480 y 960 píxeles de ancho. Envolviendo la <img> en un
// <picture> el navegador elige el ancho que de verdad necesita: un móvil se
// descarga 0,96 MB en vez de 7,46 MB para la misma cuadrícula.
//
// Cualquier otra ruta —una foto subida desde Studio, que vive en Supabase—
// devuelve la <img> de siempre sin tocar nada, porque de esas no hay versiones
// generadas. El <picture> lleva display:contents en el CSS, así que para la
// maquetación la <img> sigue siendo hija directa de la tarjeta y no cambia
// absolutamente nada de cómo se ve.
const LOCAL_PHOTO = /^assets\/portfolio\/([^/]+)\.jpe?g$/i;

function photoMarkup(src, attrs, sizes) {
  const img = `<img src="${attrEscape(src)}" ${attrs}>`;
  const match = LOCAL_PHOTO.exec(String(src || '').replace(/^\//,''));
  if (!match) return img;
  const base = attrEscape(`/assets/portfolio/${match[1]}`);
  return `<picture>` +
    `<source type="image/webp" srcset="${base}-480.webp 480w, ${base}-960.webp 960w" sizes="${attrEscape(sizes)}">` +
    img +
  `</picture>`;
}

// Anchos reales de cada hueco, para que el navegador no elija a ciegas.
// Portada: 2 columnas hasta 560px, 3 hasta 900, 4 hasta 1400, 5 por encima.
const SIZES_HOME = '(max-width:560px) 50vw, (max-width:900px) 33vw, (max-width:1400px) 25vw, 20vw';
// Work: el mosaico pasa de 4 columnas a 3 en 1050px y a 2 en 700px.
const SIZES_WORK = '(max-width:700px) 50vw, (max-width:1050px) 33vw, 25vw';

function renderWork() {
  const grid = $('masonry-grid');
  if (!grid) return;
  const t = copy[lang];
  if ($('work-label')) $('work-label').textContent = t.selected;
  if ($('work-lede')) $('work-lede').textContent = t.workBlurb;
  if ($('work-more-link')) $('work-more-link').textContent = t.workMore;
  // Las cuatro primeras se cargan de inmediato y el resto en diferido, igual
  // que en la portada: antes esta cuadrícula pedía las 24 fotos a la vez,
  // incluidas las que están cinco pantallas más abajo.
  // Cada pieza es un botón que abre la vista ampliada. Antes era un <article>
  // con tabindex, que el lector de pantalla anunciaba sin decir que se podía
  // abrir. Las reglas de estilo van por clase, así que se ve exactamente igual.
  if (portfolioState !== 'ready' || !projects.length) { grid.innerHTML = portfolioNotice(); return; }
  grid.innerHTML = projects.map((p, i) => `
    <figure class="project-tile ${attrEscape(p.ratio)}" tabindex="0" role="button" aria-label="${attrEscape(tileLabel(p))}" data-portfolio-key="${attrEscape(p.groupId || p.photoId || p.id)}" data-photo-index="0" data-lightbox-image="${attrEscape(p.image)}" data-lightbox-title="${attrEscape(p.title)}" data-lightbox-eyebrow="${attrEscape(p.type)}" data-lightbox-alt="${attrEscape(photoAlt(p))}">
      ${photoMarkup(p.image, `alt="${attrEscape(photoAlt(p))}" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async"`, SIZES_WORK)}
      <div><span>/ ${attrEscape(p.id)}</span><h3>${attrEscape(p.title)}</h3><p>${attrEscape(p.type)}</p></div>
    </figure>`).join('');
}

function renderStatement() {
  const t = copy[lang];
  // Checked separately: the services page reuses the body copy as its lede
  // without carrying the heading.
  if ($('statement-heading')) $('statement-heading').textContent = t.intro;
  if ($('statement-body')) $('statement-body').textContent = t.introBody;
}

function renderServices() {
  const t = copy[lang];
  // The kicker says "Services"; the heading is the marketing line, so they
  // don't repeat each other.
  if ($('services-label')) $('services-label').textContent = t.services;
  if ($('services-heading')) $('services-heading').textContent = t.capabilities;

  const cards = $('service-cards');
  if (cards) {
    // On the services page this is a plain index list (<ol>); elsewhere it is
    // the older card grid. Same data, rendered to fit its container.
    // Cada fila dice qué se produce (las mismas descripciones que la tarjeta
    // de Contacto), y el nombre lleva a Contacto con el servicio ya elegido.
    const status = `<p role="status">${lang==='es'?(serviceCatalogState==='error'?'No se pudo cargar el catálogo.':'Cargando servicios…'):(serviceCatalogState==='error'?'The service catalogue could not be loaded.':'Loading services…')}</p>${serviceCatalogState === 'error' ? retryMarkup('catalog') : ''}`;
    cards.innerHTML = !serviceCatalogReady ? (cards.tagName === 'OL' ? `<li class="service-load-notice">${status}</li>` : status) : cards.tagName === 'OL'
      ? t.serviceList.map((s, i) => {
          const blurb = t.serviceBlurbs?.[i];
          return `<li><div class="svc-row"><a class="svc-link" href="/contact?service=${encodeURIComponent(currentServices()[i].id)}"><span>${attrEscape(s)}</span></a>` +
            (blurb ? `<p class="svc-blurb">${attrEscape(blurb)}</p>` : '') + `</div></li>`;
        }).join('')
      : t.serviceList.map((s, i) => `
        <article>
          <span>0${i + 1}</span>
          <img src="${attrEscape(currentServices()[i]?.image || serviceImages[i % serviceImages.length])}" alt="">
          <div><h3>${attrEscape(s)}</h3><p>${t.viewService} →</p></div>
        </article>`).join('');
  }

  const processList = $('process-steps');
  if (processList) {
    if ($('process-heading')) $('process-heading').textContent = t.processTitle;
    processList.innerHTML = t.processSteps.map((s, i) => `
      <li><span class="process-step-n">0${i + 1}</span><div><h3>${attrEscape(s.t)}</h3><p>${attrEscape(s.d)}</p></div></li>
    `).join('');
  }

  renderServiceMarquee();
}

// The ribbon: one tilted card per service, drifting sideways forever. The
// list is rendered twice and the track travels exactly -50%, so the loop has
// no seam. The second copy is hidden from screen readers — it is the same
// services again, announced twice.
function renderServiceMarquee() {
  const el = $('service-marquee');
  if (!el) return;
  if (!serviceCatalogReady) { el.innerHTML=''; return; }
  const t = copy[lang];
  const card = (s, i, dup) => `
    <figure class="svc-card"${dup ? ' aria-hidden="true"' : ''}>
      <img src="${attrEscape(currentServices()[i]?.image || serviceImages[i % serviceImages.length])}" alt="">
      <figcaption><span>0${i + 1}</span>${attrEscape(s)}</figcaption>
    </figure>`;
  const pass = (dup) => t.serviceList.map((s, i) => card(s, i, dup)).join('');
  el.innerHTML = `<div class="marquee-track">${pass(false)}${pass(true)}</div>`;
  renderMarqueeToggle();
}

// Botón de pausa del carrusel de Servicios.
let marqueePaused = false;
function renderMarqueeToggle() {
  const btn = $('marquee-toggle');
  if (!btn) return;
  const es = lang === 'es';
  $('service-marquee')?.classList.toggle('is-paused', marqueePaused);
  btn.classList.toggle('is-paused', marqueePaused);
  $('marquee-toggle-text').textContent = marqueePaused
    ? (es ? 'Reanudar' : 'Play')
    : (es ? 'Pausar' : 'Pause');
}
$('marquee-toggle')?.addEventListener('click', () => {
  marqueePaused = !marqueePaused;
  renderMarqueeToggle();
});

function renderStudio() {
  if (!$('studio-heading')) return;
  const t = copy[lang];
  if ($('studio-label')) $('studio-label').textContent = t.studio;
  $('studio-heading').textContent = t.about;
  $('studio-body').textContent = t.aboutBody;
  if ($('studio-tag')) $('studio-tag').textContent = t.studioTag;
}

// Stable catalogue IDs survive translation, renaming and reordering.
const SERVICE_VALUE = i => currentServices()[i]?.id || '';
const BUDGET_UNDECIDED = 'undecided';
function serviceLabel(value) { return window.OGServiceCatalog.resolve(serviceCatalog, lang, value)?.label || null; }

// El texto de consentimiento lleva un enlace y puede editarse desde Studio. Se
// inserta como HTML, pero sólo después de quitar scripts y manejadores en
// línea: el contenido del CMS no debe poder ejecutar código aquí.
function setTrustedHtml(node, html) {
  const template = document.createElement('template');
  template.innerHTML = String(html ?? '');
  template.content.querySelectorAll('script, style, iframe, object, embed').forEach(el => el.remove());
  template.content.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || (['href', 'src'].includes(name) && value.startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    });
  });
  node.replaceChildren(template.content);
}

// La tarjeta lee el valor del <select>, nunca una copia aparte: así no puede
// enseñar un servicio distinto del que se va a enviar.
function renderServiceCard() {
  const card = $('service-card');
  if (!card) return;
  const t = copy[lang];
  const list = t.serviceList || [];
  const entries = currentServices();
  const i = entries.findIndex(entry => entry.id === $('service')?.value);
  const chosen = i >= 0 && i < list.length;

  $('service-card-chip').textContent = t.svcChip;
  $('service-card-label').textContent = t.svcPricingLabel;

  if (chosen) {
    const img = $('service-card-img');
    const src = entries[i].image;
    if (img.getAttribute('src') !== src) img.src = src;
    img.alt = '';
    $('service-card-index').textContent = `${String(i + 1).padStart(2, '0')} / ${list[i]}`;
    $('service-card-title').textContent = list[i];
    $('service-card-desc').textContent = t.serviceBlurbs?.[i] || '';
    $('service-card-price').textContent = t.svcQuote;
    $('service-card-note').textContent = t.svcLinked;
  } else {
    $('service-card-index').textContent = '';
    $('service-card-title').textContent = t.svcNone;
    $('service-card-desc').textContent = t.svcPickOne;
    $('service-card-price').textContent = t.svcQuote;
    $('service-card-note').textContent = '';
  }
  // El subtítulo confirma la elección sin obligar a mirar el desplegable.
  const lede = $('contact-lede');
  if (lede) {
    lede.textContent = chosen
      ? `${list[i]} ${t.svcSelectedSuffix}`
      : t.ctaLede;
  }
}

// Marca «opcional» junto a la etiqueta, una sola vez por campo, para que no
// haya que adivinar qué hace falta rellenar. Aparece en la maqueta.
function markOptional(labelId, text) {
  const label = $(labelId);
  if (!label) return;
  let tag = label.querySelector('.og-optional');
  if (!tag) {
    tag = document.createElement('span');
    tag.className = 'og-optional';
    label.firstChild?.after(tag);
  }
  tag.textContent = ` · ${text}`;
}

function renderContact() {
  if (!$('contact-form')) return;
  const t = copy[lang];
  const es = lang === 'es';
  if ($('contact-heading')) $('contact-heading').textContent = t.cta;
  if ($('contact-lede')) $('contact-lede').textContent = t.ctaLede;
  $('label-name').firstChild.textContent = t.fName;
  $('label-phone').firstChild.textContent = t.fPhone;
  $('label-service').firstChild.textContent = t.fService;
  $('label-date').firstChild.textContent = t.fDate;
  $('label-budget').firstChild.textContent = t.fBudget;
  $('label-message').firstChild.textContent = t.fMessage;
  $('message').placeholder = t.fMessagePh;
  setTrustedHtml($('label-consent'), t.fConsent);

  const optional = es ? 'opcional' : 'optional';
  ['label-phone', 'label-date', 'label-budget'].forEach(id => markOptional(id, optional));

  // setOptions conserva la selección mientras su valor siga existiendo, y
  // nunca reordena por selectedIndex.
  const service = $('service');
  if (service) service.disabled = !serviceCatalogReady;
  const chosenService = service?.value || '';
  window.OGContact?.setOptions(
    service,
    (serviceCatalogReady ? t.serviceList || [] : []).map((label, i) => ({ value: SERVICE_VALUE(i), label })),
    t.fServicePh
  );
  // Si el catálogo ha cambiado y el servicio elegido ya no existe, hay que
  // decirlo: descartar la elección en silencio es peor que pedirla otra vez.
  const lostService = Boolean(chosenService) && service && service.value !== chosenService;
  const notice = $('service-notice');
  if (notice) {
    notice.textContent = lostService
      ? (es
          ? 'El servicio que habías elegido ya no está disponible. Selecciona otro; el resto de tu solicitud se conserva.'
          : 'The service you had chosen is no longer available. Pick another one; the rest of your request is kept.')
      : '';
    notice.hidden = !lostService;
    if(!serviceCatalogReady){notice.textContent=lang==='es'?(serviceCatalogState==='error'?'No se pudo comprobar el catálogo. Reinténtalo antes de enviar.':'Cargando catálogo…'):(serviceCatalogState==='error'?'The catalogue could not be checked. Try again before sending.':'Loading catalogue…');notice.hidden=false;if(serviceCatalogState==='error')notice.insertAdjacentHTML('beforeend',retryMarkup('catalog'));}
  }

  // Preselección al llegar desde Servicios. Sólo la primera vez: después
  // manda lo que haya elegido la persona.
  if (!contactPrefilled && serviceCatalogReady) {
    contactPrefilled = true;
    const index = new URLSearchParams(location.search).get('service');
    if (service && index !== null) {
      const value = window.OGServiceCatalog.resolve(serviceCatalog,lang,index)?.id || '';
      if ([...service.options].some(o => o.value === value)) service.value = value;
    }
  }

  window.OGContact?.setOptions($('budget'), [
    { value: BUDGET_UNDECIDED, label: es ? 'Todavía no lo sé' : 'Not sure yet' },
    { value: '€500–1,000', label: '€500–1,000' },
    { value: '€1,000–2,500', label: '€1,000–2,500' },
    { value: '€2,500+', label: '€2,500+' },
  ], es ? 'Elige un rango (€)' : 'Choose a range (€)');

  // La flecha se conserva; el texto vive en su propio span para que el
  // controlador pueda cambiarlo a «Enviando…» sin borrar el icono.
  $('submit-btn').innerHTML = `<span data-og-label>${attrEscape(t.start)}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
  renderServiceCard();
  ogContactController?.refresh();
}

function renderSocialLabels() {
  const t = copy[lang];
  if ($('social-label')) $('social-label').textContent = t.social;
  if ($('social-lede')) $('social-lede').textContent = t.socialLede;
  // Split heading so the first half can be set in italic serif, like the
  // reference: "Lo último / del estudio".
  if ($('social-title-a')) $('social-title-a').textContent = lang === 'es' ? 'Lo último' : 'The latest';
  if ($('social-title-b')) $('social-title-b').textContent = lang === 'es' ? 'del estudio' : 'from the studio';
  renderNetTabs();
}

// ---------- Social: network picker + adaptive mosaic ----------
// Up to 12 selected posts per network. The count is whatever Adama has
// published — four, nine, twelve — so the layout can't assume a fixed grid:
// posts are dealt into 4 columns (3 on a phone) by running height, which
// keeps the columns level whatever the number and lets every thumbnail keep
// its own proportions instead of being cropped to a common box.
const NETWORKS = [
  ['tiktok', 'TikTok', '<path d="M9 18a3.2 3.2 0 1 0 3.2-3.2V4c.6 2.5 2.6 4.4 5.1 4.7"/>'],
  ['instagram', 'Instagram', '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1"/>'],
  ['youtube', 'YouTube', '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10.5 9.5 5 2.5-5 2.5z"/>'],
];
const SOCIAL_MAX = 12;

// Perfiles reales del estudio. YouTube no tiene canal propio todavía, así que
// no se enlaza: antes la pestaña de YouTube llevaba al perfil de Instagram.
const SOCIAL_PROFILES = {
  tiktok: 'https://tiktok.com/@opengrain.studio',
  instagram: 'https://instagram.com/opengrain.studio',
  youtube: null,
};

let socialNet = 'tiktok';
let socialPosts = { tiktok: [], instagram: [], youtube: [] };

// Una red sólo tiene pestaña si hay algo que enseñar en ella: publicaciones
// seleccionadas o, al menos, un perfil real al que llevar. YouTube no tiene
// canal todavía, así que su pestaña no aparece hasta que lo tenga o haya
// publicaciones suyas seleccionadas en Studio.
function visibleNetworks() {
  return NETWORKS.filter(([id]) => (socialPosts[id] || []).length || SOCIAL_PROFILES[id]);
}

function renderNetTabs() {
  const tabs = $('net-tabs');
  if (!tabs) return;
  tabs.setAttribute('aria-label', lang === 'es' ? 'Redes sociales' : 'Social networks');
  tabs.innerHTML = visibleNetworks().map(([id, label, icon]) => `
    <button class="net-tab" type="button" role="tab" data-net="${id}" id="net-tab-${id}"
            aria-controls="social-grid" aria-selected="${id === socialNet}">${svg(icon)}${label}</button>`).join('');
  $('social-grid')?.setAttribute('aria-labelledby', `net-tab-${socialNet}`);
}

function socialRatio(p) {
  if (p.w && p.h) return p.h / p.w;
  // Sensible defaults per network when a post carries no dimensions:
  // TikTok and Reels are 9:16, YouTube is 16:9.
  return p.platform === 'youtube' ? 0.5625 : 1.7778;
}

function renderSocialGrid() {
  const grid = $('social-grid');
  if (!grid) return;

  // Resize, language and tab changes must not hide an in-flight manual retry.
  if (socialState === 'loading' && grid.querySelector('[data-public-retry="social"]')) return;

  if (socialState === 'error') {
    if ($('social')) $('social').hidden = false;
    grid.innerHTML = `<div role="status"><p>${lang === 'es' ? 'No se pudieron cargar las publicaciones.' : 'Posts could not be loaded.'}</p>${retryMarkup('social')}</div>`;
    if ($('social-empty')) $('social-empty').hidden = true;
    return;
  }

  // La sección entera sólo se enseña cuando hay publicaciones reales
  // seleccionadas en alguna red. Sin ellas, ni hueco vacío ni textos del panel.
  const total = NETWORKS.reduce((n, [id]) => n + (socialPosts[id] || []).length, 0);
  if ($('social')) $('social').hidden = total === 0;

  const posts = (socialPosts[socialNet] || []).slice(0, SOCIAL_MAX);
  const empty = $('social-empty');
  if (empty) {
    empty.hidden = posts.length > 0;
    if (!posts.length) {
      // Sin publicaciones reales seleccionadas en Studio no se inventa nada,
      // pero tampoco se deja al visitante en un hueco vacío: las pestañas
      // siguen ahí y desde aquí se llega al perfil de verdad.
      const label = (NETWORKS.find(n => n[0] === socialNet) || [, socialNet])[1];
      empty.replaceChildren(
        document.createTextNode(lang === 'es'
          ? 'Todavía no hay publicaciones seleccionadas aquí. '
          : 'No posts selected here yet. ')
      );
      const url = SOCIAL_PROFILES[socialNet];
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = (lang === 'es' ? 'Ver en ' : 'See on ') + label + ' →';
        empty.append(link);
      }
    }
  }
  if (!posts.length) { grid.innerHTML = ''; return; }

  const count = window.innerWidth <= 700 ? 3 : 4;
  const cols = Array.from({ length: count }, () => ({ height: 0, html: [] }));

  posts.forEach((p, i) => {
    const target = cols.reduce((a, b) => (b.height < a.height ? b : a));
    const ar = socialRatio(p);
    target.html.push(`
      <figure class="social-post" tabindex="0" role="button" data-idx="${i}"
              aria-label="${attrEscape((lang === 'es' ? 'Ver publicación' : 'View post') + (p.caption ? ': ' + p.caption : ''))}"
              style="--i:${i};aspect-ratio:${(1 / ar).toFixed(4)}">
        <img src="${attrEscape(p.image_url)}" alt="${attrEscape(p.caption || '')}" loading="${i < 4 ? 'eager' : 'lazy'}">
        ${['tiktok', 'youtube'].includes(p.platform)
          ? `<span class="social-play" role="img" aria-label="${lang === 'es' ? 'Vídeo' : 'Video'}"><svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M8 5v14l11-7z"/></svg></span>`
          : ''}
        ${p.caption ? `<figcaption>${attrEscape(p.caption)}</figcaption>` : ''}
      </figure>`);
    target.height += ar;
  });

  grid.innerHTML = cols.map(c => `<div class="social-col">${c.html.join('')}</div>`).join('');
  grid.dataset.cols = String(count);
}

function openPostSheet(post) {
  const sheet = $('post-sheet');
  if (!sheet || !post) return;
  $('post-sheet-img').src = post.image_url;
  $('post-sheet-img').alt = post.caption || '';
  $('post-sheet-net').textContent = (NETWORKS.find(n => n[0] === post.platform) || [, post.platform])[1];
  $('post-sheet-caption').textContent = post.caption || '';
  // Sin pie, el encabezado sobra: un h3 vacío se anuncia como un título en blanco.
  $('post-sheet-caption').hidden = !post.caption;
  const link = $('post-sheet-link');
  link.href = post.external_url || '#';
  link.hidden = !post.external_url;
  link.textContent = lang === 'es' ? 'Ver publicación ↗' : 'View post ↗';
  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => sheet.classList.add('is-open'));
  $('post-sheet-close').focus();
}

function closePostSheet() {
  const sheet = $('post-sheet');
  if (!sheet || sheet.hidden) return;
  sheet.classList.remove('is-open');
  document.body.style.overflow = '';
  const done = () => { sheet.hidden = true; };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
  else sheet.addEventListener('transitionend', done, { once: true });
}

$('net-tabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-net]');
  if (!btn) return;
  socialNet = btn.dataset.net;
  renderNetTabs();
  renderSocialGrid();
});

$('social-grid')?.addEventListener('click', (e) => {
  const tile = e.target.closest('.social-post');
  if (!tile) return;
  openPostSheet((socialPosts[socialNet] || [])[Number(tile.dataset.idx)]);
});
$('social-grid')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const tile = e.target.closest && e.target.closest('.social-post');
  if (!tile) return;
  e.preventDefault();
  openPostSheet((socialPosts[socialNet] || [])[Number(tile.dataset.idx)]);
});
$('post-sheet-close')?.addEventListener('click', closePostSheet);
$('post-sheet')?.addEventListener('click', (e) => { if (e.target === $('post-sheet')) closePostSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePostSheet(); });

let socialResizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(socialResizeTimer);
  socialResizeTimer = setTimeout(() => {
    const grid = $('social-grid');
    if (!grid) return;
    const want = String(window.innerWidth <= 700 ? 3 : 4);
    if (grid.dataset.cols !== want) renderSocialGrid();
  }, 150);
}, { passive: true });

function renderFooter() {
  if ($('footer-based')) $('footer-based').textContent = copy[lang].based;
}

// Textos que sólo oyen los lectores de pantalla: el título oculto de la
// portada, los nombres de las ventanas emergentes y el encabezado de los
// canales de Contacto. Siguen al idioma de la página; no se ve nada.
function renderHiddenLabels() {
  const es = lang === 'es';
  const title = $('home-title');
  if (title) {
    title.textContent = es
      ? 'OPEN GRAIN — estudio de producción creativa en Mallorca'
      : 'OPEN GRAIN — creative production studio in Mallorca';
    title.removeAttribute('lang');
  }
  $('lightbox')?.setAttribute('aria-label', es ? 'Vista ampliada del proyecto' : 'Enlarged project view');
  $('lightbox-close')?.setAttribute('aria-label', es ? 'Cerrar' : 'Close');
  $('post-sheet')?.setAttribute('aria-label', es ? 'Publicación ampliada' : 'Enlarged post');
  $('post-sheet-close')?.setAttribute('aria-label', es ? 'Cerrar' : 'Close');
  if ($('contact-more-title')) {
    $('contact-more-title').textContent = es ? 'Otras formas de contactar' : 'Other ways to reach us';
  }
}

function renderAll() {
  // El idioma del documento tiene que acompañar al de la interfaz: de él
  // dependen los lectores de pantalla, la separación silábica y el corrector.
  document.documentElement.lang = lang;
  if (portfolioState === 'ready' && portfolioRawRows.length) applyRealProjects(portfolioRawRows, portfolioGroupRows);
  applyTheme();
  renderHomeGrid();
  renderWork();
  renderSiteCopy();
}

function renderSiteCopy() {
  renderNav();
  renderStatement();
  renderServices();
  renderStudio();
  renderContact();
  renderPortfolioContext();
  renderSocialLabels();
  renderFooter();
  renderHiddenLabels();
}

// El idioma es una elección de cada visitante y tiene que sobrevivir al paso
// de una página a otra, así que se guarda en el navegador.
//
// El tema ya no se elige: sigue la hora (noche de 20:00 a 7:00). Se borra la
// preferencia que guardaba el antiguo botón de tema, para que nadie se quede
// atascado en un tema que ya no puede cambiar.
try {
  const savedLang = localStorage.getItem('og_lang');
  if (savedLang === 'en' || savedLang === 'es') lang = savedLang;
  localStorage.removeItem('og_theme');
} catch (e) { /* private mode / blocked storage — fall back to defaults */ }

renderAll();

// ---------- Studio live preview bridge (postMessage) ----------
// When this page is loaded inside the Studio "Contenido del sitio" editor's
// preview iframe, studio.js posts { type:'og-preview', lang, fields,
// serviceList } on every edit. This merges those values into the in-memory
// `copy` object and re-renders — purely client-side, nothing is written to
// Supabase from here, so nothing is actually published until the admin
// clicks "Guardar y publicar" in Studio (which writes to site_content and
// this same page picks it up on its next real load via the fetch below).
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const msg = event.data;
  if (!msg || msg.type !== 'og-preview') return;
  if (msg.lang && copy[msg.lang]) {
    if (msg.fields) Object.assign(copy[msg.lang], msg.fields);
    if (msg.serviceCatalog) { try { applyServiceCatalog(msg.serviceCatalog); serviceCatalogReady=true;serviceCatalogState='ready';studioPreviewActive=true; } catch { return; } }
    lang = msg.lang;
    renderAll();
  }
});

// ---------- Supabase client ----------
const supabaseClient = (window.supabase && window.SUPABASE_URL && !window.SUPABASE_URL.includes('YOUR-PROJECT'))
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

// ---------- Editable site content overrides (Studio → Site content / AI assistant) ----------
// site_content stores one row per (key, lang). Whatever is saved there wins
// over the defaults in assets/default-copy.js — same graceful-fallback
// pattern as the portfolio/social fetches below.
function loadSiteContent() {
  if (studioPreviewActive || publicReads.has('catalog')) return;
  serviceCatalogReady = false; serviceCatalogState = 'loading';
  if ($('service')) $('service').disabled = true;
  renderServices(); renderContact();
  return loadPublicResource('catalog', signal => {
    if (!supabaseClient) throw new Error('Public backend unavailable');
    return supabaseClient.from('site_content').select('key, lang, value').abortSignal(signal);
  }, result => {
    if (studioPreviewActive) return;
    const data = publicRows(result);
    const catalog = window.OGServiceCatalog.fromRows(window.DEFAULT_COPY, data);
    data.forEach(row => {
      if (!copy[row.lang] || ['serviceList','serviceCatalog','studio_ai_enabled'].includes(row.key)) return;
      copy[row.lang][row.key] = row.value;
    });
    applyServiceCatalog(catalog);
    serviceCatalogReady = true; serviceCatalogState = 'ready';
    if ($('service')) $('service').disabled = false;
    renderSiteCopy();
  }, () => {
    if (studioPreviewActive) return;
    serviceCatalogReady=false;serviceCatalogState='error';renderServices();renderContact();
    if ($('service')) $('service').disabled = true;
  });
}
loadSiteContent();

// ---------- Contact form → Supabase `enquiries` ----------
// El controlador vive en assets/ux/og-contact.js: valida antes de enviar,
// escribe los errores junto a cada campo, lleva el foco al primero, desactiva
// el botón mientras envía y sólo da por buena la solicitud cuando Supabase
// confirma la escritura. Nada de alert(), y nada de enseñar al visitante
// mensajes internos o instrucciones de configuración.
const form = $('contact-form');
if (form && window.OGContact) {
  ogContactController = window.OGContact.install(form, {
    getLang: () => lang,
    requireMessage: true,
    // Sólo estas dos cadenas salen del contenido editable; los mensajes de
    // error los aporta el módulo, ya localizados.
    getLabels: () => ({ submit: copy[lang].start, success: copy[lang].sent }),
    send: async (payload, { consent }) => {
      if (!consent) throw new Error('Consent required');
      if (!supabaseClient) throw new Error('Contact backend unavailable');
      if (!serviceCatalogReady || !serviceLabel(payload.service)) throw new Error('Service catalogue unavailable');
      const contextParams=new URLSearchParams(location.search);
      const wantsPortfolio=contextParams.has('portfolio_photo')||contextParams.has('portfolio_group');
      if(wantsPortfolio && !form.portfolioContext)throw new Error('Portfolio reference unavailable');
      const row = {
        ...payload,
        portfolio_group_id:form.portfolioContext?.group_id || null,
        portfolio_project_id:form.portfolioContext?.photo_id || null,
        // Se guarda el nombre legible del servicio, no el identificador
        // interno que usa el <select> para sobrevivir a las traducciones.
        service: serviceLabel(payload.service),
        // «Todavía no lo sé» significa que no hay presupuesto que registrar.
        budget_range: payload.budget_range === BUDGET_UNDECIDED ? null : payload.budget_range,
        // Consentimiento obligatorio (verificado en navegador y servidor)
        consent_accepted: consent,
        consent_at: new Date().toISOString(),
      };
      const { error } = await supabaseClient.from('enquiries').insert(row);
      if (error) throw error;
    },
  });
  // La tarjeta sigue al desplegable en tiempo real.
  $('service')?.addEventListener('change', renderServiceCard);
  // Deja etiquetas y opciones en su sitio ahora que el controlador ya existe.
  renderContact();
}

// Real published projects replace the provisional ones everywhere they
// appear — the home grid and the Work page use the same source.
function applyRealProjects(rows, groups = []) {
  portfolioRawRows = rows; portfolioGroupRows = groups;
  const mapPhoto = (p, i) => ({
    id: p.id || String(i + 1).padStart(2, '0'), photoId:p.id || null, groupId:p.group_id || null,
    title:p.title, type:p.subtitle || '', image:p.cover_image_url || 'assets/portfolio/portrait-studio.jpg',
    ratio:p.layout_class || 'tall', ...(portfolioAssetMetadata[String(p.cover_image_url || '').replace(/^\//,'')] || {}),
  });
  const grouped = groups.length ? window.OGPortfolioGroups.publicGroups(groups, rows, lang) : rows.map(p=>({id:null,title:p.title,photos:[p]}));
  const mapped=grouped.map((g,i)=>{const photos=g.photos.map(mapPhoto);return {...photos[0],id:String(i+1).padStart(2,'0'),groupId:g.id,title:g.title,photos};});
  portfolioState='ready'; projects.length=0;projects.push(...mapped);
  renderHomeGrid();renderWork();renderPortfolioContext();
}
function renderPortfolioContext() {
  const form=$('contact-form');if(!form)return;
  let box=$('portfolio-context');
  if(!box){box=document.createElement('div');box.id='portfolio-context';box.className='portfolio-context';form.prepend(box);}
  const params=new URLSearchParams(location.search),photoId=params.get('portfolio_photo'),groupId=params.get('portfolio_group');
  if(!params.has('portfolio_photo')&&!params.has('portfolio_group')){box.hidden=true;form.portfolioContext=null;return;}
  const context=portfolioState==='ready'?window.OGPortfolioGroups.context(portfolioGroupRows,portfolioRawRows,groupId,photoId):null;
  box.hidden=false;box.replaceChildren();
  const text=document.createElement('span');text.textContent=portfolioState==='loading'?(lang==='es'?'Comprobando la selección del portfolio…':'Checking the portfolio selection…'):context?(lang==='es'?'Referencia seleccionada: ':'Selected reference: ')+context.title:(lang==='es'?'Esta referencia ya no está disponible. Puedes quitarla y enviar tu consulta.':'This reference is no longer available. Remove it to send your enquiry.');box.append(text);
  const remove=document.createElement('button');remove.type='button';remove.textContent=lang==='es'?'Quitar':'Remove';remove.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.delete('portfolio_photo');url.searchParams.delete('portfolio_group');history.replaceState(null,'',url);form.portfolioContext=null;box.hidden=true;});box.append(remove);form.portfolioContext=context;
}

// ---------- Current public records only; loading/empty/error are distinct ----------
function loadPortfolio() {
  if (publicReads.has('portfolio')) return;
  portfolioState = 'loading';
  renderHomeGrid(); renderWork(); renderPortfolioContext();
  return loadPublicResource('portfolio', signal => {
    if (!supabaseClient) throw new Error('Public backend unavailable');
    return Promise.all([
      supabaseClient.from('portfolio_projects').select('id, title, subtitle, cover_image_url, layout_class, sort_order, group_id, group_position, is_published').eq('is_published', true).order('sort_order').abortSignal(signal),
      supabaseClient.from('portfolio_groups').select('id,name,name_en,sort_order').order('sort_order').abortSignal(signal),
    ]);
  }, ([photos,groups]) => applyRealProjects(publicRows(photos),publicRows(groups)), () => {
    portfolioState = 'error'; projects.length = 0; portfolioRawRows=[]; portfolioGroupRows=[]; renderHomeGrid(); renderWork(); renderPortfolioContext();
  });
}
function loadSocial() {
  if (publicReads.has('social')) return;
  socialState = 'loading';
  // Keep a visible retry status while retrying, rather than hiding focused UI.
  const retry = document.querySelector('[data-public-retry="social"]');
  if (retry) { retry.disabled = true; retry.textContent = lang === 'es' ? 'Cargando…' : 'Loading…'; }
  return loadPublicResource('social', signal => {
    if (!supabaseClient) throw new Error('Public backend unavailable');
    return supabaseClient.from('social_posts')
      .select('platform, external_url, image_url, caption, sort_order')
      .eq('is_selected', true).order('sort_order').abortSignal(signal);
  }, result => { const rows = publicRows(result); socialState = 'ready'; applyRealSocial(rows); }, () => {
    socialState = 'error'; renderSocialGrid();
  });
}
// Keep keyboard retry focus in the same region while its contents are replaced.
// Completion restores it only if the visitor has not moved elsewhere meanwhile.
function retryPublicResource(button, loader) {
  const region = button.closest('#home-grid, #masonry-grid, #service-cards, #contact-form, #social-grid');
  const keepFocus = region && document.activeElement === button;
  const oldTabIndex = region?.getAttribute('tabindex');
  const operation = loader();
  if (!keepFocus || !operation) return;
  region.setAttribute('tabindex', '-1');
  region.focus({preventScroll:true});
  const restore = () => {
    if (document.activeElement === region) {
      const target = region.querySelector('[data-public-retry], #service:not(:disabled), [tabindex="0"], a[href], button:not(:disabled)');
      target?.focus({preventScroll:true});
    }
    if (oldTabIndex === null) region.removeAttribute('tabindex');
    else region.setAttribute('tabindex', oldTabIndex);
  };
  operation.then(restore, restore);
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-public-retry]');
  if (!button || button.disabled || publicReads.has(button.dataset.publicRetry)) return;
  const loaders = { portfolio: loadPortfolio, catalog: loadSiteContent, social: loadSocial };
  const loader = loaders[button.dataset.publicRetry];
  if (loader) retryPublicResource(button, loader);
});
loadPortfolio();
loadSocial();

function applyRealSocial(rows) {
  const next = { tiktok: [], instagram: [], youtube: [] };
  rows.forEach(r => {
    const net = next[r.platform] ? r.platform : 'instagram';
    if (next[net].length < SOCIAL_MAX) next[net].push({ ...r, platform: net });
  });
  socialPosts = next;
  // Land on a network that actually has something to show.
  if (!socialPosts[socialNet].length) {
    const firstFilled = NETWORKS.map(n => n[0]).find(n => socialPosts[n].length);
    if (firstFilled) socialNet = firstFilled;
  }
  renderNetTabs();
  renderSocialGrid();
}

// Nothing selected in Studio yet: show Adama's own photographs as stand-ins
// so the section isn't empty, each linking to the real profile rather than a
// dead click. Replaced the moment he selects actual posts.
// Antes existía aquí renderProvisionalSocial(): rellenaba TikTok, Instagram y
// YouTube con fotografías del portfolio, les ponía un icono de reproducción y
// enlazaba la pestaña de YouTube al perfil de Instagram. Eran publicaciones que
// no existen. Se ha retirado: las pestañas siguen, y cada red enseña sus
// publicaciones reales o dice con claridad que aún no hay.

// ============================================================
// Vista ampliada del portfolio
// Mismo aspecto que antes; lo que cambia es que ahora se comporta como un
// diálogo de verdad: mientras está abierta el resto de la página queda inerte,
// el foco no se escapa con el tabulador, Escape cierra y el foco vuelve a la
// foto desde la que se abrió.
// ============================================================
// Decode before replacing a visible photo. A failed/slow request leaves it intact.
function preparePortfolioImage(url, ready, failed = () => {}, sizes = null) {
  const image = new Image(); let done = false;
  const finish = ok => { if(done)return;done=true;clearTimeout(timer);image.onload=image.onerror=null;if(ok)ready({width:image.naturalWidth,height:image.naturalHeight,element:image});else failed(); };
  const timer=setTimeout(()=>finish(false),12000);
  image.onload=()=>{if(typeof image.decode==='function')image.decode().then(()=>finish(true),()=>finish(false));else finish(true);};
  image.onerror=()=>finish(false);
  const local=sizes&&LOCAL_PHOTO.exec(String(url||'').replace(/^\//,''));
  if(local){const base='/assets/portfolio/'+local[1];image.sizes=sizes;image.srcset=base+'-480.webp 480w, '+base+'-960.webp 960w';}
  image.src=url;
}
let portfolioRotationPaused = false;
(function initLightbox() {
  const lightbox=$('lightbox');if(!lightbox)return;
  const imgEl=$('lightbox-img'),titleEl=$('lightbox-title'),eyebrowEl=$('lightbox-eyebrow'),closeBtn=$('lightbox-close'),shell=$('site-shell');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let lastFocused=null,currentGroup=null,index=0,epoch=0,touch=null,previousOverflow='',photoRequest=0,displayedIndex=0;
  const controls=document.createElement('div');controls.className='portfolio-gallery-controls';
  const prev=document.createElement('button'),next=document.createElement('button'),count=document.createElement('span'),contact=document.createElement('a'),pause=document.createElement('button');
  prev.type=next.type=pause.type='button';prev.textContent='←';next.textContent='→';count.setAttribute('aria-live','polite');contact.className='portfolio-gallery-contact';
  controls.append(prev,count,next,contact,pause);lightbox.querySelector('figure').append(controls);
  function showPhoto(){
    const photos=currentGroup.photos?.length?currentGroup.photos:[currentGroup];index=(index+photos.length)%photos.length;const photo=photos[index];
    const request=++photoRequest;
    imgEl.setAttribute('aria-busy','true');contact.setAttribute('aria-disabled','true');
    preparePortfolioImage(photo.image,dimensions=>{
      if(request!==photoRequest||lightbox.hidden)return;
      imgEl.width=dimensions.width;imgEl.height=dimensions.height;imgEl.src=photo.image;imgEl.alt=photoAlt(photo);imgEl.draggable=false;imgEl.setAttribute('aria-busy','false');contact.setAttribute('aria-disabled','false');
      displayedIndex=index;updatePhotoDetails(photo,photos);
    },()=>{if(request===photoRequest){index=displayedIndex;contact.setAttribute('aria-disabled','false');imgEl.setAttribute('aria-busy','false');count.textContent=lang==='es'?'No se pudo cargar esta foto. Prueba otra.':'This photo could not load. Try another.';}});
  }
  function updatePhotoDetails(photo,photos){
    titleEl.textContent=currentGroup.title;eyebrowEl.textContent=photo.title;
    count.textContent=`${index+1} / ${photos.length}`;prev.hidden=next.hidden=photos.length<2;
    prev.setAttribute('aria-label',lang==='es'?'Foto anterior':'Previous photo');next.setAttribute('aria-label',lang==='es'?'Foto siguiente':'Next photo');
    contact.textContent=lang==='es'?'Consultar sobre estas fotos':'Enquire about these photos';
    const params=new URLSearchParams();if(photo.photoId)params.set('portfolio_photo',photo.photoId);if(currentGroup.groupId)params.set('portfolio_group',currentGroup.groupId);
    contact.href='/contact'+(params.size?'?'+params.toString():'');contact.hidden=!photo.photoId;
    pause.textContent=portfolioRotationPaused?(lang==='es'?'Reanudar portadas':'Resume covers'):(lang==='es'?'Pausar portadas':'Pause covers');pause.setAttribute('aria-pressed',String(portfolioRotationPaused));
  }
  function openFromTile(tile){
    currentGroup=projects.find(p=>(p.groupId||p.photoId||p.id)===tile.dataset.portfolioKey);if(!currentGroup)return;
    epoch++;lastFocused=tile.getAttribute('aria-hidden')==='true'?document.querySelector('.project-tile[data-portfolio-key="'+tile.dataset.portfolioKey+'"]:not([aria-hidden])'):tile;index=Number(tile.dataset.photoIndex)||0;displayedIndex=index;
    const photos=currentGroup.photos?.length?currentGroup.photos:[currentGroup],cover=tile.querySelector('img'),photo=photos[index];
    imgEl.src=cover?.currentSrc||cover?.src||photo.image;imgEl.alt=photoAlt(photo);if(cover?.naturalWidth){imgEl.width=cover.naturalWidth;imgEl.height=cover.naturalHeight;}updatePhotoDetails(photo,photos);
    previousOverflow=document.body.style.overflow;lightbox.hidden=false;document.documentElement.classList.add('portfolio-viewer-open');showPhoto();document.body.style.overflow='hidden';if(shell)shell.inert=true;
    requestAnimationFrame(()=>lightbox.classList.add('is-open'));closeBtn.focus();
  }
  function close(){if(lightbox.hidden)return;photoRequest++;document.documentElement.classList.remove('portfolio-viewer-open');const closing=++epoch;lightbox.classList.remove('is-open');document.body.style.overflow=previousOverflow;if(shell)shell.inert=false;
    const done=()=>{if(epoch===closing)lightbox.hidden=true;};if(reduced.matches)done();else setTimeout(done,400);
    if(lastFocused?.isConnected)lastFocused.focus({preventScroll:true});
  }
  function move(delta){index+=delta;showPhoto();}
  prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));pause.addEventListener('click',()=>{portfolioRotationPaused=!portfolioRotationPaused;pause.textContent=portfolioRotationPaused?(lang==='es'?'Reanudar portadas':'Resume covers'):(lang==='es'?'Pausar portadas':'Pause covers');pause.setAttribute('aria-pressed',String(portfolioRotationPaused));});
  contact.addEventListener('click',event=>{if(contact.getAttribute('aria-disabled')==='true')event.preventDefault();});
  document.addEventListener('click',e=>{const tile=e.target.closest('.project-tile');if(tile)openFromTile(tile);});
  document.addEventListener('keydown',e=>{const tile=e.target.closest?.('.project-tile');if(tile&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openFromTile(tile);}if(!lightbox.hidden&&e.key==='Escape'){e.preventDefault();close();}});
  closeBtn.addEventListener('click',close);lightbox.addEventListener('click',e=>{if(e.target===lightbox)close();});
  lightbox.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key!=='Tab')return;const items=[...lightbox.querySelectorAll('button,a[href]')].filter(el=>!el.hidden&&el.offsetParent!==null);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  imgEl.addEventListener('touchstart',e=>{touch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
  imgEl.addEventListener('touchend',e=>{if(!touch||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)move(dx<0?1:-1);},{passive:true});
  imgEl.addEventListener('touchcancel',()=>{touch=null;});
})();

(function rotatePortfolioCovers(){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let cursor=0,interactionUntil=0,touchActive=false,preparing=false;
  const pauseForInteraction=()=>{interactionUntil=Date.now()+1500;};
  document.addEventListener('touchstart',()=>{touchActive=true;pauseForInteraction();},{passive:true});
  for(const name of ['touchend','touchcancel'])document.addEventListener(name,event=>{touchActive=!!event.touches?.length;pauseForInteraction();},{passive:true});
  for(const name of ['scroll','resize','pointerdown'])window.addEventListener(name,pauseForInteraction,{passive:true});
  function canRotate(tile){if(document.hidden||touchActive||Date.now()<interactionUntil||reduced.matches||portfolioRotationPaused||navigator.connection?.saveData||!$('lightbox')?.hidden||!tile.isConnected||tile.matches(':hover,:focus-within'))return false;const r=tile.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
  setInterval(()=>{
    if(preparing)return;
    const tiles=[...document.querySelectorAll('.project-tile[data-portfolio-key]')].filter(tile=>canRotate(tile));if(!tiles.length)return;
    for(let n=0;n<tiles.length;n++){
      const tile=tiles[(cursor+n)%tiles.length],group=projects.find(p=>(p.groupId||p.photoId||p.id)===tile.dataset.portfolioKey);
      if(!group?.photos||group.photos.length<2||tile.dataset.preparingPhoto||Date.now()-Number(tile.dataset.lastRotation||0)<6500)continue;
      cursor=(cursor+n+1)%tiles.length;const previous=Number(tile.dataset.photoIndex)||0,index=(previous+1)%group.photos.length,photo=group.photos[index];
      tile.dataset.lastRotation=String(Date.now());tile.dataset.preparingPhoto='true';preparing=true;
      preparePortfolioImage(photo.image,prepared=>{
        delete tile.dataset.preparingPhoto;preparing=false;
        if(!canRotate(tile)||(Number(tile.dataset.photoIndex)||0)!==previous)return;
        const old=tile.querySelector('picture')||tile.querySelector('img');if(!old)return;
        // No fade-to-empty: the replacement is already decoded and geometry stays fixed.
        prepared.element.alt=tile.getAttribute('aria-hidden')==='true'?'':photoAlt(photo);prepared.element.decoding='sync';
        const picture=document.createElement('picture');picture.append(prepared.element);old.replaceWith(picture);
        tile.dataset.photoIndex=String(index);tile.dataset.lightboxImage=photo.image;tile.dataset.lightboxAlt=photoAlt(photo);if(tile.getAttribute('aria-hidden')!=='true')tile.setAttribute('aria-label',tileLabel({...photo,title:group.title}));
      },()=>{delete tile.dataset.preparingPhoto;preparing=false;},tile.closest('#home-grid')?SIZES_HOME:SIZES_WORK);
      break;
    }
  },2300);
})();

// ============================================================
// Cookie consent + Google Analytics (only loads after "Aceptar")
// See cookies.html for the full policy. Choice is stored in
// localStorage on the visitor's own browser — nothing is sent
// anywhere until they accept.
// ============================================================
const CONSENT_KEY = 'og_cookie_consent'; // 'accepted' | 'rejected'

function loadGoogleAnalytics() {
  const id = window.GA_MEASUREMENT_ID;
  if (!id || id.includes('XXXXXXXXXX')) return; // no real GA property yet
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id, { anonymize_ip: true });
}

// El acceso a localStorage falla en modo privado y con el almacenamiento
// bloqueado. Antes eso hacía estallar el aviso de cookies entero.
function readConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
}
function writeConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, value); } catch (e) { /* sesión sin almacenamiento */ }
}

function initCookieBanner() {
  const consent = readConsent();
  if (consent === 'accepted') { loadGoogleAnalytics(); return; }
  if (consent === 'rejected') return;

  const isEs = lang === 'es';
  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = `
    <p>${isEs
      ? 'Usamos cookies analíticas solo si las aceptas. Más info en nuestra'
      : 'We use analytics cookies only if you accept them. More info in our'}
      <a href="/cookies">${isEs ? 'Política de Cookies' : 'Cookie Policy'}</a>.</p>
    <div>
      <button type="button" id="cookie-reject">${isEs ? 'Rechazar' : 'Reject'}</button>
      <button type="button" id="cookie-accept">${isEs ? 'Aceptar' : 'Accept'}</button>
    </div>`;
  document.body.appendChild(banner);
  document.getElementById('cookie-accept').addEventListener('click', () => {
    writeConsent('accepted');
    loadGoogleAnalytics();
    banner.remove();
  });
  document.getElementById('cookie-reject').addEventListener('click', () => {
    writeConsent('rejected');
    banner.remove();
  });
}
initCookieBanner();
