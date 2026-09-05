// ============================================================
// OPEN GRAIN — Studio (CMS dashboard)
// Talks to the same Supabase tables as before; only the UI shell
// changed. See CLAUDE.md / PROJECT_STATE.md at the repo root for
// the full history and rationale of this rewrite.
// ============================================================

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');

const dragHandleSvg = '<span class="drag-handle" title="Arrastrar para reordenar"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="5" r="1.6"/><circle cx="16" cy="5" r="1.6"/><circle cx="8" cy="12" r="1.6"/><circle cx="16" cy="12" r="1.6"/><circle cx="8" cy="19" r="1.6"/><circle cx="16" cy="19" r="1.6"/></svg></span>';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}
function escapeAttr(str) { return String(str ?? '').replace(/"/g, '&quot;'); }

// ============================================================
// Theme (day / night) — the inline <head> script in index.html
// already sets document.documentElement.dataset.theme before paint
// (reading localStorage) to avoid a flash of the wrong theme. This
// module just keeps the toggle UI + localStorage in sync from here on.
// ============================================================
function syncThemeUI() {
  const theme = document.documentElement.dataset.theme === 'night' ? 'night' : 'day';
  const sun = document.getElementById('theme-icon-sun');
  const moon = document.getElementById('theme-icon-moon');
  if (sun) sun.hidden = theme === 'night';
  if (moon) moon.hidden = theme !== 'night';
  document.querySelectorAll('[data-theme-pick]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themePick === theme);
  });
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('og_studio_theme', theme); } catch (e) {}
  syncThemeUI();
}
document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.dataset.theme === 'night' ? 'night' : 'day';
  setTheme(current === 'night' ? 'day' : 'night');
});
document.querySelectorAll('[data-theme-pick]').forEach(btn => {
  btn.addEventListener('click', () => setTheme(btn.dataset.themePick));
});
syncThemeUI();

// ============================================================
// Auth
// ============================================================
function deriveDisplayName(email) {
  if (!email) return 'Adama';
  const local = (email.split('@')[0] || '').trim();
  const first = local.split(/[.+_-]/)[0] || local;
  if (!first) return 'Adama';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
function greetingPhrase() {
  const h = new Date().getHours();
  if (h >= 6 && h < 13) return 'Buenos días';
  if (h >= 13 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
function initGreeting(email) {
  const name = deriveDisplayName(email);
  const heading = document.getElementById('greeting-heading');
  const userName = document.getElementById('user-greeting-name');
  const avatar = document.getElementById('user-avatar');
  if (heading) heading.textContent = `${greetingPhrase()}, ${name}`;
  if (userName) userName.textContent = name;
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
}

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    loginScreen.hidden = true;
    dashboard.hidden = false;
    const email = session.user?.email || '';
    initGreeting(email);
    const settingsEmail = document.getElementById('settings-email');
    if (settingsEmail) settingsEmail.textContent = email || '—';
    switchTab('overview');
  } else {
    loginScreen.hidden = false;
    dashboard.hidden = true;
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = error.message;
    return;
  }
  checkSession();
});

document.getElementById('sign-out').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  checkSession();
});

// ============================================================
// Tabs / navigation
// ============================================================
const tabLoaders = {
  overview: loadOverview,
  content: loadSiteContent,
  projects: loadProjects,
  galleries: loadGalleries,
  services: loadServices,
  ugc: loadUgc,
  messages: loadEnquiries,
  clients: loadClients,
  bookings: loadCalendar,
  analytics: loadAnalytics,
  inventory: loadInventory,
  quotes: loadQuotes,
  settings: loadSettings,
};

function switchTab(tab) {
  document.querySelectorAll('.og-nav-item[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.studio-panel').forEach(p => { p.hidden = p.dataset.panel !== tab; });
  const search = document.getElementById('global-search');
  if (search) search.value = '';
  const loader = tabLoaders[tab];
  if (loader) loader();
  const content = document.querySelector('.og-content');
  if (content) content.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
}

document.querySelectorAll('.og-nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
document.querySelectorAll('[data-jump]').forEach(el => {
  el.addEventListener('click', (e) => { e.preventDefault(); switchTab(el.dataset.jump); });
});
document.getElementById('bell-btn').addEventListener('click', () => switchTab('messages'));

// ---------- Quick actions (Inicio) ----------
document.querySelector('[data-action="quick-new-project"]').addEventListener('click', () => {
  switchTab('projects');
  const form = document.getElementById('project-form');
  form.hidden = false;
  document.getElementById('project-title').focus();
});
document.querySelector('[data-action="quick-upload"]').addEventListener('click', () => {
  switchTab('galleries');
  document.getElementById('gallery-upload-input')?.click();
});
document.querySelector('[data-action="quick-edit-content"]').addEventListener('click', () => switchTab('content'));
document.querySelector('[data-action="quick-messages"]').addEventListener('click', () => switchTab('messages'));

// ---------- Global search: filters the rows visible in the active panel ----------
document.getElementById('global-search').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const activePanel = document.querySelector('.studio-panel:not([hidden])');
  if (!activePanel) return;
  activePanel.querySelectorAll('.list-row, .album-card, .category-row').forEach(row => {
    row.style.display = (!q || row.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
});
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.getElementById('global-search').focus();
  }
});

// ============================================================
// Shared helper: drag-to-reorder (native HTML5 DnD)
// ============================================================
function enableDragReorder(container, itemSelector, onDrop) {
  let dragEl = null;
  container.addEventListener('dragstart', (e) => {
    const item = e.target.closest(itemSelector);
    if (!item || !container.contains(item)) return;
    dragEl = item;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', item.dataset.id || ''); } catch (err) {}
    setTimeout(() => item.classList.add('dragging'), 0);
  });
  container.addEventListener('dragover', (e) => {
    if (!dragEl) return;
    e.preventDefault();
    const item = e.target.closest(itemSelector);
    if (!item || item === dragEl) return;
    const rect = item.getBoundingClientRect();
    const after = (e.clientY - rect.top) / rect.height > 0.5;
    container.insertBefore(dragEl, after ? item.nextSibling : item);
  });
  container.addEventListener('drop', (e) => e.preventDefault());
  container.addEventListener('dragend', () => {
    if (dragEl) dragEl.classList.remove('dragging');
    dragEl = null;
    if (onDrop) onDrop();
  });
}

async function persistOrder(container, itemSelector, table) {
  const items = [...container.querySelectorAll(itemSelector)];
  await Promise.all(items.map((el, i) =>
    el.dataset.id ? supabaseClient.from(table).update({ sort_order: i }).eq('id', el.dataset.id) : null
  ));
}

// ============================================================
// Shared helper: populate a <select> with clients
// ============================================================
async function populateClientSelect(selectEl) {
  const { data, error } = await supabaseClient.from('clients').select('id, name').order('name');
  if (error) return console.error(error);
  const current = selectEl.value;
  selectEl.innerHTML = '<option value="">Sin cliente</option>' +
    (data || []).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  selectEl.value = current;
}

// ============================================================
// Media uploads (Supabase Storage bucket `media`)
// ============================================================
async function uploadMediaFile(file, folder = 'portfolio') {
  const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error } = await supabaseClient.storage.from('media').upload(path, file, { upsert: false });
  if (error) { alert('No se pudo subir el archivo: ' + error.message); return null; }
  const { data } = supabaseClient.storage.from('media').getPublicUrl(path);
  return data?.publicUrl || null;
}

document.getElementById('gallery-upload-input').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  const statusEl = document.getElementById('gallery-upload-status');
  statusEl.hidden = false;
  statusEl.textContent = `Subiendo ${files.length} archivo${files.length === 1 ? '' : 's'}…`;
  for (const file of files) await uploadMediaFile(file, 'portfolio');
  statusEl.textContent = 'Listo. Ya están en la biblioteca de archivos.';
  e.target.value = '';
  await loadGalleries();
});

// ============================================================
// Overview (Inicio)
// ============================================================
function resolveStatus(p) {
  return p.status || (p.is_published ? 'published' : 'draft');
}
function statusLabel(status) {
  return { published: 'Publicado', draft: 'Borrador', hidden: 'Oculto' }[status] || 'Borrador';
}
function statusPillClass(status) {
  return { published: 'og-pill-live', draft: 'og-pill-draft', hidden: 'og-pill-hidden' }[status] || 'og-pill-draft';
}

async function updateMessageBadge() {
  const { count } = await supabaseClient.from('enquiries').select('*', { count: 'exact', head: true }).eq('status', 'new');
  const n = count || 0;
  const badge = document.getElementById('badge-messages');
  badge.textContent = String(n);
  badge.hidden = n === 0;
  document.getElementById('bell-dot').hidden = n === 0;
  return n;
}

