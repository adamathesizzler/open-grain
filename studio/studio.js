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
const statusLabels = { enquiry: 'Consulta', confirmed: 'Confirmada', in_progress: 'En curso', delivered: 'Entregada', cancelled: 'Cancelada', draft: 'Borrador', sent: 'Enviado', accepted: 'Aceptado', declined: 'Rechazado', new: 'Nuevo', contacted: 'Contactado', archived: 'Archivado' };

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
  activePanel.querySelectorAll('.list-row, .album-card, .category-row, .client-card').forEach(row => {
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
      const url = data?.publicUrl || '';
      return `
        <div class="media-item">
          <img src="${url}" alt="${escapeAttr(f.name)}" loading="lazy">
          <div class="media-item-actions">
            <button type="button" class="media-item-btn" data-action="copy-media-url" data-url="${escapeAttr(url)}" title="Copiar URL">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
            <button type="button" class="media-item-btn media-item-btn-danger" data-action="delete-media" data-name="${escapeAttr(f.name)}" title="Eliminar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>`;
    }).join('');
    mediaEl.querySelectorAll('[data-action="copy-media-url"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.url);
          const original = btn.title;
          btn.title = '¡Copiado!';
          setTimeout(() => { btn.title = original; }, 1500);
        } catch (e) { alert(btn.dataset.url); }
      });
    });
    mediaEl.querySelectorAll('[data-action="delete-media"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar "${btn.dataset.name}"? Si esta foto se usa como portada de un proyecto o en el contenido del sitio, dejará de verse ahí.`)) return;
        const { error: delError } = await supabaseClient.storage.from('media').remove([`portfolio/${btn.dataset.name}`]);
        if (delError) { alert('No se pudo eliminar: ' + delError.message); return; }
        await loadGalleries();
      });
    });
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
// Clientes (tarjetas estilo CRM: estadísticas + ficha de detalle)
// ============================================================
let allClientsCache = [];
let currentClientFilter = 'all';
let selectedClientId = null;

const clientIconNew = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M17.7 6.3l-2.5 2.5M8.8 15.2l-2.5 2.5"/></svg>';

