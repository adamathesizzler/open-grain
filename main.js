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
// One image per service, in the same order as copy[].serviceList
// (Photography, Film & Reels, UGC, Events, Social Content).
const serviceImages = [
  'assets/portfolio/portrait-studio.jpg',
  'assets/portfolio/halo-detail.jpg',
  'assets/portfolio/nightlife-cheers.jpg',
  'assets/portfolio/nightlife-crew.jpg',
  'assets/portfolio/shibuya.jpg',
];

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
    viewService: 'View service',
    start: 'Send request', sent: 'Request sent. We’ll be in touch soon.',
    social: 'Latest from the studio',
    fName: 'Name', fPhone: 'Phone', fService: 'Service', fServicePh: 'Choose a service',
    fDate: 'Preferred date', fBudget: 'Approx. budget', fMessage: 'Tell us about your idea',
    fMessagePh: 'Project, location, references…',
    fConsent: 'I have read and accept the <a href="privacidad.html" target="_blank" rel="noopener">Privacy Policy</a>.',
  },
  es: {
    work: 'Proyectos', services: 'Servicios', studio: 'Estudio', contact: 'Contacto',
    ...defaults.es,
    selected: 'Trabajos seleccionados',
    viewService: 'Ver servicio',
    start: 'Enviar solicitud', sent: 'Solicitud enviada. Os responderemos pronto.',
    social: 'Lo último del estudio',
    fName: 'Nombre', fPhone: 'Teléfono', fService: 'Servicio', fServicePh: 'Selecciona un servicio',
    fDate: 'Fecha aproximada', fBudget: 'Presupuesto aproximado', fMessage: 'Cuéntanos tu idea',
    fMessagePh: 'Proyecto, lugar, referencias…',
    fConsent: 'He leído y acepto la <a href="privacidad.html" target="_blank" rel="noopener">Política de Privacidad</a>.',
  },
};

let lang = 'en';
let dark = (() => { const h = new Date().getHours(); return h < 7 || h >= 20; })();

// Se declaran aquí, antes de la primera llamada a renderAll(), porque
// renderContact() los usa.
let ogContactController = null;

const shell = $('site-shell');

function applyTheme() {
  if (shell) shell.classList.toggle('dark-mode', dark);
}

const svg = (d) => `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const NAV_PAGES = [
  ['index.html', 'home'],
  ['work.html', 'work'],
  ['services.html', 'services'],
  ['about.html', 'studio'],
  ['contact.html', 'contact'],
];

// La navegación es un único componente compartido por las cinco páginas:
// assets/ux/og-notch.js monta el notch sobre #dock y se encarga del recorrido
// arriba → derecha, del hover, del toque y del teclado. Aquí sólo le pasamos
// los datos (idioma, tema y enlaces) y él actualiza sus nodos sin rehacer el
// DOM, así no se pierde el foco al cambiar de idioma.
//
// Si el script no llega a ejecutarse, el <nav> conserva sus enlaces HTML de
// respaldo y la web se sigue pudiendo navegar.
//
// La página activa la detecta el componente normalizando la ruta, de modo que
// /work y /work.html cuentan como la misma página.
function renderNav() {
  const dock = $('dock');
  if (!dock || !window.OGNotch) return;
  const t = copy[lang];
  window.OGNotch.mount(dock, {
    lang,
    dark,
    items: NAV_PAGES.map(([href, key]) => ({
      key,
      href,
      label: key === 'home' ? (lang === 'es' ? 'Inicio' : 'Home') : t[key],
    })),
  });
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
  const repeatAttrs = isRepeat ? ' aria-hidden="true" tabindex="-1"' : ' tabindex="0"';
  return `
    <figure class="project-tile"${repeatAttrs} data-lightbox-image="${attrEscape(p.image)}" data-lightbox-title="${attrEscape(p.title)}" data-lightbox-eyebrow="${attrEscape(p.type)}" style="--i:${i};aspect-ratio:${(1 / ar).toFixed(4)}">
      <img src="${p.image}" alt="${isRepeat ? '' : attrEscape(p.title) + ' — ' + attrEscape(p.type)}" loading="${!isRepeat && i < 6 ? 'eager' : 'lazy'}">
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
let homeResizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(homeResizeTimer);
  homeResizeTimer = setTimeout(() => {
    const grid = $('home-grid');
    if (!grid) return;
    if (grid.dataset.cols !== String(homeColumnCount())) renderHomeGrid();
    else fillHomeViewport();
  }, 150);
}, { passive: true });