async function loadOverview() {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [
    { count: publishedCount },
    { count: categoryCount },
    { data: recentProjects },
    { data: allProjectsForBar },
    { data: latestMessages },
    { data: upcomingRaw },
  ] = await Promise.all([
    supabaseClient.from('portfolio_projects').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabaseClient.from('portfolio_categories').select('*', { count: 'exact', head: true }),
    supabaseClient.from('portfolio_projects').select('*, portfolio_categories(name)').order('created_at', { ascending: false }).limit(6),
    supabaseClient.from('portfolio_projects').select('status, is_published'),
    supabaseClient.from('enquiries').select('*').order('created_at', { ascending: false }).limit(3),
    supabaseClient.from('projects').select('*, clients(name)').gte('event_date', todayIso).order('event_date', { ascending: true }).limit(30),
  ]);

  const newMsgCount = await updateMessageBadge();
  const upcoming = (upcomingRaw || []).filter(j => j.status !== 'cancelled' && j.status !== 'delivered');

  document.getElementById('stat-projects').textContent = publishedCount ?? '0';
  document.getElementById('stat-galleries').textContent = categoryCount ?? '0';
  document.getElementById('stat-bookings').textContent = String(upcoming.length);
  document.getElementById('stat-messages').textContent = String(newMsgCount);

  const quickMsgSub = document.getElementById('quick-messages-sub');
  if (quickMsgSub) quickMsgSub.textContent = newMsgCount ? `${newMsgCount} sin leer` : 'Sin novedades';

  // Featured / most recent project
  const featuredEl = document.getElementById('featured-project');
  const featured = (recentProjects || [])[0];
  if (!featured) {
    featuredEl.innerHTML = '<p class="panel-sub">Todavía no hay proyectos — crea el primero desde Proyectos.</p>';
  } else {
    const status = resolveStatus(featured);
    featuredEl.innerHTML = `
      <div class="og-card og-featured">
        <div class="og-featured-text">
          <div class="og-featured-eyebrow">
            <span class="og-pill ${statusPillClass(status)}">${statusLabel(status)}</span>
            Proyecto reciente
          </div>
          <h3>${escapeHtml(featured.title)}</h3>
          <p>${escapeHtml(featured.portfolio_categories?.name || 'Sin categoría')}</p>
          <div class="og-featured-actions">
            <button type="button" class="og-btn og-btn-solid og-btn-sm" id="featured-edit-btn">Editar proyecto</button>
            <a class="og-btn og-btn-outline og-btn-sm" href="/" target="_blank" rel="noopener">Ver en la web</a>
          </div>
        </div>
        <div class="og-featured-photo" style="${featured.cover_image_url ? `background-image:url('${featured.cover_image_url}')` : 'background:var(--og-bg-soft);'}"></div>
      </div>
    `;
    document.getElementById('featured-edit-btn').addEventListener('click', () => switchTab('projects'));
  }

  // Mini list: messages
  const messagesEl = document.getElementById('home-messages');
  messagesEl.innerHTML = (latestMessages && latestMessages.length) ? latestMessages.map(m => `
    <div class="og-mini-row">
      <span class="og-mini-avatar">${escapeHtml((m.name || '?').charAt(0).toUpperCase())}</span>
      <div class="og-mini-body"><b>${escapeHtml(m.name)}</b><span>${escapeHtml(m.service || m.message || m.email || '')}</span></div>
      <span class="status-pill ${m.status}">${m.status === 'new' ? 'Nuevo' : m.status === 'contacted' ? 'Contactado' : 'Archivado'}</span>
    </div>
  `).join('') : '<div class="og-empty">No hay mensajes nuevos.</div>';

  // Mini list: bookings
  const bookingsEl = document.getElementById('home-bookings');
  const monthAbbr = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  bookingsEl.innerHTML = upcoming.slice(0, 3).length ? upcoming.slice(0, 3).map(j => {
    const d = j.event_date ? new Date(j.event_date + 'T00:00:00') : null;
    return `
    <div class="og-mini-row">
      <span class="og-mini-date">${d ? d.getDate() : '–'}<span>${d ? monthAbbr[d.getMonth()] : ''}</span></span>
      <div class="og-mini-body"><b>${escapeHtml(j.title)}</b><span>${escapeHtml(j.clients?.name || 'Sin cliente')}</span></div>
      <span class="og-mini-when">${j.status}</span>
    </div>`;
  }).join('') : '<div class="og-empty">No hay reservas próximas.</div>';

  // Publish status bar
  const bar = allProjectsForBar || [];
  const totalProjects = bar.length;
  const publishedForBar = bar.filter(p => resolveStatus(p) === 'published').length;
  const pct = totalProjects ? Math.round((publishedForBar / totalProjects) * 100) : 0;
  document.getElementById('publish-status-sub').textContent = totalProjects
    ? `${publishedForBar} de ${totalProjects} proyectos publicados`
    : 'Todavía no hay proyectos.';
  document.getElementById('publish-bar').style.width = pct + '%';

  // Recent work strip
  const stripEl = document.getElementById('recent-work');
  stripEl.innerHTML = (recentProjects && recentProjects.length) ? recentProjects.map(p => `
    <div class="og-strip-item" data-project-id="${p.id}">
      <div class="og-strip-photo${p.cover_image_url ? '' : ' empty'}" style="${p.cover_image_url ? `background-image:url('${p.cover_image_url}')` : ''}">${p.cover_image_url ? '' : '–'}</div>
      <b>${escapeHtml(p.title)}</b>
      <span>${escapeHtml(p.portfolio_categories?.name || 'Sin categoría')}</span>
    </div>
  `).join('') : '<p class="panel-sub">Todavía no hay proyectos — añade el primero desde Proyectos.</p>';
  stripEl.querySelectorAll('.og-strip-item').forEach(el => el.addEventListener('click', () => switchTab('projects')));
}

// ============================================================
// Proyectos y portfolio
// ============================================================
let currentProjectFilter = 'all';
let allProjectsCache = [];

async function loadCategories() {
  const { data: categories, error } = await supabaseClient.from('portfolio_categories').select('*').order('sort_order');
  if (error) { console.error(error); return []; }

  const catList = document.getElementById('category-list');
  catList.innerHTML = '';
  categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'category-row';
    row.draggable = true;
    row.dataset.id = cat.id;
    row.innerHTML = `
      ${dragHandleSvg}
      <label class="checkbox-label" style="flex:1; justify-content:flex-start; gap:10px;">
        <input type="checkbox" ${cat.is_active ? 'checked' : ''}>
        <span>${escapeHtml(cat.name)} <small>${escapeHtml(cat.slug)}</small></span>
      </label>
    `;
    row.querySelector('input').addEventListener('change', async (e) => {
      await supabaseClient.from('portfolio_categories').update({ is_active: e.target.checked }).eq('id', cat.id);
    });
    catList.appendChild(row);
  });
  enableDragReorder(catList, '.category-row', () => persistOrder(catList, '.category-row', 'portfolio_categories'));

  const select = document.getElementById('project-category');
  select.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  const filters = document.getElementById('project-filters');
  filters.innerHTML = ['<button type="button" class="og-filter-pill active" data-filter="all">Todos</button>']
    .concat(categories.map(c => `<button type="button" class="og-filter-pill" data-filter="${c.id}">${escapeHtml(c.name)}</button>`))
    .join('');
  filters.querySelectorAll('.og-filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      filters.querySelectorAll('.og-filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentProjectFilter = btn.dataset.filter;
      renderProjects();
    });
  });

  return categories;
}

async function loadProjectsData() {
  const { data, error } = await supabaseClient.from('portfolio_projects').select('*, portfolio_categories(name)').order('sort_order');
  if (error) { console.error(error); allProjectsCache = []; return; }
  allProjectsCache = data || [];
}

function renderProjects() {
  const projList = document.getElementById('project-list');
  projList.innerHTML = '';
  const filtered = currentProjectFilter === 'all'
    ? allProjectsCache
    : allProjectsCache.filter(p => p.category_id === currentProjectFilter);

  if (!filtered.length) {
    projList.innerHTML = '<p class="panel-sub">No hay proyectos en esta categoría todavía.</p>';
    return;
  }

  filtered.forEach(p => {
    const status = resolveStatus(p);
    const row = document.createElement('div');
    row.className = 'album-card';
    row.draggable = true;
    row.dataset.id = p.id;
    row.innerHTML = `
      <div class="album-stack">
        <span class="album-drag-handle">${dragHandleSvg}</span>
        <span class="album-ghost album-ghost-1"></span>
        <span class="album-ghost album-ghost-2"></span>
        ${p.cover_image_url
          ? `<img class="album-photo" src="${p.cover_image_url}" alt="" draggable="false">`
          : `<label class="album-photo album-photo-empty" title="Añadir foto">
               <span>+</span>
               <input type="file" accept="image/*" data-field="photo-empty" hidden>
             </label>`}
      </div>
      <div class="album-info">
        <span class="album-title">${escapeHtml(p.title)}</span>
        <small class="album-sub">${escapeHtml(p.portfolio_categories?.name || 'Sin categoría')}</small>
      </div>
      <div class="album-controls">
        <select data-field="layout" class="layout-select">
          <option value="tall">Vertical</option>
          <option value="wide">Horizontal</option>
          <option value="square">Cuadrada</option>
        </select>
        <select data-field="status" class="album-status-select">
          <option value="draft">Borrador</option>
          <option value="published">Publicado</option>
          <option value="hidden">Oculto</option>
        </select>
      </div>
      <div class="album-controls">
        <label class="link-btn file-label">Cambiar foto<input type="file" accept="image/*" data-field="photo" hidden></label>
        <button class="link-btn" data-action="delete">Eliminar</button>
      </div>
      <div class="album-controls">
        <button class="link-btn" data-action="gallery" style="color:var(--og-accent);">Galería cliente</button>
      </div>
    `;
    row.querySelector('[data-field="layout"]').value = p.layout_class || 'tall';
    row.querySelector('[data-field="layout"]').addEventListener('change', async (e) => {
      await supabaseClient.from('portfolio_projects').update({ layout_class: e.target.value }).eq('id', p.id);
    });
    row.querySelector('[data-field="status"]').value = status;
    row.querySelector('[data-field="status"]').addEventListener('change', async (e) => {
      const next = e.target.value;
      const patch = { is_published: next === 'published' };
      const { error } = await supabaseClient.from('portfolio_projects').update({ ...patch, status: next }).eq('id', p.id);
      if (error) await supabaseClient.from('portfolio_projects').update(patch).eq('id', p.id);
      await loadProjectsData();
      renderProjects();
    });
    const handlePhotoChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadMediaFile(file, 'portfolio');
      if (!url) return;
      await supabaseClient.from('portfolio_projects').update({ cover_image_url: url }).eq('id', p.id);
      await loadProjectsData();
      renderProjects();
    };
    row.querySelector('[data-field="photo"]').addEventListener('change', handlePhotoChange);
    const emptyPhotoInput = row.querySelector('[data-field="photo-empty"]');
    if (emptyPhotoInput) emptyPhotoInput.addEventListener('change', handlePhotoChange);
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${p.title}"?`)) return;
      await supabaseClient.from('portfolio_projects').delete().eq('id', p.id);
      await loadProjectsData();
      renderProjects();
    });
    row.querySelector('[data-action="gallery"]').addEventListener('click', () => openClientGallery(p.id, p.title));
    projList.appendChild(row);
  });

  enableDragReorder(projList, '.album-card', () => persistOrder(projList, '.album-card', 'portfolio_projects'));
}