function clientActiveBookings(c) { return (c.projects || []).filter(p => ['confirmed', 'in_progress'].includes(p.status)); }
function clientIsNew(c) { return (Date.now() - new Date(c.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000; }

async function loadClients() {
  const { data, error } = await supabaseClient
    .from('clients')
    .select('*, projects(id, title, status, event_date), quotes(id, amount, status, created_at)')
    .order('created_at', { ascending: false });
  if (error) return console.error(error);
  allClientsCache = data || [];
  renderClientStats();
  renderClients();
  if (selectedClientId) {
    const stillExists = allClientsCache.some(c => c.id === selectedClientId);
    stillExists ? openClientDetail(selectedClientId) : closeClientDetail();
  }
}

function renderClientStats() {
  const grid = document.getElementById('client-stats');
  if (!grid) return;
  const total = allClientsCache.length;
  const withActive = allClientsCache.filter(c => clientActiveBookings(c).length > 0).length;
  const quotesSent = allClientsCache.reduce((sum, c) => sum + (c.quotes || []).filter(q => q.status !== 'draft').length, 0);
  const newThisMonth = allClientsCache.filter(clientIsNew).length;
  const cell = (cls, svg, num, label) => `
    <div class="og-stat">
      <span class="og-stat-icon ${cls}">${svg}</span>
      <span class="og-stat-num">${num}</span>
      <span class="og-stat-label">${label}</span>
    </div>`;
  grid.innerHTML = [
    cell('a', icon.clients, total, 'Clientes totales'),
    cell('b', icon.bookings, withActive, 'Con reservas activas'),
    cell('c', icon.quotes, quotesSent, 'Presupuestos enviados'),
    cell('d', clientIconNew, newThisMonth, 'Nuevos (30 días)'),
  ].join('');
}

function renderClients() {
  const list = document.getElementById('client-list');
  if (!list) return;
  let clients = allClientsCache;
  if (currentClientFilter === 'active') clients = clients.filter(c => clientActiveBookings(c).length > 0);
  else if (currentClientFilter === 'none') clients = clients.filter(c => clientActiveBookings(c).length === 0);
  else if (currentClientFilter === 'new') clients = clients.filter(clientIsNew);

  list.innerHTML = '';
  if (!clients.length) { list.innerHTML = '<p class="og-empty">No hay clientes que coincidan con este filtro.</p>'; return; }

  clients.forEach(c => {
    const activeCount = clientActiveBookings(c).length;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'client-card' + (c.id === selectedClientId ? ' active' : '');
    const tags = [];
    if (activeCount > 0) tags.push(`<span class="client-tag has-bookings">${activeCount} reserva${activeCount === 1 ? '' : 's'} activa${activeCount === 1 ? '' : 's'}</span>`);
    else tags.push('<span class="client-tag">Sin reservas</span>');
    if (clientIsNew(c)) tags.push('<span class="client-tag is-new">Nuevo</span>');
    card.innerHTML = `
      <div class="client-card-head">
        <span class="og-avatar">${escapeHtml((c.name || '?').charAt(0).toUpperCase())}</span>
        <span class="client-card-name">${escapeHtml(c.name)}<small>${escapeHtml([c.email, c.phone].filter(Boolean).join(' · ') || 'Sin contacto')}</small></span>
      </div>
      <div class="client-card-tags">${tags.join('')}</div>
    `;
    card.addEventListener('click', () => openClientDetail(c.id));
    list.appendChild(card);
  });
}

function openClientDetail(id) {
  const c = allClientsCache.find(x => x.id === id);
  if (!c) return;
  selectedClientId = id;
  document.getElementById('clients-layout').classList.add('detail-open');
  document.querySelectorAll('.client-card').forEach(el => el.classList.remove('active'));
  renderClients();

  const bookings = (c.projects || []).slice().sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''));
  const quotes = (c.quotes || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const detail = document.getElementById('client-detail');
  detail.hidden = false;
  detail.innerHTML = `
    <div class="client-detail-head">
      <div>
        <h3>${escapeHtml(c.name)}</h3>
        <p>${escapeHtml([c.email, c.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto')}</p>
      </div>
      <button type="button" class="client-detail-close" id="client-detail-close" aria-label="Cerrar ficha">&times;</button>
    </div>

    <div class="client-detail-section">
      <b>Notas</b>
      <textarea id="client-detail-notes" placeholder="Añade notas sobre este cliente…">${escapeHtml(c.notes || '')}</textarea>
      <p class="client-detail-save-hint" id="client-notes-hint">Se guarda automáticamente al salir del campo.</p>
    </div>

    <div class="client-detail-section">
      <b>Reservas (${bookings.length})</b>
      ${bookings.length ? bookings.map(b => `
        <div class="client-detail-row">
          <span>${escapeHtml(b.title)}${b.event_date ? ' · ' + new Date(b.event_date + 'T00:00:00').toLocaleDateString() : ''}</span>
          <span class="status-pill ${b.status}">${statusLabels[b.status] || b.status}</span>
        </div>`).join('') : '<p class="panel-sub" style="margin:0;">Sin reservas todavía.</p>'}
    </div>

    <div class="client-detail-section">
      <b>Presupuestos (${quotes.length})</b>
      ${quotes.length ? quotes.map(q => `
        <div class="client-detail-row">
          <span>${q.amount != null ? Number(q.amount).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'Sin importe'}</span>
          <span class="status-pill ${q.status}">${statusLabels[q.status] || q.status}</span>
        </div>`).join('') : '<p class="panel-sub" style="margin:0;">Sin presupuestos todavía.</p>'}
    </div>

    <button type="button" class="og-btn og-btn-outline" id="client-detail-delete" style="color:var(--og-bad); border-color:var(--og-bad);">Eliminar cliente</button>
  `;

  document.getElementById('client-detail-close').addEventListener('click', closeClientDetail);
  document.getElementById('client-detail-notes').addEventListener('blur', async (e) => {
    const hint = document.getElementById('client-notes-hint');
    hint.textContent = 'Guardando…';
    const { error } = await supabaseClient.from('clients').update({ notes: e.target.value.trim() || null }).eq('id', c.id);
    hint.textContent = error ? 'No se pudo guardar.' : 'Guardado.';
    if (!error) { c.notes = e.target.value.trim() || null; }
    setTimeout(() => { if (hint) hint.textContent = 'Se guarda automáticamente al salir del campo.'; }, 2000);
  });
  document.getElementById('client-detail-delete').addEventListener('click', async () => {
    if (!confirm(`¿Eliminar "${c.name}"? Esta acción no se puede deshacer.`)) return;
    await supabaseClient.from('clients').delete().eq('id', c.id);
    closeClientDetail();
    loadClients();
  });
}

function closeClientDetail() {
  selectedClientId = null;
  const layout = document.getElementById('clients-layout');
  const detail = document.getElementById('client-detail');
  if (layout) layout.classList.remove('detail-open');
  if (detail) { detail.hidden = true; detail.innerHTML = ''; }
  document.querySelectorAll('.client-card').forEach(el => el.classList.remove('active'));
}

document.getElementById('client-filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.og-filter-pill');
  if (!btn) return;
  document.querySelectorAll('#client-filters .og-filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentClientFilter = btn.dataset.filter;
  renderClients();
});

