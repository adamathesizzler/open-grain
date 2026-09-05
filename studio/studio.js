const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');

// ---------- Auth ----------
async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    loginScreen.hidden = true;
    dashboard.hidden = false;
    loadOverview();
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

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.studio-panel').forEach(p => p.hidden = true);
    btn.classList.add('active');
    const panel = document.querySelector(`.studio-panel[data-panel="${btn.dataset.tab}"]`);
    if (panel) panel.hidden = false;
    if (btn.dataset.tab === 'portfolio') loadPortfolio();
    if (btn.dataset.tab === 'social') loadSocial();
    if (btn.dataset.tab === 'enquiries') loadEnquiries();
    if (btn.dataset.tab === 'clients') loadClients();
    if (btn.dataset.tab === 'calendar') loadCalendar();
    if (btn.dataset.tab === 'inventory') loadInventory();
    if (btn.dataset.tab === 'quotes') loadQuotes();
    if (btn.dataset.tab === 'content') loadSiteContent();
  });
});

// Dock's floating "+" button: quick-jump to Portfolio → add a project.
document.getElementById('dock-quick-add').addEventListener('click', () => {
  document.querySelector('.tab-btn[data-tab="portfolio"]').click();
  setTimeout(() => document.getElementById('project-title')?.focus(), 50);
});

// ---------- Shared helper: drag-to-reorder ----------
// Makes every `itemSelector` child of `container` draggable and lets the
// admin drag it to a new position with the mouse (grabbing the ⠿ handle).
// `onDrop` fires once, after the element settles into its new spot, so the
// caller can persist the new order (or just leave it as an in-memory
// reorder, e.g. for the services list which only saves on "Guardar").
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

const dragHandleSvg = '<span class="drag-handle" title="Arrastrar para reordenar"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="5" r="1.6"/><circle cx="16" cy="5" r="1.6"/><circle cx="8" cy="12" r="1.6"/><circle cx="16" cy="12" r="1.6"/><circle cx="8" cy="19" r="1.6"/><circle cx="16" cy="19" r="1.6"/></svg></span>';

// Persists the DOM order of `itemSelector` elements inside `container` as
// each row's new `sort_order` in `table` (0, 1, 2, …), reading the row id
// from `data-id`.
async function persistOrder(container, itemSelector, table) {
  const items = [...container.querySelectorAll(itemSelector)];
  await Promise.all(items.map((el, i) =>
    el.dataset.id ? supabaseClient.from(table).update({ sort_order: i }).eq('id', el.dataset.id) : null
  ));
}

// ---------- Shared helper: populate a <select> with clients ----------
async function populateClientSelect(selectEl) {
  const { data, error } = await supabaseClient.from('clients').select('id, name').order('name');
  if (error) return console.error(error);
  const current = selectEl.value;
  selectEl.innerHTML = '<option value="">No client</option>' +
    data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  selectEl.value = current;
}

// ---------- Clients ----------
async function loadClients() {
  const { data, error } = await supabaseClient.from('clients').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);
  const list = document.getElementById('client-list');
  list.innerHTML = '';
  if (!data.length) { list.innerHTML = '<p class="panel-sub">No clients yet.</p>'; return; }
  data.forEach(c => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${c.name} <small>${[c.email, c.phone].filter(Boolean).join(' · ') || '—'}</small></span>
      <button class="link-btn" data-action="delete">Delete</button>
    `;
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`Delete "${c.name}"?`)) return;
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

// ---------- Calendar (jobs / bookings) ----------
async function loadCalendar() {
  await populateClientSelect(document.getElementById('job-client'));
  const { data, error } = await supabaseClient
    .from('projects').select('*, clients(name)').order('event_date', { ascending: true, nullsFirst: false });
  if (error) return console.error(error);
  const list = document.getElementById('job-list');
  list.innerHTML = '';
  if (!data.length) { list.innerHTML = '<p class="panel-sub">No jobs on the calendar yet.</p>'; return; }
  data.forEach(job => {
    const row = document.createElement('div');
    row.className = 'list-row';
    const dateLabel = job.event_date ? new Date(job.event_date + 'T00:00:00').toLocaleDateString() : 'No date';
    row.innerHTML = `
      <span>${job.title} <small>${dateLabel}${job.clients?.name ? ' · ' + job.clients.name : ''}</small></span>
      <select data-field="status">
        <option value="enquiry">Enquiry</option>
        <option value="confirmed">Confirmed</option>
        <option value="in_progress">In progress</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <button class="link-btn" data-action="delete">Delete</button>
    `;
    row.querySelector('[data-field="status"]').value = job.status;
    row.querySelector('[data-field="status"]').addEventListener('change', async (e) => {
      await supabaseClient.from('projects').update({ status: e.target.value }).eq('id', job.id);
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`Delete "${job.title}"?`)) return;
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

// ---------- Inventory ----------
async function loadInventory() {
  const { data, error } = await supabaseClient.from('inventory_items').select('*').order('name');
  if (error) return console.error(error);
  const list = document.getElementById('inventory-list');
  list.innerHTML = '';
  if (!data.length) { list.innerHTML = '<p class="panel-sub">No inventory yet.</p>'; return; }
  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${item.name} <small>${item.category ?? '—'}</small></span>
      <span class="status-pill">${item.reserved_quantity}/${item.quantity} reserved</span>
      <button class="link-btn" data-action="delete">Delete</button>
    `;
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`Delete "${item.name}"?`)) return;
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

