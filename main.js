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
let menuOpen = false;

const shell = $('site-shell');

function applyTheme() {
  if (shell) shell.classList.toggle('dark-mode', dark);
  if ($('icon-sun')) $('icon-sun').hidden = dark;
  if ($('icon-moon')) $('icon-moon').hidden = !dark;
}

// The nav now links to real pages instead of in-page anchors: the home is
// only the work grid, and every other section lives on its own page.
const NAV_PAGES = [
  ['work.html', 'work'],
  ['services.html', 'services'],
  ['about.html', 'studio'],
  ['contact.html', 'contact'],
];

function currentPage() {
  const file = window.location.pathname.split('/').pop();
  return file === '' ? 'index.html' : file;
}

function renderNav() {
  const t = copy[lang];
  const here = currentPage();
  const markup = NAV_PAGES.map(([href, key]) => {
    const active = href === here ? ' aria-current="page"' : '';
    return `<a href="${href}"${active}>${t[key]}</a>`;
  }).join('');

  if ($('nav-links')) $('nav-links').innerHTML = markup;
  const mobileMenu = $('mobile-menu');
  if (mobileMenu) {
    mobileMenu.innerHTML = markup;
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  }
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
  if (!$('statement-heading')) return;
  const t = copy[lang];
  $('statement-heading').textContent = t.intro;
  $('statement-body').textContent = t.introBody;
}