document.getElementById('client-add-toggle').addEventListener('click', () => {
  const form = document.getElementById('client-form');
  form.hidden = !form.hidden;
  if (!form.hidden) document.getElementById('client-name').focus();
});

document.getElementById('client-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('client-name').value.trim();
  const email = document.getElementById('client-email').value.trim() || null;
  const phone = document.getElementById('client-phone').value.trim() || null;
  const notes = document.getElementById('client-notes').value.trim() || null;
  if (!name) return;
  const { error } = await supabaseClient.from('clients').insert({ name, email, phone, notes });
  if (error) return alert(error.message);
  e.target.reset();
  e.target.hidden = true;
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

// ---------- Helpers: meses / variación mes a mes (todo con datos reales, por created_at) ----------
function monthBounds(offsetMonths) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  return { start, end };
}
function rowsInMonth(rows, offsetMonths) {
  const { start, end } = monthBounds(offsetMonths);
  return rows.filter(r => { const d = new Date(r.created_at); return d >= start && d < end; });
}
function deltaBadge(current, previous) {
  if (previous === 0 && current === 0) return { cls: 'flat', text: 'Sin cambios' };
  if (previous === 0) return { cls: 'up', text: 'Nuevo este mes' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { cls: 'flat', text: 'Igual que el mes anterior' };
  return { cls: pct > 0 ? 'up' : 'down', text: `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}% vs. mes anterior` };
}
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function last6MonthBuckets(rows) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  return months.map(m => {
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const count = rows.filter(r => { const d = new Date(r.created_at); return d >= m && d < next; }).length;
    return { label: MONTH_ABBR[m.getMonth()], count };
  });
}
const eur = (n) => Number(n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

let allAnalyticsQuotesCache = [];
let currentAnalyticsQuoteFilter = 'all';
let selectedAnalyticsQuoteId = null;

async function loadAnalytics() {
  const [
    { count: publishedProjects },
    { data: clientsData },
    { data: bookingsData },
    { data: quotesData },
    { data: enquiriesData },
  ] = await Promise.all([
    supabaseClient.from('portfolio_projects').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabaseClient.from('clients').select('id, created_at'),
    supabaseClient.from('projects').select('id, status, created_at'),
    supabaseClient.from('quotes').select('*, clients(name), projects(title, status)').order('created_at', { ascending: false }),
    supabaseClient.from('enquiries').select('id, status, created_at'),
  ]);

  const clients = clientsData || [];
  const bookings = bookingsData || [];
  const quotes = quotesData || [];
  const enquiriesRows = enquiriesData || [];
  allAnalyticsQuotesCache = quotes;

  renderAnalyticsStats({ publishedProjects, clients, bookings, quotes, enquiriesRows });
  renderAnalyticsCharts(quotes, bookings);
  renderAnalyticsQuotes();

  document.getElementById('analytics-ga-note').hidden = false;
}

function renderAnalyticsStats({ publishedProjects, clients, bookings, quotes, enquiriesRows }) {
  const grid = document.getElementById('analytics-grid');
  if (!grid) return;

  const activeBookingsNow = bookings.filter(b => ['confirmed', 'in_progress'].includes(b.status)).length;
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
  const acceptedTotal = acceptedQuotes.reduce((s, q) => s + (Number(q.amount) || 0), 0);
  const sentNow = quotes.filter(q => q.status === 'sent').length;
  const unreadMsgsNow = enquiriesRows.filter(e => e.status === 'new').length;

  const cell = (cls, svg, num, label, delta) => `
    <div class="og-stat">
      <span class="og-stat-icon ${cls}">${svg}</span>
      <span class="og-stat-num">${num}</span>
      <span class="og-stat-label">${label}</span>
      ${delta ? `<span class="og-stat-delta ${delta.cls}">${delta.text}</span>` : ''}
    </div>`;

  grid.innerHTML = [
    cell('a', icon.projects, publishedProjects ?? 0, 'Proyectos publicados'),
    cell('b', icon.clients, clients.length, 'Clientes totales', deltaBadge(rowsInMonth(clients, 0).length, rowsInMonth(clients, -1).length)),
    cell('c', icon.bookings, activeBookingsNow, 'Reservas activas', deltaBadge(rowsInMonth(bookings, 0).length, rowsInMonth(bookings, -1).length)),
    cell('d', icon.quotes, eur(acceptedTotal), 'Ingresos aceptados', deltaBadge(
      rowsInMonth(acceptedQuotes, 0).reduce((s, q) => s + (Number(q.amount) || 0), 0),
      rowsInMonth(acceptedQuotes, -1).reduce((s, q) => s + (Number(q.amount) || 0), 0)
    )),
    cell('a', icon.quotes, sentNow, 'Presupuestos pendientes', deltaBadge(
      rowsInMonth(quotes.filter(q => q.status === 'sent'), 0).length,
      rowsInMonth(quotes.filter(q => q.status === 'sent'), -1).length
    )),
    cell('b', icon.messages, unreadMsgsNow, 'Mensajes sin leer', deltaBadge(rowsInMonth(enquiriesRows, 0).length, rowsInMonth(enquiriesRows, -1).length)),
  ].join('');
}

function renderAnalyticsCharts(quotes, bookings) {
  const quoteBuckets = last6MonthBuckets(quotes);
  const bookingBuckets = last6MonthBuckets(bookings);

  const barsEl = document.getElementById('analytics-quotes-bars');
  if (barsEl) {
    const max = Math.max(1, ...quoteBuckets.map(b => b.count));
    barsEl.innerHTML = quoteBuckets.map(b => `
      <div class="analytics-bar">
        <div class="analytics-bar-fill" style="height:${Math.max(4, Math.round((b.count / max) * 100))}%" title="${b.count}"></div>
        <span>${b.label}</span>
      </div>`).join('');
  }

  const lineEl = document.getElementById('analytics-bookings-line');
  if (lineEl) {
    const max = Math.max(1, ...bookingBuckets.map(b => b.count));
    const w = 280, h = 90, pad = 8;
    const stepX = (w - pad * 2) / (bookingBuckets.length - 1 || 1);
    const pts = bookingBuckets.map((b, i) => ({
      x: pad + stepX * i,
      y: h - pad - ((b.count / max) * (h - pad * 2)),
    }));
    const pointsAttr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    lineEl.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <polyline points="${pointsAttr}" fill="none" stroke="var(--og-accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--og-accent)"/>`).join('')}
      </svg>
      <div class="analytics-line-labels">${bookingBuckets.map(b => `<span>${b.label}</span>`).join('')}</div>
    `;
  }
}

function renderAnalyticsQuotes() {
  const list = document.getElementById('analytics-quotes-list');
  if (!list) return;
  let quotes = allAnalyticsQuotesCache;
  if (currentAnalyticsQuoteFilter !== 'all') quotes = quotes.filter(q => q.status === currentAnalyticsQuoteFilter);
  quotes = quotes.slice(0, 20);

  if (!quotes.length) { list.innerHTML = '<p class="og-empty">No hay presupuestos con este filtro.</p>'; return; }

  list.innerHTML = '';
  quotes.forEach(q => {
    const clientName = q.clients?.name || 'Sin cliente';
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'analytics-quote-row' + (q.id === selectedAnalyticsQuoteId ? ' active' : '');
    row.innerHTML = `
      <span class="analytics-quote-row-main">
        <span class="og-avatar">${escapeHtml(clientName.charAt(0).toUpperCase())}</span>
        <span class="analytics-quote-row-name">${escapeHtml(clientName)}<small>${new Date(q.created_at).toLocaleDateString()}</small></span>
      </span>
      <span class="analytics-quote-row-amount">
        <b>${q.amount != null ? Number(q.amount).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—'}</b>
        <span class="status-pill ${q.status}">${statusLabels[q.status] || q.status}</span>
      </span>
    `;
    row.addEventListener('click', () => openAnalyticsQuoteDetail(q.id));
    list.appendChild(row);
  });
}

function openAnalyticsQuoteDetail(id) {
  const q = allAnalyticsQuotesCache.find(x => x.id === id);
  if (!q) return;
  selectedAnalyticsQuoteId = id;
  document.getElementById('analytics-layout')?.classList.add('detail-open');
  renderAnalyticsQuotes();

  const detail = document.getElementById('analytics-quote-detail');
  detail.hidden = false;
  detail.innerHTML = `
    <div class="analytics-detail-head">
      <div>
        <h3>${q.amount != null ? Number(q.amount).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'Sin importe'}</h3>
        <p>${escapeHtml(q.clients?.name || 'Sin cliente')}</p>
      </div>
      <button type="button" class="analytics-detail-close" id="analytics-detail-close" aria-label="Cerrar">&times;</button>
    </div>
    <div class="client-detail-section">
      <b>Estado</b>
      <span class="status-pill ${q.status}">${statusLabels[q.status] || q.status}</span>
    </div>
    <div class="client-detail-section">
      <b>Proyecto</b>
      <p class="panel-sub" style="margin:0;">${q.projects?.title ? escapeHtml(q.projects.title) + (q.projects.status ? ' · ' + (statusLabels[q.projects.status] || q.projects.status) : '') : 'Sin proyecto vinculado'}</p>
    </div>
    <div class="client-detail-section">
      <b>Creado</b>
      <p class="panel-sub" style="margin:0;">${new Date(q.created_at).toLocaleDateString()}</p>
    </div>
    ${q.document_url ? `<a class="og-btn og-btn-outline" href="${escapeAttr(q.document_url)}" target="_blank" rel="noopener">Ver documento</a>` : ''}
    <button type="button" class="og-btn og-btn-dark" id="analytics-go-to-quotes">Abrir en Presupuestos →</button>
  `;
  document.getElementById('analytics-detail-close').addEventListener('click', closeAnalyticsQuoteDetail);
  document.getElementById('analytics-go-to-quotes').addEventListener('click', () => switchTab('quotes'));
}

function closeAnalyticsQuoteDetail() {
  selectedAnalyticsQuoteId = null;
  document.getElementById('analytics-layout')?.classList.remove('detail-open');
  const detail = document.getElementById('analytics-quote-detail');
  if (detail) { detail.hidden = true; detail.innerHTML = ''; }
  renderAnalyticsQuotes();
}

document.getElementById('analytics-quotes-filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.og-filter-pill');
  if (!btn) return;
  document.querySelectorAll('#analytics-quotes-filters .og-filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentAnalyticsQuoteFilter = btn.dataset.filter;
  renderAnalyticsQuotes();
});

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