// ---------- Quotes & contracts ----------
async function loadQuotes() {
  await populateClientSelect(document.getElementById('quote-client'));
  const { data, error } = await supabaseClient
    .from('quotes').select('*, clients(name)').order('created_at', { ascending: false });
  if (error) return console.error(error);
  const list = document.getElementById('quote-list');
  list.innerHTML = '';
  if (!data.length) { list.innerHTML = '<p class="panel-sub">No quotes yet.</p>'; return; }
  data.forEach(q => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${q.clients?.name ?? 'No client'} <small>${q.amount ? '€' + q.amount : 'No amount'}</small></span>
      <select data-field="status">
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="accepted">Accepted</option>
        <option value="declined">Declined</option>
      </select>
      <button class="link-btn" data-action="delete">Delete</button>
    `;
    row.querySelector('[data-field="status"]').value = q.status;
    row.querySelector('[data-field="status"]').addEventListener('change', async (e) => {
      await supabaseClient.from('quotes').update({ status: e.target.value }).eq('id', q.id);
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm('Delete this quote?')) return;
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

// ---------- Overview ----------
async function loadOverview() {
  const [{ count: projectCount }, { count: enquiryCount }, { count: socialCount }, { data: recent }] = await Promise.all([
    supabaseClient.from('portfolio_projects').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabaseClient.from('enquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabaseClient.from('social_posts').select('*', { count: 'exact', head: true }).eq('is_selected', true),
    supabaseClient.from('portfolio_projects').select('id, title, cover_image_url').order('sort_order').limit(4),
  ]);
  document.getElementById('stat-projects').textContent = projectCount ?? '0';
  document.getElementById('stat-enquiries').textContent = enquiryCount ?? '0';
  document.getElementById('stat-social').textContent = socialCount ?? '0';

  const recentEl = document.getElementById('recent-work');
  if (recentEl) {
    const items = recent || [];
    recentEl.innerHTML = items.length ? items.map(p => `
      <div class="album-card album-card-compact">
        <div class="album-stack">
          <span class="album-ghost album-ghost-1"></span>
          <span class="album-ghost album-ghost-2"></span>
          ${p.cover_image_url
            ? `<img class="album-photo" src="${p.cover_image_url}" alt="">`
            : `<span class="album-photo album-photo-empty"><span>–</span></span>`}
        </div>
        <div class="album-info"><span class="album-title">${p.title}</span></div>
      </div>
    `).join('') : '<p class="panel-sub">Todavía no hay proyectos — añade el primero desde Portfolio.</p>';
  }
}

// ---------- Portfolio ----------
async function loadPortfolio() {
  const { data: categories, error: catErr } = await supabaseClient
    .from('portfolio_categories').select('*').order('sort_order');
  if (catErr) return console.error(catErr);

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
        <input type="checkbox" data-id="${cat.id}" ${cat.is_active ? 'checked' : ''}>
        <span>${cat.name} <small>${cat.slug}</small></span>
      </label>
    `;
    row.querySelector('input').addEventListener('change', async (e) => {
      await supabaseClient.from('portfolio_categories').update({ is_active: e.target.checked }).eq('id', cat.id);
    });
    catList.appendChild(row);
  });
  enableDragReorder(catList, '.category-row', () => persistOrder(catList, '.category-row', 'portfolio_categories'));

  const select = document.getElementById('project-category');
  select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const { data: projects, error: projErr } = await supabaseClient
    .from('portfolio_projects').select('*, portfolio_categories(name)').order('sort_order');
  if (projErr) return console.error(projErr);

  const projList = document.getElementById('project-list');
  projList.innerHTML = '';
  projects.forEach(p => {
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
        <span class="album-title">${p.title}</span>
        <small class="album-sub">${p.portfolio_categories?.name ?? 'Sin categoría'}</small>
      </div>
      <div class="album-controls">
        <select data-field="layout" class="layout-select">
          <option value="tall">Vertical</option>
          <option value="wide">Horizontal</option>
          <option value="square">Cuadrada</option>
        </select>
        <label class="checkbox-label"><input type="checkbox" data-field="published" ${p.is_published ? 'checked' : ''}> Publicado</label>
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
    row.querySelector('[data-field="published"]').addEventListener('change', async (e) => {
      await supabaseClient.from('portfolio_projects').update({ is_published: e.target.checked }).eq('id', p.id);
    });
    const handlePhotoChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadMediaFile(file);
      if (!url) return;
      await supabaseClient.from('portfolio_projects').update({ cover_image_url: url }).eq('id', p.id);
      loadPortfolio();
    };
    row.querySelector('[data-field="photo"]').addEventListener('change', handlePhotoChange);
    const emptyPhotoInput = row.querySelector('[data-field="photo-empty"]');
    if (emptyPhotoInput) emptyPhotoInput.addEventListener('change', handlePhotoChange);
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${p.title}"?`)) return;
      await supabaseClient.from('portfolio_projects').delete().eq('id', p.id);
      loadPortfolio();
    });
    projList.appendChild(row);
  });
  enableDragReorder(projList, '.album-card', () => persistOrder(projList, '.album-card', 'portfolio_projects'));
}

