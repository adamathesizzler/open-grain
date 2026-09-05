// ---------- Footer year ----------
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Mobile menu ----------
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
menuToggle.addEventListener('click', () => {
  const isOpen = !mobileMenu.hidden;
  mobileMenu.hidden = isOpen;
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileMenu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
}));

// ---------- Theme toggle (light/dark) ----------
const themeToggle = document.querySelector('.theme-toggle');
themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('theme-light');
  themeToggle.textContent = document.documentElement.classList.contains('theme-light') ? '☾' : '☀';
});

// ---------- Deterministic hue per placeholder label ----------
// Every project gets its own colour instead of the app reusing the same stock photo
// for two different projects (the duplicate-image bug found on the live site).
function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}
document.querySelectorAll('.placeholder-photo[data-label]').forEach(el => {
  el.style.setProperty('--hue', hashHue(el.dataset.label));
});

// ---------- Services scroller dots ----------
const scroller = document.querySelector('.services-scroller');
const dotsWrap = document.querySelector('.scroller-dots');
if (scroller && dotsWrap) {
  const cards = Array.from(scroller.children);
  cards.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);
  scroller.addEventListener('scroll', () => {
    const index = Math.round(scroller.scrollLeft / (cards[0].offsetWidth + 16));
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
  }, { passive: true });
}

// ---------- Contact form ----------
const form = document.getElementById('contact-form');
const status = document.getElementById('form-status');
const supabaseClient = (window.supabase && window.SUPABASE_URL && !window.SUPABASE_URL.includes('YOUR-PROJECT'))
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

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
    status.textContent = 'Form not connected yet — add your Supabase project details to assets/config.js.';
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const { error } = await supabaseClient.from('enquiries').insert(payload);
  submitBtn.disabled = false;

  if (error) {
    status.textContent = 'Something went wrong — please email hello@opengrain.studio directly.';
    console.error(error);
    return;
  }
  status.textContent = 'Thanks! We\'ll get back to you with availability and next steps.';
  form.reset();
});

// ---------- Social section ----------
// Hidden by default (see index.html) until real Instagram/TikTok posts are
// connected — this replaces the "Posts can be selected from the studio panel"
// placeholder copy that was showing to real visitors on the live site.
// Once the Studio panel's Social posts tab is wired to real data, populate
// `socialPosts` from Supabase and un-hide #social.
const socialPosts = []; // e.g. [{platform:'Instagram', label:'Son Brut', url:'https://instagram.com/p/...'}]
if (socialPosts.length) {
  const section = document.getElementById('social');
  const grid = document.getElementById('social-grid');
  socialPosts.forEach(post => {
    const item = document.createElement('a');
    item.href = post.url;
    item.target = '_blank';
    item.rel = 'noopener';
    item.className = 'social-item';
    item.innerHTML = `<span class="social-badge">${post.platform}</span><div class="placeholder-photo" data-label="${post.label}"></div>`;
    grid.appendChild(item);
  });
  section.hidden = false;
}