async function loadProjects() {
  currentProjectFilter = 'all';
  await loadCategories();
  await loadProjectsData();
  renderProjects();
}

document.getElementById('new-project-btn').addEventListener('click', () => {
  const form = document.getElementById('project-form');
  form.hidden = !form.hidden;
  if (!form.hidden) document.getElementById('project-title').focus();
});

document.getElementById('project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('project-title').value.trim();
  const category_id = document.getElementById('project-category').value || null;
  const is_published = document.getElementById('project-published').checked;
  const layout_class = document.getElementById('project-layout').value;
  const photoInput = document.getElementById('project-photo');
  if (!title) return;

  let cover_image_url = null;
  if (photoInput.files[0]) cover_image_url = await uploadMediaFile(photoInput.files[0], 'portfolio');

  const status = is_published ? 'published' : 'draft';
  const payload = { title, category_id, is_published, layout_class, cover_image_url };
  let { error } = await supabaseClient.from('portfolio_projects').insert({ ...payload, status });
  if (error) ({ error } = await supabaseClient.from('portfolio_projects').insert(payload));
  if (error) return alert(error.message);

  e.target.reset();
  document.getElementById('project-form').hidden = true;
  await loadProjects();
});

// ============================================================
// Galería de cliente (por proyecto) — editor completo: portada, cliente,
// enlace + PIN (validado en servidor, ver migration_gallery_v2.sql),
// caducidad, borrador/publicada, fotos Y vídeos con badges de formato,
// categorías (5), portada por estrella, "calidad completa", selección
// múltiple + acciones en bloque, archivos adjuntos, actividad del
// cliente y vista previa en vivo (móvil/escritorio).
// ============================================================
let currentGalleryProjectId = null;
let currentGalleryRow = null;
let cgSelectedIds = new Set();
let cgPreviewMode = 'mobile';

function galleryShareUrl(token) {
  return `${window.location.origin}/gallery.html?g=${encodeURIComponent(token)}`;
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec) {
  if (!sec && sec !== 0) return '';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function gcdNum(a, b) { return b === 0 ? a : gcdNum(b, a % b); }
function ratioLabel(w, h) {
  if (!w || !h) return null;
  const d = gcdNum(Math.round(w), Math.round(h)) || 1;
  return `${Math.round(w / d)}:${Math.round(h / d)}`;
}

function extIcon(filename) {
  return ((filename || '').split('.').pop() || 'ARC').toUpperCase().slice(0, 4);
}
const EXT_COLORS = {
  PDF: '#e5484d', DOC: '#2f6fed', DOCX: '#2f6fed', XLS: '#1a9c6b', XLSX: '#1a9c6b',
  CSV: '#1a9c6b', ZIP: '#8a63d2', RAR: '#8a63d2', MP3: '#e0902c', WAV: '#e0902c',
  M4A: '#e0902c', MP4: '#2f6fed', MOV: '#2f6fed',
};
function extColor(ext) { return EXT_COLORS[ext] || '#807c73'; }

function readImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: null, height: null }); };
    img.src = url;
  });
}

// Reads real video dimensions + duration, and grabs a real frame (at ~10%
// into the clip) as a poster JPEG — all client-side, no server transcoding.
function readVideoMeta(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;
    video.addEventListener('loadedmetadata', () => {
      const seekTo = Math.min(video.duration * 0.1, 1);
      const meta = { width: video.videoWidth, height: video.videoHeight, duration: video.duration };
      const finish = (posterBlob) => { URL.revokeObjectURL(url); resolve({ ...meta, posterBlob }); };
      video.addEventListener('seeked', () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0);
          canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.82);
        } catch (e) { finish(null); }
      }, { once: true });
      try { video.currentTime = seekTo; } catch (e) { finish(null); }
    });
    video.addEventListener('error', () => { URL.revokeObjectURL(url); resolve({ width: null, height: null, duration: null, posterBlob: null }); });
  });
}

// Uploads with a real byte-level progress callback (Supabase-js doesn't
// expose XHR progress, so this one path talks to the Storage REST API
// directly with the admin's own session token).
async function uploadFileWithProgress(file, path, onProgress) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const token = session?.access_token || window.SUPABASE_ANON_KEY;
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${window.SUPABASE_URL}/storage/v1/object/media/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', window.SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data } = supabaseClient.storage.from('media').getPublicUrl(path);
        resolve(data?.publicUrl || null);
      } else {
        console.error('Upload failed', xhr.status, xhr.responseText);
        resolve(null);
      }
    };
    xhr.onerror = () => resolve(null);
    xhr.send(file);
  });
}
function mediaPath(folder, file) {
  return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

const GALLERY_CATEGORIES = [
  { key: 'stories', label: 'Stories' },
  { key: 'post', label: 'Publicación' },
  { key: 'reel', label: 'Reel' },
  { key: 'mensajes', label: 'Mensajes' },
  { key: 'web', label: 'Web' },
];

const GALLERY_STATUS_LABELS = { draft: 'Borrador', published: 'Publicada', disabled: 'Desactivada', expired: 'Caducada', archived: 'Archivada' };
const GALLERY_STATUS_PILL = { draft: 'og-pill-draft', published: 'og-pill-live', disabled: 'og-pill-hidden', expired: 'og-pill-expired', archived: 'og-pill-archived' };

function effectiveGalleryStatus(row) {
  if (row.status === 'published' && row.expires_at && new Date(row.expires_at) < new Date()) return 'expired';
  return row.status || 'draft';
}
function renderStatusPill() {
  const pill = document.getElementById('cg-status-pill');
  const status = effectiveGalleryStatus(currentGalleryRow);
  pill.textContent = GALLERY_STATUS_LABELS[status] || 'Borrador';
  pill.className = `og-pill ${GALLERY_STATUS_PILL[status] || 'og-pill-draft'}`;
}

async function openClientGallery(projectId, projectTitle) {
  currentGalleryProjectId = projectId;
  cgSelectedIds = new Set();
  document.querySelectorAll('.og-nav-item[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === 'projects'));
  document.querySelectorAll('.studio-panel').forEach(p => { p.hidden = p.dataset.panel !== 'client-gallery'; });
  document.getElementById('cg-title').textContent = `Galería de cliente — ${projectTitle}`;
  document.getElementById('cg-crumb').textContent = projectTitle;
  await loadClientGallery();
}

document.getElementById('cg-back').addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('projects');
});

async function loadClientGallery() {
  const statusEl = document.getElementById('cg-status');
  statusEl.hidden = true;
  const { data, error } = await supabaseClient.from('client_galleries').select('*').eq('project_id', currentGalleryProjectId);
  if (error) {
    statusEl.hidden = false;
    statusEl.textContent = 'No se pudo cargar la galería: ' + error.message + ' (¿has ejecutado supabase/migration_gallery_v2.sql en Supabase?)';
    document.getElementById('cg-link').textContent = '—';
    return;
  }
  currentGalleryRow = (data || [])[0] || null;

  if (!currentGalleryRow) {
    // First time opening this project's gallery: create it as a draft, so
    // nothing is shareable until the admin explicitly publishes it.
    const title = document.getElementById('cg-title').textContent.replace('Galería de cliente — ', '');
    const { data: created, error: createErr } = await supabaseClient.from('client_galleries')
      .insert({ project_id: currentGalleryProjectId, title, is_active: false, status: 'draft' })
      .select();
    if (createErr) {
      statusEl.hidden = false;
      statusEl.textContent = 'No se pudo crear la galería: ' + createErr.message;
      return;
    }
    currentGalleryRow = (created || [])[0];
  }

  document.getElementById('cg-active').checked = effectiveGalleryStatus(currentGalleryRow) === 'published';
  document.getElementById('cg-client-name').value = currentGalleryRow.client_name || '';
  document.getElementById('cg-pin-toggle').checked = !!currentGalleryRow.has_pin;
  document.getElementById('cg-pin-row').style.display = currentGalleryRow.has_pin ? 'flex' : 'none';
  document.getElementById('cg-pin').value = '';
  document.getElementById('cg-pin-hint').textContent = currentGalleryRow.has_pin ? 'Ya hay un PIN guardado — escribe uno nuevo solo si quieres cambiarlo.' : '';
  document.getElementById('cg-expires').value = currentGalleryRow.expires_at ? currentGalleryRow.expires_at.slice(0, 10) : '';
  document.getElementById('cg-download-url').value = currentGalleryRow.download_url || '';
  document.getElementById('cg-link').textContent = currentGalleryRow.share_token ? galleryShareUrl(currentGalleryRow.share_token) : '—';
  const coverPreview = document.getElementById('cg-cover-preview');
  coverPreview.style.backgroundImage = currentGalleryRow.cover_url ? `url('${currentGalleryRow.cover_url}')` : '';
  const coverEmptyLabel = document.getElementById('cg-cover-empty');
  if (coverEmptyLabel) coverEmptyLabel.hidden = !!currentGalleryRow.cover_url;
  renderStatusPill();
  refreshPreviewFrame();

  await renderClientGalleryPhotos();
  await renderClientGalleryAttachments();
  await renderClientGalleryActivity();
  await renderClientGalleryRevisions();
}

function refreshPreviewFrame() {
  const frame = document.getElementById('cg-preview-frame');
  if (currentGalleryRow?.share_token) {
    frame.src = `/gallery.html?g=${encodeURIComponent(currentGalleryRow.share_token)}`;
  } else {
    frame.removeAttribute('src');
  }
}
document.getElementById('cg-preview-refresh').addEventListener('click', refreshPreviewFrame);
document.querySelectorAll('.cg-preview-tabs [data-preview-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    cgPreviewMode = btn.dataset.previewMode;
    document.querySelectorAll('.cg-preview-tabs button').forEach(b => b.classList.toggle('active', b === btn));
    document.getElementById('cg-preview-frame-wrap').className = `cg-preview-frame-wrap ${cgPreviewMode}`;
  });
});
document.getElementById('cg-preview-btn').addEventListener('click', () => {
  if (currentGalleryRow?.share_token) window.open(galleryShareUrl(currentGalleryRow.share_token), '_blank', 'noopener');
});
document.getElementById('cg-publish-btn').addEventListener('click', async () => {
  if (!currentGalleryRow) return;
  const { error } = await supabaseClient.from('client_galleries').update({ status: 'published', is_active: true }).eq('id', currentGalleryRow.id);
  const statusEl = document.getElementById('cg-status');
  statusEl.hidden = false;
  statusEl.textContent = error ? ('Error: ' + error.message) : 'Publicada — el cliente ya puede ver la galería.';
  if (!error) {
    currentGalleryRow = { ...currentGalleryRow, status: 'published', is_active: true };
    document.getElementById('cg-active').checked = true;
    renderStatusPill();
    refreshPreviewFrame();
  }
});