// Uploads a file to the public `media` Storage bucket and returns its
// public URL, or null (with an alert) if the upload failed.
async function uploadMediaFile(file) {
  const path = `portfolio/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error } = await supabaseClient.storage.from('media').upload(path, file, { upsert: false });
  if (error) { alert('No se pudo subir la foto: ' + error.message); return null; }
  const { data } = supabaseClient.storage.from('media').getPublicUrl(path);
  return data?.publicUrl || null;
}

document.getElementById('project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('project-title').value.trim();
  const category_id = document.getElementById('project-category').value;
  const is_published = document.getElementById('project-published').checked;
  const layout_class = document.getElementById('project-layout').value;
  const photoInput = document.getElementById('project-photo');
  if (!title) return;

  let cover_image_url = null;
  if (photoInput.files[0]) {
    cover_image_url = await uploadMediaFile(photoInput.files[0]);
  }

  const { error } = await supabaseClient.from('portfolio_projects')
    .insert({ title, category_id, is_published, layout_class, cover_image_url });
  if (error) return alert(error.message);
  e.target.reset();
  loadPortfolio();
});

// ---------- Social posts ----------
async function loadSocial() {
  const { data, error } = await supabaseClient.from('social_posts').select('*').order('sort_order');
  if (error) return console.error(error);
  const list = document.getElementById('social-list');
  list.innerHTML = '';
  data.forEach(post => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${post.platform} <small>${post.external_url}</small></span>
      <label class="checkbox-label"><input type="checkbox" ${post.is_selected ? 'checked' : ''}> Selected</label>
      <button class="link-btn" data-action="delete">Delete</button>
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

// ---------- Enquiries ----------
async function loadEnquiries() {
  const { data, error } = await supabaseClient.from('enquiries').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);
  const list = document.getElementById('enquiry-list');
  list.innerHTML = '';
  if (!data.length) {
    list.innerHTML = '<p class="panel-sub">No enquiries yet.</p>';
    return;
  }
  data.forEach(en => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${en.name} — ${en.service ?? '—'} <small>${en.email}</small></span>
      <span class="status-pill">${en.status}</span>
    `;
    list.appendChild(row);
  });
}

// ---------- Site content editor ----------
// Uses window.DEFAULT_COPY / CONTENT_FIELD_LABELS / CONTENT_FIELD_ORDER
// from /assets/default-copy.js (shared with the public site) as the
// fallback placeholder, and window.site_content rows as the current
// saved override. Saving writes one row per (key, lang) into site_content;
// the public site prefers those over the defaults automatically.
let contentOverrides = {}; // { "key|lang": value }