function attrEscape(str) { return String(str ?? '').replace(/"/g, '&quot;'); }

function renderWork() {
  const grid = $('masonry-grid');
  if (!grid) return;
  const t = copy[lang];
  if ($('work-label')) $('work-label').textContent = t.selected;
  if ($('work-lede')) $('work-lede').textContent = t.workBlurb;
  grid.innerHTML = projects.map(p => `
    <article class="project-tile ${p.ratio}" tabindex="0" data-lightbox-image="${attrEscape(p.image)}" data-lightbox-title="${attrEscape(p.title)}" data-lightbox-eyebrow="${attrEscape(p.type)}">
      <img src="${p.image}" alt="${p.title} — ${p.type}">
      <div><span>/ ${p.id}</span><h3>${p.title}</h3><p>${p.type}</p></div>
    </article>`).join('');
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
    cards.innerHTML = cards.tagName === 'OL'
      ? t.serviceList.map(s => `<li><span>${attrEscape(s)}</span></li>`).join('')
      : t.serviceList.map((s, i) => `
        <article>
          <span>0${i + 1}</span>
          <img src="${serviceImages[i % serviceImages.length]}" alt="">
          <div><h3>${s}</h3><p>${t.viewService} →</p></div>
        </article>`).join('');
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
  const t = copy[lang];
  const card = (s, i, dup) => `
    <figure class="svc-card"${dup ? ' aria-hidden="true"' : ''}>
      <img src="${serviceImages[i % serviceImages.length]}" alt="">
      <figcaption><span>0${i + 1}</span>${attrEscape(s)}</figcaption>
    </figure>`;
  const pass = (dup) => t.serviceList.map((s, i) => card(s, i, dup)).join('');
  el.innerHTML = `<div class="marquee-track">${pass(false)}${pass(true)}</div>`;
}

function renderStudio() {
  if (!$('studio-heading')) return;
  const t = copy[lang];
  if ($('studio-label')) $('studio-label').textContent = t.studio;
  $('studio-heading').textContent = t.about;
  $('studio-body').textContent = t.aboutBody;
  if ($('studio-tag')) $('studio-tag').textContent = t.studioTag;
}

// El identificador de un servicio es su posición en el catálogo, no su texto
// traducido: así la selección sobrevive a cambiar de ES a EN. La etiqueta
// legible se resuelve otra vez al enviar (ver serviceLabel), de modo que en
// Studio se sigue guardando el nombre del servicio, igual que antes, y no un
// código interno. Visualmente el desplegable es idéntico.
const SERVICE_VALUE = (i) => `svc-${i}`;
const BUDGET_UNDECIDED = 'undecided';

function serviceLabel(value) {
  const match = /^svc-(\d+)$/.exec(String(value || ''));
  if (!match) return null;
  return copy[lang].serviceList?.[Number(match[1])] ?? null;
}

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

  // setOptions conserva la selección mientras su valor siga existiendo, y
  // nunca reordena por selectedIndex.
  const service = $('service');
  const chosenService = service?.value || '';
  window.OGContact?.setOptions(
    service,
    (t.serviceList || []).map((label, i) => ({ value: SERVICE_VALUE(i), label })),
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
  }

  window.OGContact?.setOptions($('budget'), [
    { value: BUDGET_UNDECIDED, label: es ? 'Todavía no lo sé' : 'Not sure yet' },
    { value: '€500–1,000', label: '€500–1,000' },
    { value: '€1,000–2,500', label: '€1,000–2,500' },
    { value: '€2,500+', label: '€2,500+' },
  ], '€');

  // La flecha se conserva; el texto vive en su propio span para que el
  // controlador pueda cambiarlo a «Enviando…» sin borrar el icono.
  $('submit-btn').innerHTML = `<span data-og-label>${attrEscape(t.start)}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
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

function renderNetTabs() {
  const tabs = $('net-tabs');
  if (!tabs) return;
  tabs.innerHTML = NETWORKS.map(([id, label, icon]) => `
    <button class="net-tab" type="button" role="tab" data-net="${id}"
            aria-selected="${id === socialNet}">${svg(icon)}${label}</button>`).join('');
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
      <figure class="social-post" tabindex="0" data-idx="${i}"
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

function renderAll() {
  // El idioma del documento tiene que acompañar al de la interfaz: de él
  // dependen los lectores de pantalla, la separación silábica y el corrector.
  document.documentElement.lang = lang;
  applyTheme();
  renderNav();
  renderHomeGrid();
  renderWork();
  renderStatement();
  renderServices();
  renderStudio();
  renderContact();
  renderSocialLabels();
  renderFooter();
}

// Language and theme are per-visitor choices that must survive navigating
// between pages now that the site is multi-page, so they persist locally.
try {
  const savedLang = localStorage.getItem('og_lang');
  if (savedLang === 'en' || savedLang === 'es') lang = savedLang;
  const savedTheme = localStorage.getItem('og_theme');
  if (savedTheme === 'dark' || savedTheme === 'light') dark = savedTheme === 'dark';
} catch (e) { /* private mode / blocked storage — fall back to defaults */ }

// Delegated, because renderNav() rebuilds the dock's markup whenever the
// language or theme changes — listeners bound to the old buttons would die
// with them.
$('dock')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  if (btn.dataset.action === 'lang') {
    lang = lang === 'en' ? 'es' : 'en';
    try { localStorage.setItem('og_lang', lang); } catch (err) { /* ignore */ }
    renderAll();
  } else if (btn.dataset.action === 'theme') {
    dark = !dark;
    try { localStorage.setItem('og_theme', dark ? 'dark' : 'light'); } catch (err) { /* ignore */ }
    applyTheme();
    renderNav();
  }
});

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
    if (Array.isArray(msg.serviceList) && msg.serviceList.length) copy[msg.lang].serviceList = msg.serviceList;
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
if (supabaseClient) {
  supabaseClient
    .from('site_content')
    .select('key, lang, value')
    .then(({ data }) => {
      if (!data || !data.length) return;
      let changed = false;
      data.forEach(row => {
        if (!copy[row.lang]) return;
        if (row.key === 'serviceList') {
          try {
            const list = JSON.parse(row.value);
            if (Array.isArray(list) && list.length) { copy[row.lang].serviceList = list; changed = true; }
          } catch (e) { /* ignore malformed override */ }
        } else {
          copy[row.lang][row.key] = row.value;
          changed = true;
        }
      });
      if (changed) renderAll();
    })
    .catch(() => {});
}

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
      const row = {
        ...payload,
        // Se guarda el nombre legible del servicio, no el identificador
        // interno que usa el <select> para sobrevivir a las traducciones.
        service: serviceLabel(payload.service),
        // «Todavía no lo sé» significa que no hay presupuesto que registrar.
        budget_range: payload.budget_range === BUDGET_UNDECIDED ? null : payload.budget_range,
      };
      const { error } = await supabaseClient.from('enquiries').insert(row);
      if (error) throw error;
    },
  });
  // Deja etiquetas y opciones en su sitio ahora que el controlador ya existe.
  renderContact();
}

// Real published projects replace the provisional ones everywhere they
// appear — the home grid and the Work page use the same source.
function applyRealProjects(rows) {
  const fallbackRatios = ['tall', 'wide', 'square', 'tall crop-two', 'wide crop-two', 'square crop-two'];
  const mapped = rows.map((p, i) => ({
    id: String(i + 1).padStart(2, '0'),
    title: p.title,
    type: p.subtitle || '',
    image: p.cover_image_url || 'assets/portfolio/portrait-studio.jpg',
    ratio: p.layout_class || fallbackRatios[i % fallbackRatios.length],
  }));
  projects.length = 0;
  projects.push(...mapped);
  renderHomeGrid();
  renderWork();
}

// ---------- Real portfolio (Supabase) with graceful fallback ----------
// The public work grid shows the provisional projects above by default —
// exactly like the real site — but switches to Adama's real published
// projects the moment he adds any from Studio → Portfolio.
if (supabaseClient) {
  supabaseClient
    .from('portfolio_projects')
    .select('title, subtitle, cover_image_url, layout_class, sort_order')
    .eq('is_published', true)
    .order('sort_order')
    .then(({ data }) => {
      if (data && data.length) applyRealProjects(data);
    })
    .catch(() => {});

  // Real selected social posts, same graceful fallback as portfolio.
  // Grouped by network, capped at SOCIAL_MAX each, in Studio's sort order.
  supabaseClient
    .from('social_posts')
    .select('platform, external_url, image_url, caption, sort_order')
    .eq('is_selected', true)
    .order('sort_order')
    .then(({ data }) => {
      if (data && data.length) applyRealSocial(data);
      else renderSocialGrid();
    })
    .catch(() => renderSocialGrid());
} else {
  renderSocialGrid();
}

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
(function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  const imgEl = document.getElementById('lightbox-img');
  const titleEl = document.getElementById('lightbox-title');
  const eyebrowEl = document.getElementById('lightbox-eyebrow');
  const closeBtn = document.getElementById('lightbox-close');
  const shell = document.getElementById('site-shell');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let lastFocused = null;

  function openFromTile(tile) {
    const image = tile.dataset.lightboxImage;
    if (!image) return;
    lastFocused = document.activeElement;
    imgEl.src = image;
    // El texto alternativo describe la foto; el título por sí solo no basta.
    imgEl.alt = [tile.dataset.lightboxTitle, tile.dataset.lightboxEyebrow].filter(Boolean).join(' — ');
    titleEl.textContent = tile.dataset.lightboxTitle || '';
    eyebrowEl.textContent = tile.dataset.lightboxEyebrow || '';
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    // El fondo deja de ser alcanzable: ni con el ratón ni con el tabulador.
    if (shell) shell.inert = true;
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    closeBtn.focus();
  }

  function close() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    if (shell) shell.inert = false;
    // Se oculta al acabar la transición, pero con un plazo de seguridad: si
    // transitionend no llega (transición cancelada, pestaña en segundo plano),
    // la capa se quedaría encima de la página y la dejaría inutilizable.
    let closed = false;
    const done = () => { if (!closed) { closed = true; lightbox.hidden = true; } };
    if (reduced.matches) done();
    else {
      lightbox.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 400);
    }
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }

  // Delegado: las piezas se vuelven a pintar cuando llegan los proyectos
  // reales de Supabase, así que se escucha en el documento y no en cada una.
  document.addEventListener('click', (e) => {
    const tile = e.target.closest('.project-tile');
    if (tile) openFromTile(tile);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tile = e.target.closest && e.target.closest('.project-tile');
    if (tile) { e.preventDefault(); openFromTile(tile); }
  });

  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

  // Trampa de foco: el tabulador da la vuelta dentro del diálogo.
  lightbox.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = [...lightbox.querySelectorAll('button, a[href]')]
      .filter(el => !el.hidden && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) close();
  });
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
      <a href="cookies.html">${isEs ? 'Política de Cookies' : 'Cookie Policy'}</a>.</p>
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