document.getElementById('cg-pin-toggle').addEventListener('change', (e) => {
  document.getElementById('cg-pin-row').style.display = e.target.checked ? 'flex' : 'none';
});

document.getElementById('cg-cover-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !currentGalleryRow) return;
  const url = await uploadFileWithProgress(file, mediaPath(`galleries/${currentGalleryRow.id}/cover`, file));
  if (url) {
    await supabaseClient.from('client_galleries').update({ cover_url: url }).eq('id', currentGalleryRow.id);
    currentGalleryRow.cover_url = url;
    const coverPreview = document.getElementById('cg-cover-preview');
    coverPreview.style.backgroundImage = `url('${url}')`;
    const coverEmptyLabel = document.getElementById('cg-cover-empty');
    if (coverEmptyLabel) coverEmptyLabel.hidden = true;
    refreshPreviewFrame();
  }
  e.target.value = '';
});

// ---------- Upload (drag-drop + click), photos and videos ----------
const cgDropzone = document.getElementById('cg-dropzone');
['dragover', 'dragenter'].forEach(evt => cgDropzone.addEventListener(evt, (e) => { e.preventDefault(); cgDropzone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(evt => cgDropzone.addEventListener(evt, (e) => { e.preventDefault(); cgDropzone.classList.remove('dragover'); }));
cgDropzone.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) handleGalleryUploads([...e.dataTransfer.files]); });
document.getElementById('cg-upload-input').addEventListener('change', (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (files.length) handleGalleryUploads(files);
});

async function handleGalleryUploads(files) {
  if (!currentGalleryRow) return;
  const progressWrap = document.getElementById('cg-upload-progress');
  const fill = document.getElementById('cg-upload-progress-fill');
  const label = document.getElementById('cg-upload-progress-label');
  const thumb = document.getElementById('cg-upload-progress-thumb');
  progressWrap.hidden = false;
  let lastThumbUrl = null;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isVideo = file.type.startsWith('video/');
    label.textContent = `${file.name} · 0%`;
    fill.style.width = '0%';
    if (lastThumbUrl) URL.revokeObjectURL(lastThumbUrl);
    if (!isVideo) { lastThumbUrl = URL.createObjectURL(file); thumb.src = lastThumbUrl; thumb.hidden = false; }
    else { thumb.hidden = true; }
    const onProgress = (frac) => {
      const pct = Math.round(frac * 100);
      fill.style.width = `${pct}%`;
      label.textContent = `${file.name} · ${pct}%`;
    };
    if (isVideo) {
      const meta = await readVideoMeta(file);
      const path = mediaPath(`galleries/${currentGalleryRow.id}`, file);
      const url = await uploadFileWithProgress(file, path, onProgress);
      let posterUrl = null;
      if (meta.posterBlob) {
        const posterPath = mediaPath(`galleries/${currentGalleryRow.id}/posters`, { name: file.name.replace(/\.[^.]+$/, '.jpg') });
        posterUrl = await uploadFileWithProgress(meta.posterBlob, posterPath, null);
      }
      if (url) {
        await supabaseClient.from('gallery_photos').insert({
          gallery_id: currentGalleryRow.id, image_url: posterUrl || url, original_url: url,
          original_filename: file.name, original_bytes: file.size, type: 'video',
          poster_url: posterUrl, duration_seconds: meta.duration, width: meta.width, height: meta.height,
          processing_status: 'ready',
        });
      }
    } else {
      const [{ width, height }, url] = await Promise.all([
        readImageDimensions(file),
        uploadFileWithProgress(file, mediaPath(`galleries/${currentGalleryRow.id}`, file), onProgress),
      ]);
      if (url) await supabaseClient.from('gallery_photos').insert({ gallery_id: currentGalleryRow.id, image_url: url, width, height, type: 'photo' });
    }
  }
  label.textContent = 'Listo.';
  fill.style.width = '100%';
  if (lastThumbUrl) { URL.revokeObjectURL(lastThumbUrl); lastThumbUrl = null; }
  setTimeout(() => { progressWrap.hidden = true; thumb.hidden = true; thumb.removeAttribute('src'); }, 1200);
  await renderClientGalleryPhotos();
  refreshPreviewFrame();
}

// ---------- Media grid: badges, categories, star cover, quality, selection ----------
function updateBulkBar() {
  const bar = document.getElementById('cg-bulk-bar');
  bar.hidden = cgSelectedIds.size === 0;
  document.getElementById('cg-bulk-count').textContent = `${cgSelectedIds.size} seleccionado${cgSelectedIds.size === 1 ? '' : 's'}`;
}

async function renderClientGalleryPhotos() {
  const grid = document.getElementById('cg-photo-grid');
  if (!currentGalleryRow) { grid.innerHTML = ''; return; }
  const { data: photos } = await supabaseClient.from('gallery_photos').select('*').eq('gallery_id', currentGalleryRow.id).order('sort_order');
  const list = photos || [];

  const bulkChips = document.getElementById('cg-bulk-categories');
  if (!bulkChips.childElementCount) {
    bulkChips.innerHTML = GALLERY_CATEGORIES.map(c => `<button type="button" data-key="${c.key}">${c.label}</button>`).join('');
    bulkChips.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Promise.all([...cgSelectedIds].map(async (id) => {
          const photo = list.find(p => p.id === id);
          const cats = new Set(photo?.categories || []);
          cats.add(btn.dataset.key);
          await supabaseClient.from('gallery_photos').update({ categories: [...cats] }).eq('id', id);
        }));
        await renderClientGalleryPhotos();
      });
    });
  }

  if (!list.length) {
    grid.innerHTML = '<p class="panel-sub">Todavía no has subido fotos o vídeos a esta galería.</p>';
    updateBulkBar();
    return;
  }

  grid.innerHTML = list.map(p => {
    const cats = p.categories || [];
    const isVideo = p.type === 'video';
    const label = ratioLabel(p.width, p.height);
    const isSelected = cgSelectedIds.has(p.id);
    const statusClass = p.processing_status || 'ready';
    const thumb = p.poster_url || p.image_url;
    return `
    <div class="cg-media-item${isSelected ? ' selected' : ''}" data-id="${p.id}">
      <div class="cg-media-thumb-wrap" data-action="toggle-select" data-id="${p.id}">
        <img src="${thumb}" alt="" loading="lazy">
        ${label ? `<span class="cg-badge cg-badge-ratio">${label}</span>` : ''}
        <span class="cg-badge cg-badge-status ${statusClass}"><span class="dot"></span>${statusClass === 'ready' ? 'Listo' : statusClass === 'processing' ? 'Procesando…' : 'Error'}</span>
        <button type="button" class="cg-star-btn${p.is_cover ? ' active' : ''}" data-action="set-cover" data-id="${p.id}" title="Usar como portada">★</button>
        ${isVideo ? `<span class="cg-play-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>` : ''}
        ${isVideo && p.duration_seconds ? `<span class="cg-duration-badge">${formatDuration(p.duration_seconds)}</span>` : ''}
        <span class="cg-media-check">${isSelected ? '✓' : ''}</span>
      </div>
      <div class="cg-media-body">
        <div class="cg-media-name" title="${escapeAttr(p.original_filename || '')}">
          ${escapeHtml(p.original_filename || (isVideo ? 'Vídeo' : 'Foto'))}
          <span class="cg-media-status-text ${statusClass}">${statusClass === 'ready' ? 'Listo' : statusClass === 'processing' ? 'Procesando…' : 'Error'}</span>
        </div>
        <div class="cg-media-cats">
          ${GALLERY_CATEGORIES.map(c => `
            <label class="${cats.includes(c.key) ? 'on' : ''}">
              <input type="checkbox" data-action="toggle-category" data-id="${p.id}" data-key="${c.key}" ${cats.includes(c.key) ? 'checked' : ''}>
              ${c.label}
            </label>
          `).join('')}
        </div>
        ${p.original_url
          ? `<span class="cg-original-note">✓ Original (${formatFileSize(p.original_bytes)})</span>`
          : `<label class="link-btn" style="cursor:pointer; color:var(--og-accent);">Adjuntar original<input type="file" data-action="upload-original" data-id="${p.id}" hidden></label>`
        }
        <div class="cg-media-actions">
          <label class="cg-quality-toggle"><input type="checkbox" data-action="toggle-quality" data-id="${p.id}" ${p.full_quality ? 'checked' : ''}> Calidad completa</label>
          <button type="button" class="link-btn" data-action="delete-photo" data-id="${p.id}">Eliminar</button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  grid.querySelectorAll('[data-action="toggle-select"]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="set-cover"]')) return;
      const id = el.dataset.id;
      if (cgSelectedIds.has(id)) cgSelectedIds.delete(id); else cgSelectedIds.add(id);
      renderClientGalleryPhotos();
    });
  });
  grid.querySelectorAll('[data-action="set-cover"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const photo = list.find(p => p.id === btn.dataset.id);
      if (!photo) return;
      await supabaseClient.from('gallery_photos').update({ is_cover: false }).eq('gallery_id', currentGalleryRow.id);
      await supabaseClient.from('gallery_photos').update({ is_cover: true }).eq('id', photo.id);
      await supabaseClient.from('client_galleries').update({ cover_url: photo.poster_url || photo.image_url }).eq('id', currentGalleryRow.id);
      currentGalleryRow.cover_url = photo.poster_url || photo.image_url;
      const coverPreview = document.getElementById('cg-cover-preview');
      coverPreview.style.backgroundImage = `url('${currentGalleryRow.cover_url}')`;
      const coverEmptyLabel = document.getElementById('cg-cover-empty');
      if (coverEmptyLabel) coverEmptyLabel.hidden = true;
      refreshPreviewFrame();
      renderClientGalleryPhotos();
    });
  });
  grid.querySelectorAll('[data-action="delete-photo"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('¿Eliminar este archivo de la galería?')) return;
      await supabaseClient.from('gallery_photos').delete().eq('id', btn.dataset.id);
      cgSelectedIds.delete(btn.dataset.id);
      renderClientGalleryPhotos();
    });
  });
  grid.querySelectorAll('[data-action="upload-original"]').forEach(input => {
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadFileWithProgress(file, mediaPath(`galleries/${currentGalleryRow.id}/originals`, file));
      if (url) {
        await supabaseClient.from('gallery_photos').update({
          original_url: url, original_filename: file.name, original_bytes: file.size,
        }).eq('id', input.dataset.id);
      }
      renderClientGalleryPhotos();
    });
  });
  grid.querySelectorAll('[data-action="toggle-category"]').forEach(input => {
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('change', async (e) => {
      const photo = list.find(p => p.id === input.dataset.id);
      const current = new Set(photo?.categories || []);
      if (e.target.checked) current.add(input.dataset.key); else current.delete(input.dataset.key);
      await supabaseClient.from('gallery_photos').update({ categories: [...current] }).eq('id', input.dataset.id);
      renderClientGalleryPhotos();
    });
  });
  grid.querySelectorAll('[data-action="toggle-quality"]').forEach(input => {
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('change', async (e) => {
      await supabaseClient.from('gallery_photos').update({ full_quality: e.target.checked }).eq('id', input.dataset.id);
    });
  });

  updateBulkBar();
}