function contentKey(key, lang) { return `${key}|${lang}`; }

async function loadSiteContent() {
  const { data, error } = await supabaseClient.from('site_content').select('key, lang, value');
  if (error) return console.error(error);
  contentOverrides = {};
  (data || []).forEach(row => { contentOverrides[contentKey(row.key, row.lang)] = row.value; });

  const order = window.CONTENT_FIELD_ORDER || [];
  const labels = window.CONTENT_FIELD_LABELS || {};
  const defaults = window.DEFAULT_COPY || { en: {}, es: {} };

  const fieldsEl = document.getElementById('content-fields');
  fieldsEl.innerHTML = order.map(key => `
    <div class="content-field">
      <label class="content-field-label">${labels[key] || key}</label>
      <div class="content-field-row">
        <textarea data-key="${key}" data-lang="es" rows="2" placeholder="Español">${contentOverrides[contentKey(key, 'es')] ?? defaults.es[key] ?? ''}</textarea>
        <textarea data-key="${key}" data-lang="en" rows="2" placeholder="English">${contentOverrides[contentKey(key, 'en')] ?? defaults.en[key] ?? ''}</textarea>
      </div>
    </div>
  `).join('');

  const servicesEl = document.getElementById('content-services');
  const esServices = (() => {
    try { return JSON.parse(contentOverrides[contentKey('serviceList', 'es')]); } catch (e) { return defaults.es.serviceList; }
  })();
  const enServices = (() => {
    try { return JSON.parse(contentOverrides[contentKey('serviceList', 'en')]); } catch (e) { return defaults.en.serviceList; }
  })();
  servicesEl.innerHTML = [0, 1, 2, 3, 4].map(i => `
    <div class="content-field draggable" draggable="true">
      ${dragHandleSvg}
      <div class="content-field-body">
        <label class="content-field-label">Servicio</label>
        <div class="content-field-row">
          <input type="text" data-service-lang="es" value="${(esServices[i] || '').replace(/"/g, '&quot;')}" placeholder="Español">
          <input type="text" data-service-lang="en" value="${(enServices[i] || '').replace(/"/g, '&quot;')}" placeholder="English">
        </div>
      </div>
    </div>
  `).join('');
  enableDragReorder(servicesEl, '.content-field.draggable', null);
}

document.getElementById('content-save').addEventListener('click', async () => {
  const statusEl = document.getElementById('content-status');
  statusEl.hidden = false;
  statusEl.textContent = 'Guardando…';

  const rows = [];
  document.querySelectorAll('#content-fields textarea').forEach(el => {
    rows.push({ key: el.dataset.key, lang: el.dataset.lang, value: el.value });
  });

  // Read services in their current on-screen order (the admin may have
  // dragged them into a new order — that DOM order is the order saved).
  const esServices = [...document.querySelectorAll('#content-services [data-service-lang="es"]')].map(el => el.value);
  const enServices = [...document.querySelectorAll('#content-services [data-service-lang="en"]')].map(el => el.value);
  rows.push({ key: 'serviceList', lang: 'es', value: JSON.stringify(esServices) });
  rows.push({ key: 'serviceList', lang: 'en', value: JSON.stringify(enServices) });

  const { error } = await supabaseClient.from('site_content').upsert(rows, { onConflict: 'key,lang' });
  statusEl.textContent = error ? ('Error: ' + error.message) : 'Guardado. Ya está publicado en la web.';
});

// ---------- AI assistant (proposes changes, you approve) ----------
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
  submitBtn.disabled = true;
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
  }
});

function renderAiChanges(summary, changes) {
  const container = document.getElementById('ai-changes');
  if (!changes.length) { container.innerHTML = ''; return; }
  container.innerHTML = `
    ${summary ? `<p class="ai-summary">${summary}</p>` : ''}
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
      <button type="button" class="btn btn-outline" id="ai-discard">Descartar</button>
      <button type="button" class="btn btn-solid" id="ai-apply">Aplicar cambios</button>
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
    return `${label} (${c.lang === 'es' ? 'Español' : 'English'})`;
  }
  if (c.table === 'portfolio_projects') {
    return `Proyecto "${c.title || c.id}" — ${c.field === 'layout_class' ? 'tamaño de la foto' : c.field}`;
  }
  return `${c.table}.${c.field || c.key}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
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
}

checkSession();