function renderServices() {
  const t = copy[lang];
  if ($('services-label')) $('services-label').textContent = t.capabilities;
  if ($('services-heading')) $('services-heading').textContent = t.capabilities;

  if ($('service-cards')) {
    $('service-cards').innerHTML = t.serviceList.map((s, i) => `
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

function renderContact() {
  if (!$('contact-form')) return;
  const t = copy[lang];
  if ($('contact-heading')) $('contact-heading').textContent = t.cta;
  if ($('contact-lede')) $('contact-lede').textContent = t.ctaLede;
  $('label-name').firstChild.textContent = t.fName;
  $('label-phone').firstChild.textContent = t.fPhone;
  $('label-service').firstChild.textContent = t.fService;
  $('label-date').firstChild.textContent = t.fDate;
  $('label-budget').firstChild.textContent = t.fBudget;
  $('label-message').firstChild.textContent = t.fMessage;
  $('message').placeholder = t.fMessagePh;
  $('label-consent').innerHTML = t.fConsent;

  $('service').innerHTML = `<option value="" disabled selected>${t.fServicePh}</option>` +
    t.serviceList.map(s => `<option>${s}</option>`).join('');

  $('budget').innerHTML = `<option value="" disabled selected>€</option>
    <option>€500–1,000</option><option>€1,000–2,500</option><option>€2,500+</option>`;

  $('submit-btn').innerHTML = `${t.start}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
}

function renderSocialLabels() {
  if (!$('social-label')) return;
  const t = copy[lang];
  $('social-label').textContent = t.social;
  $('social-lede').textContent = t.socialLede;
}

function renderFooter() {
  if ($('footer-based')) $('footer-based').textContent = copy[lang].based;
}

function renderAll() {
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

function setMenu(open) {
  menuOpen = open;
  if ($('mobile-menu')) $('mobile-menu').hidden = !open;
  if ($('menu-toggle')) $('menu-toggle').setAttribute('aria-expanded', String(open));
  if ($('icon-menu')) $('icon-menu').hidden = open;
  if ($('icon-close')) $('icon-close').hidden = !open;
}

// Language and theme are per-visitor choices that must survive navigating
// between pages now that the site is multi-page, so they persist locally.
try {
  const savedLang = localStorage.getItem('og_lang');
  if (savedLang === 'en' || savedLang === 'es') lang = savedLang;
  const savedTheme = localStorage.getItem('og_theme');
  if (savedTheme === 'dark' || savedTheme === 'light') dark = savedTheme === 'dark';
} catch (e) { /* private mode / blocked storage — fall back to defaults */ }

if ($('lang-label')) $('lang-label').textContent = lang.toUpperCase();

$('menu-toggle')?.addEventListener('click', () => setMenu(!menuOpen));
$('lang-toggle')?.addEventListener('click', () => {
  lang = lang === 'en' ? 'es' : 'en';
  if ($('lang-label')) $('lang-label').textContent = lang.toUpperCase();
  try { localStorage.setItem('og_lang', lang); } catch (e) { /* ignore */ }
  renderAll();
});
$('theme-toggle')?.addEventListener('click', () => {
  dark = !dark;
  try { localStorage.setItem('og_theme', dark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
  applyTheme();
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
    if ($('lang-label')) $('lang-label').textContent = lang.toUpperCase();
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
const form = $('contact-form');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim() || null,
    service: document.getElementById('service').value || null,
    preferred_date: document.getElementById('date').value || null,
    budget_range: document.getElementById('budget').value || null,
    message: document.getElementById('message').value.trim() || null,
  };

  if (!supabaseClient) {
    alert('Form not connected yet — add your Supabase project details to assets/config.js.');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const { error } = await supabaseClient.from('enquiries').insert(payload);
  submitBtn.disabled = false;

  if (error) {
    console.error(error);
    alert('Something went wrong — please email adamabalde1998@gmail.com directly.');
    return;
  }
  form.hidden = true;
  const success = $('form-success');
  success.textContent = copy[lang].sent;
  success.hidden = false;
});

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
  supabaseClient
    .from('social_posts')
    .select('platform, external_url, image_url, caption, sort_order')
    .eq('is_selected', true)
    .order('sort_order')
    .then(({ data }) => {
      const grid = $('social-grid');
      if (!grid) return;
      if (data && data.length) {
        grid.innerHTML = data.map(p => `
          <a class="social-post" href="${p.external_url}" target="_blank" rel="noopener">
            <img src="${p.image_url || 'assets/portfolio/portrait-studio.jpg'}" alt="${p.caption || ''}">
            <span>${p.platform === 'instagram' ? '@ Instagram' : '♪ TikTok'}</span>
          </a>`).join('');
      } else {
        renderProvisionalSocial(grid);
      }
    })
    .catch(() => renderProvisionalSocial($('social-grid')));
} else {
  renderProvisionalSocial($('social-grid'));
}

function renderProvisionalSocial(grid) {
  if (!grid) return;
  // No real posts selected yet in Studio — link each placeholder to the
  // real profile (not a dead "#") so it isn't a dead click even before
  // Adama adds actual selected posts.
  grid.innerHTML = projects.slice(0, 6).map((p, i) => {
    const isInsta = i < 3;
    const href = isInsta ? 'https://instagram.com/opengrain.studio' : 'https://tiktok.com/@opengrain.studio';
    return `
    <a class="social-post" href="${href}" target="_blank" rel="noopener">
      <img src="${p.image}" alt="Selected social post">
      <span>${isInsta ? '@ Instagram' : '♪ TikTok'}</span>
    </a>`;
  }).join('');
}

// ============================================================
// Portfolio lightbox — clicking a project tile used to do nothing
// (the tile had hover/press feedback implying it was clickable, but
// no click handler at all). This opens the project's photo larger,
// with its title, in a simple dependency-free overlay.
// ============================================================
(function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  const imgEl = document.getElementById('lightbox-img');
  const titleEl = document.getElementById('lightbox-title');
  const eyebrowEl = document.getElementById('lightbox-eyebrow');
  const closeBtn = document.getElementById('lightbox-close');
  let lastFocused = null;

  function openFromTile(tile) {
    const image = tile.dataset.lightboxImage;
    if (!image) return;
    lastFocused = document.activeElement;
    imgEl.src = image;
    imgEl.alt = tile.dataset.lightboxTitle || '';
    titleEl.textContent = tile.dataset.lightboxTitle || '';
    eyebrowEl.textContent = tile.dataset.lightboxEyebrow || '';
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    closeBtn.focus();
  }

  function close() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    const done = () => { lightbox.hidden = true; };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else lightbox.addEventListener('transitionend', done, { once: true });
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  // Delegated: project tiles are re-rendered (provisional → real Supabase
  // data), so listen on the grids themselves rather than on each tile.
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

function initCookieBanner() {
  const consent = localStorage.getItem(CONSENT_KEY);
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
    localStorage.setItem(CONSENT_KEY, 'accepted');
    loadGoogleAnalytics();
    banner.remove();
  });
  document.getElementById('cookie-reject').addEventListener('click', () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    banner.remove();
  });
}
initCookieBanner();