document.getElementById('cg-bulk-clear').addEventListener('click', () => { cgSelectedIds = new Set(); renderClientGalleryPhotos(); });
document.getElementById('cg-bulk-delete').addEventListener('click', async () => {
  if (!cgSelectedIds.size || !confirm(`¿Eliminar ${cgSelectedIds.size} archivo(s)?`)) return;
  await supabaseClient.from('gallery_photos').delete().in('id', [...cgSelectedIds]);
  cgSelectedIds = new Set();
  await renderClientGalleryPhotos();
});
document.getElementById('cg-bulk-quality').addEventListener('change', async (e) => {
  if (!cgSelectedIds.size) return;
  await supabaseClient.from('gallery_photos').update({ full_quality: e.target.checked }).in('id', [...cgSelectedIds]);
  await renderClientGalleryPhotos();
});

// ---------- Attachments ----------
document.getElementById('cg-attachment-input').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!files.length || !currentGalleryRow) return;
  const { count } = await supabaseClient.from('gallery_attachments').select('*', { count: 'exact', head: true }).eq('gallery_id', currentGalleryRow.id);
  let sortOrder = count || 0;
  for (const file of files) {
    const url = await uploadFileWithProgress(file, mediaPath(`galleries/${currentGalleryRow.id}/attachments`, file));
    if (url) {
      await supabaseClient.from('gallery_attachments').insert({
        gallery_id: currentGalleryRow.id, file_url: url, filename: file.name,
        mime_type: file.type || null, size_bytes: file.size, sort_order: sortOrder++,
      });
    }
  }
  await renderClientGalleryAttachments();
  refreshPreviewFrame();
});

