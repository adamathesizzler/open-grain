// ============================================================
// OPEN GRAIN — public site logic
// Ported 1:1 from the real ChatGPT-built React component
// (source/app/open-grain.tsx) into vanilla JS, wired to the
// Supabase backend that already replaces the Cloudflare/ChatGPT
// specific pieces (auth, D1, R2, Worker API routes).
// ============================================================

document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Provisional content (identical to the real site) ----------
// "El contenido, los clientes y los proyectos visibles son provisionales
// hasta que Adama entregue material real" — CLAUDE_START_HERE.md, §2/§5.
const projects = [
  { id: '01', title: 'Son Brut',       type: 'Gastronomy',  image: 'assets/portfolio/gastronomy.jpg',  ratio: 'tall' },
  { id: '02', title: 'Luz de Sal',     type: 'Portrait',    image: 'assets/portfolio/portrait.jpg',    ratio: 'wide' },
  { id: '03', title: 'Nocturna',       type: 'Events',      image: 'assets/portfolio/event.jpg',       ratio: 'tall' },
  { id: '04', title: 'Costa Sol',      type: 'Hospitality', image: 'assets/portfolio/hospitality.jpg', ratio: 'square' },
  { id: '05', title: 'Palma Stories',  type: 'Portrait',    image: 'assets/portfolio/portrait.jpg',    ratio: 'tall crop-two' },
  { id: '06', title: 'After Light',    type: 'Events',      image: 'assets/portfolio/event.jpg',       ratio: 'wide crop-two' },
  { id: '07', title: 'Table No. 8',    type: 'Gastronomy',  image: 'assets/portfolio/gastronomy.jpg',  ratio: 'square crop-two' },
  { id: '08', title: 'Mediterranean',  type: 'Hospitality', image: 'assets/portfolio/hospitality.jpg', ratio: 'tall crop-two' },
];
const heroProjects = projects.slice(0, 4);
const serviceImages = [
  'assets/portfolio/portrait.jpg', 'assets/portfolio/gastronomy.jpg', 'assets/portfolio/event.jpg',
  'assets/portfolio/hospitality.jpg', 'assets/portfolio/portrait.jpg',
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

const shell = document.getElementById('site-shell');
const stage = document.getElementById('floating-stage');

function applyTheme() {
  shell.classList.toggle('dark-mode', dark);
  document.getElementById('icon-sun').hidden = dark;
  document.getElementById('icon-moon').hidden = !dark;
}

function renderNav() {
  const t = copy[lang];
  const items = [['#work', t.work], ['#services', t.services], ['#studio', t.studio], ['#contact', t.contact]];
  document.getElementById('nav-links').innerHTML = items.map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenu.innerHTML = items.map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
}

function renderHero() {
  const t = copy[lang];
  document.getElementById('hero-eyebrow').textContent = t.eyebrow;
  document.getElementById('hero-headline').textContent = t.headline;
  const cta = document.getElementById('hero-cta');
  cta.innerHTML = `${t.explore}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M7 7h10v10"/></svg>`;

  stage.innerHTML = heroProjects.map((p, i) => `
    <figure class="float-card card-${String.fromCharCode(97 + i)}" data-depth="${i + 1}">
      <img src="${p.image}" alt="">
      <figcaption><span>/ ${p.id}</span><span>${p.title}</span></figcaption>
    </figure>`).join('');
}

function renderWork() {
  const t = copy[lang];
  document.getElementById('work-label').textContent = t.selected;
  document.getElementById('work-lede').textContent = t.workBlurb;
  const grid = document.getElementById('masonry-grid');
  grid.innerHTML = projects.map(p => `
    <article class="project-tile ${p.ratio}">
      <img src="${p.image}" alt="${p.title} — ${p.type}">
      <div><span>/ ${p.id}</span><h3>${p.title}</h3><p>${p.type}</p></div>
    </article>`).join('');
}

function renderStatement() {
  const t = copy[lang];
  document.getElementById('statement-heading').textContent = t.intro;
  document.getElementById('statement-body').textContent = t.introBody;
}

function renderServices() {
  const t = copy[lang];
  document.getElementById('services-label').textContent = t.capabilities;
  document.getElementById('services-heading').textContent = t.capabilities;
  document.getElementById('service-cards').innerHTML = t.serviceList.map((s, i) => `
    <article>
      <span>0${i + 1}</span>
      <img src="${serviceImages[i]}" alt="">
      <div><h3>${s}</h3><p>${t.viewService} →</p></div>
    </article>`).join('');
}

function renderStudio() {
  const t = copy[lang];
  document.getElementById('studio-label').textContent = t.studio;
  document.getElementById('studio-heading').textContent = t.about;
  document.getElementById('studio-body').textContent = t.aboutBody;
  document.getElementById('studio-tag').textContent = t.studioTag;
}

function renderContact() {
  const t = copy[lang];
  document.getElementById('contact-heading').textContent = t.cta;
  document.getElementById('contact-lede').textContent = t.ctaLede;
  document.getElementById('label-name').firstChild.textContent = t.fName;
  document.getElementById('label-phone').firstChild.textContent = t.fPhone;
  document.getElementById('label-service').firstChild.textContent = t.fService;
  document.getElementById('label-date').firstChild.textContent = t.fDate;
  document.getElementById('label-budget').firstChild.textContent = t.fBudget;
  document.getElementById('label-message').firstChild.textContent = t.fMessage;
  document.getElementById('message').placeholder = t.fMessagePh;
  document.getElementById('label-consent').innerHTML = t.fConsent;

  const serviceSel = document.getElementById('service');
  serviceSel.innerHTML = `<option value="" disabled selected>${t.fServicePh}</option>` +
    t.serviceList.map(s => `<option>${s}</option>`).join('');

  const budgetSel = document.getElementById('budget');
  budgetSel.innerHTML = `<option value="" disabled selected>€</option>
    <option>€500–1,000</option><option>€1,000–2,500</option><option>€2,500+</option>`;

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.innerHTML = `${t.start}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
}

function renderSocialLabels() {
  const t = copy[lang];
  document.getElementById('social-label').textContent = t.social;
  document.getElementById('social-lede').textContent = t.socialLede;
}

function renderFooter() {
  document.getElementById('footer-based').textContent = copy[lang].based;
}

function renderAll() {
  applyTheme();
  renderNav();
  renderHero();
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
  document.getElementById('mobile-menu').hidden = !open;
  document.getElementById('menu-toggle').setAttribute('aria-expanded', String(open));
  document.getElementById('icon-menu').hidden = open;
  document.getElementById('icon-close').hidden = !open;
}

document.getElementById('menu-toggle').addEventListener('click', () => setMenu(!menuOpen));
document.getElementById('lang-toggle').addEventListener('click', () => {
  lang = lang === 'en' ? 'es' : 'en';
  document.getElementById('lang-label').textContent = lang.toUpperCase();
  renderAll();
});
document.getElementById('theme-toggle').addEventListener('click', () => {
  dark = !dark;
  applyTheme();
});

renderAll();

// ---------- Pointer parallax on the floating hero photos ----------
// Ported from open-grain.tsx: updates --mx/--my custom properties via rAF,
// respects prefers-reduced-motion.
let raf = 0;
window.addEventListener('pointermove', (e) => {
  if (!stage || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    stage.style.setProperty('--mx', String((e.clientX / innerWidth - 0.5) * 2));
    stage.style.setProperty('--my', String((e.clientY / innerHeight - 0.5) * 2));
  });
}, { passive: true });

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
const form = document.getElementById('contact-form');
form.addEventListener('submit', async (e) => {
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
  const success = document.getElementById('form-success');
  success.textContent = copy[lang].sent;
  success.hidden = false;
});

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
      if (data && data.length) {
        const fallbackRatios = ['tall', 'wide', 'square', 'tall crop-two', 'wide crop-two', 'square crop-two'];
        const grid = document.getElementById('masonry-grid');
        grid.innerHTML = data.map((p, i) => `
          <article class="project-tile ${p.layout_class || fallbackRatios[i % fallbackRatios.length]}">
            <img src="${p.cover_image_url || 'assets/portfolio/portrait.jpg'}" alt="${p.title}">
            <div><span>/ ${String(i + 1).padStart(2, '0')}</span><h3>${p.title}</h3><p>${p.subtitle || ''}</p></div>
          </article>`).join('');
      }
    })
    .catch(() => {});

  // Real selected social posts, same graceful fallback as portfolio.
  supabaseClient
    .from('social_posts')
    .select('platform, external_url, image_url, caption, sort_order')
    .eq('is_selected', true)
    .order('sort_order')
    .then(({ data }) => {
      const grid = document.getElementById('social-grid');
      if (data && data.length) {
        grid.innerHTML = data.map(p => `
          <a class="social-post" href="${p.external_url}" target="_blank" rel="noopener">
            <img src="${p.image_url || 'assets/portfolio/portrait.jpg'}" alt="${p.caption || ''}">
            <span>${p.platform === 'instagram' ? '@ Instagram' : '♪ TikTok'}</span>
          </a>`).join('');
      } else {
        renderProvisionalSocial(grid);
      }
    })
    .catch(() => renderProvisionalSocial(document.getElementById('social-grid')));
} else {
  renderProvisionalSocial(document.getElementById('social-grid'));
}

function renderProvisionalSocial(grid) {
  grid.innerHTML = projects.slice(0, 6).map((p, i) => `
    <a class="social-post" href="#">
      <img src="${p.image}" alt="Selected social post">
      <span>${i < 3 ? '@ Instagram' : '♪ TikTok'}</span>
    </a>`).join('');
}

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