async function renderClientGalleryAttachments() {
  const container = document.getElementById('cg-attachments-list');
  if (!currentGalleryRow) { container.innerHTML = ''; return; }
  const { data: atts, error } = await supabaseClient.from('gallery_attachments').select('*').eq('gallery_id', currentGalleryRow.id).order('sort_order');
  if (error) { container.innerHTML = '<p class="panel-sub">No se pudo cargar los archivos adjuntos (¿has ejecutado supabase/migration_gallery_v2.sql?).</p>'; return; }
  if (!atts || !atts.length) { container.innerHTML = '<p class="panel-sub">Todavía no has añadido archivos adjuntos.</p>'; return; }
  container.innerHTML = atts.map(a => `
    <div class="cg-attachment-row">
      <span class="cg-att-icon" style="background:${extColor(extIcon(a.filename))};">${extIcon(a.filename)}</span>
      <input class="cg-att-name" data-id="${a.id}" value="${escapeAttr(a.filename)}" readonly>
      <span class="cg-att-size">${formatFileSize(a.size_bytes)}</span>
      <div class="cg-att-actions">
        <button type="button" data-action="rename" data-id="${a.id}" title="Renombrar">✎</button>
        <a href="${a.file_url}" download="${escapeAttr(a.filename)}" title="Descargar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a>
        <button type="button" data-action="delete-attachment" data-id="${a.id}" title="Eliminar" style="color:var(--og-bad);">✕</button>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('[data-action="rename"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = container.querySelector(`.cg-att-name[data-id="${btn.dataset.id}"]`);
      input.readOnly = false;
      input.focus();
      input.select();
    });
  });
  container.querySelectorAll('.cg-att-name').forEach(input => {
    const save = async () => {
      input.readOnly = true;
      const val = input.value.trim();
      if (val) await supabaseClient.from('gallery_attachments').update({ filename: val }).eq('id', input.dataset.id);
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  });
  container.querySelectorAll('[data-action="delete-attachment"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este archivo adjunto?')) return;
      await supabaseClient.from('gallery_attachments').delete().eq('id', btn.dataset.id);
      renderClientGalleryAttachments();
    });
  });
}

// ---------- Activity (favoritas, descargas, última visita) ----------
async function renderClientGalleryActivity() {
  if (!currentGalleryRow) return;
  const [{ count: favCount }, { count: dlCount }, { data: lastVisit }] = await Promise.all([
    supabaseClient.from('gallery_favorites').select('*', { count: 'exact', head: true }).eq('gallery_id', currentGalleryRow.id),
    supabaseClient.from('gallery_downloads').select('*', { count: 'exact', head: true }).eq('gallery_id', currentGalleryRow.id),
    supabaseClient.from('gallery_visits').select('created_at').eq('gallery_id', currentGalleryRow.id).order('created_at', { ascending: false }).limit(1),
  ]);
  document.getElementById('cg-stat-favorites').textContent = String(favCount || 0);
  document.getElementById('cg-stat-downloads').textContent = String(dlCount || 0);
  const last = (lastVisit || [])[0];
  document.getElementById('cg-stat-last-visit').textContent = last ? new Date(last.created_at).toLocaleString() : 'Sin visitas todavía';
}

async function renderClientGalleryRevisions() {
  const container = document.getElementById('cg-revisions');
  if (!currentGalleryRow) { container.innerHTML = ''; return; }
  const { data: revisions, error } = await supabaseClient.from('gallery_revisions').select('*').eq('gallery_id', currentGalleryRow.id).order('created_at', { ascending: false });
  if (error) { container.innerHTML = '<p class="panel-sub">No se pudo cargar las revisiones (¿has ejecutado supabase/migration_gallery_revisions.sql?).</p>'; return; }
  if (!revisions || !revisions.length) { container.innerHTML = '<p class="panel-sub">Todavía no hay peticiones de revisión.</p>'; return; }

  const { data: photos } = await supabaseClient.from('gallery_photos').select('*').eq('gallery_id', currentGalleryRow.id);
  const photoById = Object.fromEntries((photos || []).map(p => [p.id, p]));

  container.innerHTML = '';
  for (const rev of revisions) {
    const { data: links } = await supabaseClient.from('gallery_revision_photos').select('*').eq('revision_id', rev.id);
    const thumbs = (links || []).map(l => photoById[l.photo_id]).filter(Boolean);
    const isResolved = rev.status === 'resolved';
    const card = document.createElement('div');
    card.className = 'og-card og-card-pad';
    card.style.marginBottom = '10px';
    card.innerHTML = `
      <div style="display:flex; gap:8px; margin-bottom:8px;">
        ${thumbs.map(p => `<img src="${p.poster_url || p.image_url}" alt="" style="width:48px; height:48px; object-fit:cover; border-radius:8px;">`).join('') || '<span class="panel-sub" style="margin:0;">(foto eliminada)</span>'}
      </div>
      <p style="margin:0 0 8px;">${escapeHtml(rev.comment)}</p>
      <span style="font-size:.72rem; font-weight:600; padding:3px 10px; border-radius:999px; ${isResolved ? 'background:rgba(70,180,110,.18); color:#2f9e5c;' : 'background:rgba(255,140,50,.18); color:#c96a1c;'}">${isResolved ? 'Resuelta' : 'Pendiente'}</span>
      <div style="margin-top:10px;">
        <textarea data-reply-for="${rev.id}" placeholder="Escribe una respuesta (opcional)" style="width:100%; min-height:60px; padding:8px 10px; border-radius:10px; border:1px solid var(--og-line); background:var(--og-bg); color:var(--og-fg); font-family:inherit; resize:vertical;">${escapeHtml(rev.reply || '')}</textarea>
        <div style="display:flex; gap:8px; margin-top:6px;">
          <button type="button" class="og-btn og-btn-outline og-btn-sm" data-action="save-reply" data-id="${rev.id}">Guardar respuesta</button>
          ${!isResolved ? `<button type="button" class="og-btn og-btn-solid og-btn-sm" data-action="resolve-revision" data-id="${rev.id}">Marcar como resuelta</button>` : ''}
        </div>
      </div>
    `;
    container.appendChild(card);
  }
  container.querySelectorAll('[data-action="save-reply"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const textarea = container.querySelector(`[data-reply-for="${btn.dataset.id}"]`);
      await supabaseClient.from('gallery_revisions').update({ reply: textarea.value.trim() || null }).eq('id', btn.dataset.id);
      renderClientGalleryRevisions();
    });
  });
  container.querySelectorAll('[data-action="resolve-revision"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('gallery_revisions').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', btn.dataset.id);
      renderClientGalleryRevisions();
    });
  });
}

document.getElementById('cg-save').addEventListener('click', async () => {
  if (!currentGalleryRow) return;
  const statusEl = document.getElementById('cg-status');
  const is_active = document.getElementById('cg-active').checked;
  const status = is_active ? 'published' : (currentGalleryRow.status === 'draft' ? 'draft' : 'disabled');
  const client_name = document.getElementById('cg-client-name').value.trim() || null;
  const download_url = document.getElementById('cg-download-url').value.trim() || null;
  const expiresVal = document.getElementById('cg-expires').value;
  const expires_at = expiresVal ? new Date(`${expiresVal}T23:59:59`).toISOString() : null;
  const pinEnabled = document.getElementById('cg-pin-toggle').checked;
  const pinValue = document.getElementById('cg-pin').value.trim();

  const { error } = await supabaseClient.from('client_galleries')
    .update({ is_active, status, client_name, download_url, expires_at }).eq('id', currentGalleryRow.id);

  let pinError = null;
  if (!pinEnabled) {
    ({ error: pinError } = await supabaseClient.rpc('gallery_set_pin', { p_gallery_id: currentGalleryRow.id, p_pin: null }));
  } else if (pinValue) {
    ({ error: pinError } = await supabaseClient.rpc('gallery_set_pin', { p_gallery_id: currentGalleryRow.id, p_pin: pinValue }));
  }

  statusEl.hidden = false;
  statusEl.textContent = (error || pinError) ? ('Error: ' + (error || pinError).message) : 'Guardado.';
  if (!error) {
    currentGalleryRow = { ...currentGalleryRow, is_active, status, client_name, download_url, expires_at, has_pin: pinEnabled };
    renderStatusPill();
    document.getElementById('cg-pin').value = '';
    document.getElementById('cg-pin-hint').textContent = pinEnabled ? 'Ya hay un PIN guardado — escribe uno nuevo solo si quieres cambiarlo.' : '';
    refreshPreviewFrame();
  }
});

document.getElementById('cg-copy-link').addEventListener('click', async () => {
  if (!currentGalleryRow?.share_token) return;
  const url = galleryShareUrl(currentGalleryRow.share_token);
  try {
    await navigator.clipboard.writeText(url);
    const btn = document.getElementById('cg-copy-link');
    const original = btn.textContent;
    btn.textContent = '¡Copiado!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  } catch (e) { alert(url); }
});

// ============================================================
// Galerías y archivos multimedia
// ============================================================
async function loadGalleries() {
  const [{ data: categories }, { data: projects }] = await Promise.all([
    supabaseClient.from('portfolio_categories').select('*').order('sort_order'),
    supabaseClient.from('portfolio_projects').select('*').order('sort_order'),
  ]);

  const groupsEl = document.getElementById('gallery-groups');
  groupsEl.innerHTML = '';
  (categories || []).forEach(cat => {
    const items = (projects || []).filter(p => p.category_id === cat.id);
    const group = document.createElement('div');
    group.className = 'gallery-group';
    group.innerHTML = `
      <div class="gallery-group-head"><h3>${escapeHtml(cat.name)}</h3><span>${items.length} proyecto${items.length === 1 ? '' : 's'}</span></div>
      <div class="album-grid album-grid-compact">
        ${items.length ? items.map(p => `
          <div class="album-card album-card-compact">
            <div class="album-stack">
              <span class="album-ghost album-ghost-1"></span>
              <span class="album-ghost album-ghost-2"></span>
              ${p.cover_image_url ? `<img class="album-photo" src="${p.cover_image_url}" alt="">` : `<span class="album-photo album-photo-empty"><span>–</span></span>`}
            </div>
            <div class="album-info"><span class="album-title">${escapeHtml(p.title)}</span></div>
          </div>
        `).join('') : '<p class="panel-sub">Sin proyectos en esta categoría.</p>'}
      </div>
    `;
    groupsEl.appendChild(group);
  });

  const mediaEl = document.getElementById('media-library');
  const { data: files, error } = await supabaseClient.storage.from('media').list('portfolio', {
    limit: 60, sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error || !files || !files.length) {
    mediaEl.innerHTML = '<p class="panel-sub">Todavía no has subido archivos.</p>';
  } else {
    mediaEl.innerHTML = files.filter(f => f.name && !f.name.startsWith('.')).map(f => {
      const { data } = supabaseClient.storage.from('media').getPublicUrl(`portfolio/${f.name}`);
      return `<div class="media-item"><img src="${data?.publicUrl || ''}" alt="${escapeAttr(f.name)}" loading="lazy"></div>`;
    }).join('');
  }
}

// ============================================================
// Servicios (shared between the dedicated tab and the Content editor)
// ============================================================
function serviceFieldsMarkup(esServices, enServices) {
  return [0, 1, 2, 3, 4].map(i => `
    <div class="content-field draggable" draggable="true">
      ${dragHandleSvg}
      <div class="content-field-body">
        <label class="content-field-label">Servicio ${i + 1}</label>
        <div class="content-field-row">
          <input type="text" data-service-lang="es" value="${escapeAttr((esServices || [])[i] || '')}" placeholder="Español">
          <input type="text" data-service-lang="en" value="${escapeAttr((enServices || [])[i] || '')}" placeholder="English">
        </div>
      </div>
    </div>
  `).join('');
}

async function fetchServiceLists() {
  const { data } = await supabaseClient.from('site_content').select('key, lang, value').eq('key', 'serviceList');
  const defaults = window.DEFAULT_COPY || { en: {}, es: {} };
  let es = defaults.es.serviceList || [];
  let en = defaults.en.serviceList || [];
  (data || []).forEach(row => {
    try {
      const list = JSON.parse(row.value);
      if (Array.isArray(list) && list.length) { if (row.lang === 'es') es = list; else en = list; }
    } catch (e) { /* ignore malformed override */ }
  });
  return { es, en };
}

async function loadServicesInto(containerId, onChange) {
  const container = document.getElementById(containerId);
  const { es, en } = await fetchServiceLists();
  container.innerHTML = serviceFieldsMarkup(es, en);
  enableDragReorder(container, '.content-field.draggable', () => { if (onChange) onChange(); });
  container.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { if (onChange) onChange(); }));
}

async function saveServiceLists(containerId, statusEl) {
  const container = document.getElementById(containerId);
  const esServices = [...container.querySelectorAll('[data-service-lang="es"]')].map(el => el.value);
  const enServices = [...container.querySelectorAll('[data-service-lang="en"]')].map(el => el.value);
  const rows = [
    { key: 'serviceList', lang: 'es', value: JSON.stringify(esServices) },
    { key: 'serviceList', lang: 'en', value: JSON.stringify(enServices) },
  ];
  const { error } = await supabaseClient.from('site_content').upsert(rows, { onConflict: 'key,lang' });
  if (statusEl) {
    statusEl.hidden = false;
    statusEl.textContent = error ? ('Error: ' + error.message) : 'Guardado. Ya está publicado en la web.';
  }
  return !error;
}

async function loadServices() {
  await loadServicesInto('services-fields');
}

document.getElementById('services-save').addEventListener('click', async () => {
  const ok = await saveServiceLists('services-fields', document.getElementById('services-status'));
  if (ok && document.getElementById('content-services').innerHTML) await loadServicesInto('content-services', onContentFieldChanged);
});

// ============================================================
// Contenido del sitio (live preview + hero/textos + AI assistant)
// ============================================================
const HERO_KEYS = ['eyebrow', 'headline', 'explore', 'workBlurb'];
const TEXT_KEYS = (window.CONTENT_FIELD_ORDER || []).filter(k => !HERO_KEYS.includes(k));

let contentOverrides = {};
let previewLang = 'es';
let autosaveTimer = null;

function contentKey(key, lang) { return `${key}|${lang}`; }

function fieldsMarkup(keys) {
  const labels = window.CONTENT_FIELD_LABELS || {};
  const defaults = window.DEFAULT_COPY || { en: {}, es: {} };
  return keys.map(key => `
    <div class="content-field">
      <div class="content-field-body">
        <label class="content-field-label">${escapeHtml(labels[key] || key)}</label>
        <div class="content-field-row">
          <textarea data-key="${key}" data-lang="es" rows="2" placeholder="Español">${escapeHtml(contentOverrides[contentKey(key, 'es')] ?? defaults.es[key] ?? '')}</textarea>
          <textarea data-key="${key}" data-lang="en" rows="2" placeholder="English">${escapeHtml(contentOverrides[contentKey(key, 'en')] ?? defaults.en[key] ?? '')}</textarea>
        </div>
      </div>
    </div>
  `).join('');
}

function collectFieldValues(lang) {
  const fields = {};
  document.querySelectorAll(`#content-fields-hero textarea[data-lang="${lang}"], #content-fields-textos textarea[data-lang="${lang}"]`).forEach(el => {
    fields[el.dataset.key] = el.value;
  });
  return fields;
}
function collectServiceList(lang) {
  return [...document.querySelectorAll(`#content-services [data-service-lang="${lang}"]`)].map(el => el.value);
}

function sendPreview() {
  const frame = document.getElementById('preview-frame');
  if (!frame || !frame.contentWindow) return;
  const fields = collectFieldValues(previewLang);
  const serviceList = collectServiceList(previewLang);
  try {
    frame.contentWindow.postMessage({ type: 'og-preview', lang: previewLang, fields, serviceList }, window.location.origin);
  } catch (e) { /* iframe not same-origin-ready yet */ }
}
document.getElementById('preview-frame').addEventListener('load', () => sendPreview());

document.querySelectorAll('[data-preview-lang]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-preview-lang]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    previewLang = btn.dataset.previewLang;
    sendPreview();
  });
});

document.querySelectorAll('.og-edit-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.og-edit-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.og-edit-section').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`.og-edit-section[data-edit-panel="${tab.dataset.editSection}"]`).classList.add('active');
  });
});

function markContentDirty() {
  const bar = document.getElementById('save-bar');
  bar.classList.add('dirty');
  bar.classList.remove('saved');
}
function setSaveBarState(state) {
  const bar = document.getElementById('save-bar');
  bar.classList.toggle('dirty', state === 'dirty');
  bar.classList.toggle('saved', state === 'saved');
}

function currentFullDraft() {
  return {
    es: collectFieldValues('es'), en: collectFieldValues('en'),
    servicesEs: collectServiceList('es'), servicesEn: collectServiceList('en'),
    savedAt: Date.now(),
  };
}
function saveDraftToLocalStorage() {
  try { localStorage.setItem('og_studio_draft', JSON.stringify(currentFullDraft())); } catch (e) {}
}
function loadDraftFromLocalStorage() {
  try { return JSON.parse(localStorage.getItem('og_studio_draft') || 'null'); } catch (e) { return null; }
}
function clearDraft() {
  try { localStorage.removeItem('og_studio_draft'); } catch (e) {}
}
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveDraftToLocalStorage, 600);
}
function onContentFieldChanged() {
  markContentDirty();
  sendPreview();
  scheduleAutosave();
}

async function loadSiteContent() {
  const { data, error } = await supabaseClient.from('site_content').select('key, lang, value');
  if (error) console.error(error);
  contentOverrides = {};
  (data || []).forEach(row => { contentOverrides[contentKey(row.key, row.lang)] = row.value; });

  document.getElementById('content-fields-hero').innerHTML = fieldsMarkup(HERO_KEYS);
  document.getElementById('content-fields-textos').innerHTML = fieldsMarkup(TEXT_KEYS);
  await loadServicesInto('content-services', onContentFieldChanged);

  document.querySelectorAll('#content-fields-hero textarea, #content-fields-textos textarea').forEach(el => {
    el.addEventListener('input', onContentFieldChanged);
  });

  const draft = loadDraftFromLocalStorage();
  if (draft) {
    Object.entries(draft.es || {}).forEach(([key, val]) => {
      const el = document.querySelector(`[data-key="${key}"][data-lang="es"]`); if (el) el.value = val;
    });
    Object.entries(draft.en || {}).forEach(([key, val]) => {
      const el = document.querySelector(`[data-key="${key}"][data-lang="en"]`); if (el) el.value = val;
    });
    const esInputs = [...document.querySelectorAll('#content-services [data-service-lang="es"]')];
    (draft.servicesEs || []).forEach((val, i) => { if (esInputs[i]) esInputs[i].value = val; });
    const enInputs = [...document.querySelectorAll('#content-services [data-service-lang="en"]')];
    (draft.servicesEn || []).forEach((val, i) => { if (enInputs[i]) enInputs[i].value = val; });
    markContentDirty();
  } else {
    setSaveBarState('saved');
  }
  sendPreview();
}

document.getElementById('content-save').addEventListener('click', async () => {
  const saveBtn = document.getElementById('content-save');
  saveBtn.disabled = true;
  const rows = [];
  document.querySelectorAll('#content-fields-hero textarea, #content-fields-textos textarea').forEach(el => {
    rows.push({ key: el.dataset.key, lang: el.dataset.lang, value: el.value });
  });
  rows.push({ key: 'serviceList', lang: 'es', value: JSON.stringify(collectServiceList('es')) });
  rows.push({ key: 'serviceList', lang: 'en', value: JSON.stringify(collectServiceList('en')) });

  const { error } = await supabaseClient.from('site_content').upsert(rows, { onConflict: 'key,lang' });
  saveBtn.disabled = false;
  if (error) { alert('Error al guardar: ' + error.message); return; }
  clearDraft();
  setSaveBarState('saved');
  if (document.getElementById('services-fields').innerHTML) await loadServicesInto('services-fields');
});

// ---------- AI assistant (proposes changes, admin approves) ----------
let pendingAiChanges = [];

function setAiStatus(text) {
  const el = document.getElementById('ai-status');
  if (!text) { el.hidden = true; el.textContent = ''; return; }
  el.hidden = false;
  el.textContent = text;
}

document.getElementById('ai-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = document.getElementById('ai-prompt').value.trim();
  if (!prompt) return;
  const submitBtn = document.getElementById('ai-submit');
  const orb = document.getElementById('ai-orb');
  submitBtn.disabled = true;
  if (orb) orb.classList.add('thinking');
  setAiStatus('Pensando…');
  document.getElementById('ai-changes').innerHTML = '';

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const [{ data: contentRows }, { data: projects }] = await Promise.all([
      supabaseClient.from('site_content').select('key, lang, value'),
      supabaseClient.from('portfolio_projects').select('id, title, layout_class, is_published').order('sort_order'),
    ]);

    const res = await fetch('/api/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({
        prompt,
        defaultCopy: window.DEFAULT_COPY,
        contentOverrides: contentRows || [],
        projects: projects || [],
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Error ${res.status}`);

    pendingAiChanges = Array.isArray(json.changes) ? json.changes : [];
    renderAiChanges(json.summary || '', pendingAiChanges);
    setAiStatus(pendingAiChanges.length ? '' : (json.summary || 'No he encontrado ningún cambio que aplicar para eso.'));
  } catch (err) {
    setAiStatus('Error: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    if (orb) orb.classList.remove('thinking');
  }
});

function renderAiChanges(summary, changes) {
  const container = document.getElementById('ai-changes');
  if (!changes.length) { container.innerHTML = ''; return; }
  container.innerHTML = `
    ${summary ? `<p class="ai-summary">${escapeHtml(summary)}</p>` : ''}
    <div class="ai-diff-list">
      ${changes.map((c, i) => `
        <div class="ai-diff-card" data-index="${i}">
          <div class="ai-diff-field">${describeAiChange(c)}</div>
          <div class="ai-diff-old">${escapeHtml(c.old_value ?? '(vacío)')}</div>
          <div class="ai-diff-arrow">→</div>
          <div class="ai-diff-new">${escapeHtml(c.new_value ?? '')}</div>
        </div>
      `).join('')}
    </div>
    <div class="ai-actions">
      <button type="button" class="og-btn og-btn-outline" id="ai-discard">Descartar</button>
      <button type="button" class="og-btn og-btn-solid" id="ai-apply">Aplicar cambios</button>
    </div>
  `;
  document.getElementById('ai-discard').addEventListener('click', () => {
    pendingAiChanges = [];
    container.innerHTML = '';
    setAiStatus('');
  });
  document.getElementById('ai-apply').addEventListener('click', applyAiChanges);
}

function describeAiChange(c) {
  const labels = window.CONTENT_FIELD_LABELS || {};
  if (c.table === 'site_content') {
    const label = labels[c.key] || c.key;
    return `${escapeHtml(label)} (${c.lang === 'es' ? 'Español' : 'English'})`;
  }
  if (c.table === 'portfolio_projects') {
    return `Proyecto "${escapeHtml(c.title || c.id)}" — ${c.field === 'layout_class' ? 'tamaño de la foto' : escapeHtml(c.field)}`;
  }
  return `${escapeHtml(c.table)}.${escapeHtml(c.field || c.key)}`;
}

async function applyAiChanges() {
  setAiStatus('Aplicando…');
  for (const c of pendingAiChanges) {
    if (c.table === 'site_content') {
      await supabaseClient.from('site_content')
        .upsert({ key: c.key, lang: c.lang, value: c.new_value }, { onConflict: 'key,lang' });
    } else if (c.table === 'portfolio_projects' && c.id && c.field) {
      await supabaseClient.from('portfolio_projects').update({ [c.field]: c.new_value }).eq('id', c.id);
    }
  }
  pendingAiChanges = [];
  document.getElementById('ai-changes').innerHTML = '';
  setAiStatus('Cambios publicados en la web.');
  document.getElementById('ai-prompt').value = '';
  clearDraft();
  await loadSiteContent();
}

// ============================================================
// UGC (proyectos + posts sociales)
// ============================================================
async function loadUgc() {
  const { data: categories } = await supabaseClient.from('portfolio_categories').select('*');
  const ugcCat = (categories || []).find(c => (c.slug || '').toLowerCase() === 'ugc' || (c.name || '').toLowerCase().includes('ugc'));
  const listEl = document.getElementById('ugc-project-list');
  if (!ugcCat) {
    listEl.innerHTML = '<p class="panel-sub">Crea una categoría "UGC" en Proyectos para verla aquí.</p>';
  } else {
    const { data: projects } = await supabaseClient.from('portfolio_projects').select('*').eq('category_id', ugcCat.id).order('sort_order');
    listEl.innerHTML = (projects && projects.length) ? projects.map(p => `
      <div class="album-card album-card-compact">
        <div class="album-stack">
          <span class="album-ghost album-ghost-1"></span>
          <span class="album-ghost album-ghost-2"></span>
          ${p.cover_image_url ? `<img class="album-photo" src="${p.cover_image_url}" alt="">` : `<span class="album-photo album-photo-empty"><span>–</span></span>`}
        </div>
        <div class="album-info"><span class="album-title">${escapeHtml(p.title)}</span></div>
      </div>
    `).join('') : '<p class="panel-sub">Todavía no hay proyectos UGC.</p>';
  }
  await loadSocial();
}

async function loadSocial() {
  const { data, error } = await supabaseClient.from('social_posts').select('*').order('sort_order');
  if (error) return console.error(error);
  const list = document.getElementById('social-list');
  list.innerHTML = '';
  if (!data.length) { list.innerHTML = '<p class="panel-sub">Todavía no hay publicaciones.</p>'; return; }
  data.forEach(post => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${escapeHtml(post.platform)} <small>${escapeHtml(post.external_url)}</small></span>
      <label class="checkbox-label"><input type="checkbox" ${post.is_selected ? 'checked' : ''}> Seleccionado</label>
      <button class="link-btn" data-action="delete">Eliminar</button>
    `;
    row.querySelector('input').addEventListener('change', async (e) => {
      await supabaseClient.from('social_posts').update({ is_selected: e.target.checked }).eq('id', post.id);
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      await supabaseClient.from('social_posts').delete().eq('id', post.id);
      loadSocial();
    });
    list.appendChild(row);
  });
}

document.getElementById('social-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const platform = document.getElementById('social-platform').value;
  const external_url = document.getElementById('social-url').value.trim();
  if (!external_url) return;
  const { error } = await supabaseClient.from('social_posts').insert({ platform, external_url });
  if (error) return alert(error.message);
  e.target.reset();
  loadSocial();
});

// ============================================================
// Mensajes y solicitudes (enquiries)
// ============================================================
async function loadEnquiries() {
  const { data, error } = await supabaseClient.from('enquiries').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);
  const list = document.getElementById('enquiry-list');
  list.innerHTML = '';
  if (!data.length) { list.innerHTML = '<p class="panel-sub">Todavía no hay mensajes.</p>'; return; }
  data.forEach(en => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${escapeHtml(en.name)} — ${escapeHtml(en.service || 'Sin servicio')} <small>${escapeHtml(en.email)}</small></span>
      <select data-field="status">
        <option value="new">Nuevo</option>
        <option value="contacted">Contactado</option>
        <option value="archived">Archivado</option>
      </select>
    `;
    row.querySelector('[data-field="status"]').value = en.status;
    row.querySelector('[data-field="status"]').addEventListener('change', async (e) => {
      await supabaseClient.from('enquiries').update({ status: e.target.value }).eq('id', en.id);
      updateMessageBadge();
    });
    list.appendChild(row);
  });
}

// ============================================================
// Clientes
// ============================================================
async function loadClients() {
  const { data, error } = await supabaseClient.from('clients').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);
  const list = document.getElementById('client-list');
  list.innerHTML = '';
  if (!data.length) { list.innerHTML = '<p class="panel-sub">Todavía no hay clientes.</p>'; return; }
  data.forEach(c => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${escapeHtml(c.name)} <small>${escapeHtml([c.email, c.phone].filter(Boolean).join(' · ') || '—')}</small></span>
      <button class="link-btn" data-action="delete">Eliminar</button>
    `;
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${c.name}"?`)) return;
      await supabaseClient.from('clients').delete().eq('id', c.id);
      loadClients();
    });
    list.appendChild(row);
  });
}

document.getElementById('client-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('client-name').value.trim();
  const email = document.getElementById('client-email').value.trim() || null;
  const phone = document.getElementById('client-phone').value.trim() || null;
  if (!name) return;
  const { error } = await supabaseClient.from('clients').insert({ name, email, phone });
  if (error) return alert(error.message);
  e.target.reset();
  loadClients();
});

// ============================================================
// Reservas y calendario (projects table)
// ============================================================
async function loadCalendar() {
  await populateClientSelect(document.getElementById('job-client'));
  const { data, error } = await supabaseClient
    .from('projects').select('*, clients(name)').order('event_date', { ascending: true, nullsFirst: false });
  if (error) return console.error(error);
  const list = document.getElementById('job-list');
  list.innerHTML = '';
  if (!data.length) { list.innerHTML = '<p class="panel-sub">Todavía no hay reservas.</p>'; return; }
  data.forEach(job => {
    const row = document.createElement('div');
    row.className = 'list-row';
    const dateLabel = job.event_date ? new Date(job.event_date + 'T00:00:00').toLocaleDateString() : 'Sin fecha';
    row.innerHTML = `
      <span>${escapeHtml(job.title)} <small>${dateLabel}${job.clients?.name ? ' · ' + escapeHtml(job.clients.name) : ''}</small></span>
      <select data-field="status">
        <option value="enquiry">Consulta</option>
        <option value="confirmed">Confirmada</option>
        <option value="in_progress">En curso</option>
        <option value="delivered">Entregada</option>
        <option value="cancelled">Cancelada</option>
      </select>
      <button class="link-btn" data-action="delete">Eliminar</button>
    `;
    row.querySelector('[data-field="status"]').value = job.status;
    row.querySelector('[data-field="status"]').addEventListener('change', async (e) => {
      await supabaseClient.from('projects').update({ status: e.target.value }).eq('id', job.id);
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${job.title}"?`)) return;
      await supabaseClient.from('projects').delete().eq('id', job.id);
      loadCalendar();
    });
    list.appendChild(row);
  });
}

document.getElementById('job-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('job-title').value.trim();
  const client_id = document.getElementById('job-client').value || null;
  const event_date = document.getElementById('job-date').value || null;
  const status = document.getElementById('job-status').value;
  if (!title) return;
  const { error } = await supabaseClient.from('projects').insert({ title, client_id, event_date, status });
  if (error) return alert(error.message);
  e.target.reset();
  loadCalendar();
});

// ============================================================
// Analíticas (solo datos reales — nunca cifras inventadas)
// ============================================================
const icon = {
  projects: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  clients: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  messages: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="m22 6-10 7L2 6"/></svg>',
  bookings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  quotes: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
};

async function loadAnalytics() {
  const [
    { count: totalProjects }, { count: publishedProjects }, { count: totalClients },
    { count: totalMessages }, { count: newMessages }, { count: totalBookings }, { count: acceptedQuotes },
  ] = await Promise.all([
    supabaseClient.from('portfolio_projects').select('*', { count: 'exact', head: true }),
    supabaseClient.from('portfolio_projects').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabaseClient.from('clients').select('*', { count: 'exact', head: true }),
    supabaseClient.from('enquiries').select('*', { count: 'exact', head: true }),
    supabaseClient.from('enquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabaseClient.from('projects').select('*', { count: 'exact', head: true }),
    supabaseClient.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
  ]);

  const stat = (cls, svg, num, label) => `
    <div class="og-stat">
      <span class="og-stat-icon ${cls}">${svg}</span>
      <span class="og-stat-num">${num ?? 0}</span>
      <span class="og-stat-label">${label}</span>
    </div>`;

  document.getElementById('analytics-grid').innerHTML = [
    stat('a', icon.projects, totalProjects, 'Proyectos totales'),
    stat('b', icon.projects, publishedProjects, 'Proyectos publicados'),
    stat('c', icon.clients, totalClients, 'Clientes'),
    stat('d', icon.messages, totalMessages, 'Mensajes recibidos'),
    stat('a', icon.messages, newMessages, 'Mensajes sin leer'),
    stat('b', icon.bookings, totalBookings, 'Reservas totales'),
    stat('c', icon.quotes, acceptedQuotes, 'Presupuestos aceptados'),
  ].join('');

  document.getElementById('analytics-ga-note').hidden = false;
}

// ============================================================
// Inventario
// ============================================================
async function loadInventory() {
  const { data, error } = await supabaseClient.from('inventory_items').select('*').order('name');
  if (error) return console.error(error);
  const list = document.getElementById('inventory-list');
  list.innerHTML = '';
  if (!data.length) { list.innerHTML = '<p class="panel-sub">Todavía no hay inventario.</p>'; return; }
  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${escapeHtml(item.name)} <small>${escapeHtml(item.category || '—')}</small></span>
      <span class="status-pill">${item.reserved_quantity}/${item.quantity} reservado</span>
      <button class="link-btn" data-action="delete">Eliminar</button>
    `;
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${item.name}"?`)) return;
      await supabaseClient.from('inventory_items').delete().eq('id', item.id);
      loadInventory();
    });
    list.appendChild(row);
  });
}

document.getElementById('inventory-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('inventory-name').value.trim();
  const category = document.getElementById('inventory-category').value.trim() || null;
  const quantity = parseInt(document.getElementById('inventory-quantity').value, 10) || 0;
  if (!name) return;
  const { error } = await supabaseClient.from('inventory_items').insert({ name, category, quantity });
  if (error) return alert(error.message);
  e.target.reset();
  loadInventory();
});

// ============================================================
// Presupuestos y contratos
// ============================================================
async function loadQuotes() {
  await populateClientSelect(document.getElementById('quote-client'));
  const { data, error } = await supabaseClient
    .from('quotes').select('*, clients(name)').order('created_at', { ascending: false });
  if (error) return console.error(error);
  const list = document.getElementById('quote-list');
  list.innerHTML = '';
  if (!data.length) { list.innerHTML = '<p class="panel-sub">Todavía no hay presupuestos.</p>'; return; }
  data.forEach(q => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${escapeHtml(q.clients?.name || 'Sin cliente')} <small>${q.amount ? '€' + q.amount : 'Sin importe'}</small></span>
      <select data-field="status">
        <option value="draft">Borrador</option>
        <option value="sent">Enviado</option>
        <option value="accepted">Aceptado</option>
        <option value="declined">Rechazado</option>
      </select>
      <button class="link-btn" data-action="delete">Eliminar</button>
    `;
    row.querySelector('[data-field="status"]').value = q.status;
    row.querySelector('[data-field="status"]').addEventListener('change', async (e) => {
      await supabaseClient.from('quotes').update({ status: e.target.value }).eq('id', q.id);
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm('¿Eliminar este presupuesto?')) return;
      await supabaseClient.from('quotes').delete().eq('id', q.id);
      loadQuotes();
    });
    list.appendChild(row);
  });
}

document.getElementById('quote-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const client_id = document.getElementById('quote-client').value || null;
  const amountRaw = document.getElementById('quote-amount').value.trim();
  const amount = amountRaw ? parseFloat(amountRaw) : null;
  const status = document.getElementById('quote-status').value;
  const { error } = await supabaseClient.from('quotes').insert({ client_id, amount, status });
  if (error) return alert(error.message);
  e.target.reset();
  loadQuotes();
});

// ============================================================
// Ajustes
// ============================================================
async function loadSettings() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  document.getElementById('settings-email').textContent = session?.user?.email || '—';
  await renderSetupBanner();
}

async function renderSetupBanner() {
  const slot = document.getElementById('setup-banner-slot');
  slot.innerHTML = '';
  const { error } = await supabaseClient.from('portfolio_projects').select('status').limit(1);
  if (error) {
    slot.innerHTML = `
      <div class="og-card og-card-pad og-setup-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <b>Falta una migración de base de datos</b>
          <p>Ejecuta <code>supabase/migration_dashboard_v2.sql</code> en el editor SQL de Supabase para activar los estados de proyecto (borrador/publicado/oculto). Mientras tanto, Studio sigue funcionando con el campo antiguo "publicado".</p>
        </div>
      </div>`;
  }
}

checkSession();
