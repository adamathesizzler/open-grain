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
    loadAIControl();
  } else {
    loginScreen.hidden = false;
    dashboard.hidden = true;
    aiEnabled = false;
    paintAIControl();
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

let navigationVersion = 0;
async function switchTab(tab) {
  ++navigationVersion;
  document.dispatchEvent(new CustomEvent('studio:tabchange', { detail: { tab } }));
  document.querySelectorAll('.og-nav-item[data-tab]').forEach(b => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('.studio-panel').forEach(p => { p.hidden = p.dataset.panel !== tab; });
  const search = document.getElementById('global-search');
  if (search) search.value = '';
  const loader = tabLoaders[tab];
  const loading = loader ? loader() : Promise.resolve();
  const content = document.querySelector('.og-content');
  if (content) {
    content.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  await loading;
}

// Entity navigation uses persisted IDs, never client-name matching or private public URLs.
async function openWorkspaceEntity(tab, id) {
  const pending = switchTab(tab);
  const version = navigationVersion;
  await pending;
  if (version !== navigationVersion) return;
  const search = document.getElementById('global-search');
  if (search) search.value = '';
  if (tab === 'messages') {
    const row = Array.from(document.querySelectorAll('[data-enquiry-id]')).find(el => el.dataset.enquiryId === id);
    if (!row) return alert('La solicitud ya no está disponible o no se pudo cargar.');
    const details = row.querySelector('details'); if (details) details.open = true;
    row.scrollIntoView({block:'center'}); row.focus();
  } else if (tab === 'projects') {
    const row=Array.from(document.querySelectorAll('#project-list [data-id]')).find(el=>el.dataset.id===id);
    if(!row)return alert('La pieza de portfolio ya no está disponible o no se pudo cargar.');
    row.tabIndex=-1;row.scrollIntoView({block:'center'});row.focus();
  } else if (tab === 'clients') {
    if (!allClientsCache.some(c => String(c.id) === String(id))) return alert('Este cliente ya no está disponible.');
    currentClientFilter = 'all';
    document.querySelectorAll('#client-filters .og-filter-pill').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    openClientDetail(id);
  } else if (!StudioWorkspace.focus(document.getElementById(tab === 'quotes' ? 'quote-list' : 'job-list'), id)) {
    alert('El registro ya no está disponible o no se pudo cargar.');
  }
}
async function draftForClient(tab, clientId) {
  const pending = switchTab(tab), version = navigationVersion;
  await pending;
  if (version !== navigationVersion) return;
  const isQuote = tab === 'quotes';
  const select = document.getElementById(isQuote ? 'quote-client' : 'job-client');
  if (!Array.from(select.options).some(o => o.value === clientId)) return alert('No se pudo cargar este cliente. Vuelve a abrir su ficha.');
  const form = document.getElementById(isQuote ? 'quote-form' : 'job-form');
  if (Array.from(form.querySelectorAll('input, select, textarea')).some(field => field.tagName === 'SELECT' ? field.value !== (Array.from(field.options).find(o => o.defaultSelected)?.value ?? field.options[0]?.value ?? '') : field.value !== field.defaultValue) && !confirm('Hay un borrador sin guardar. ¿Sustituirlo por uno nuevo para este cliente?')) return;
  form.reset(); select.value = clientId;
  document.getElementById(isQuote ? 'quote-create' : 'booking-create').open = true;
  document.getElementById(isQuote ? 'quote-amount' : 'job-title').focus();
}

document.querySelectorAll('.og-nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
document.querySelectorAll('[data-jump]').forEach(el => {
  el.addEventListener('click', (e) => { e.preventDefault(); switchTab(el.dataset.jump); });
});
document.getElementById('bell-btn').addEventListener('click', () => switchTab('messages'));

// ---------- Quick actions (Inicio) ----------
function toggleCreateChooser(open) {
  const chooser=document.getElementById('studio-create-chooser');
  const trigger=document.querySelector('[data-action="quick-new-project"]');
  chooser.hidden=!open;trigger.setAttribute('aria-expanded',String(open));
  if(open){chooser.scrollIntoView({block:'nearest'});chooser.querySelector('button').focus();}else trigger.focus();
}
async function openCreateRoute(route) {
  if(!['job','album','upload'].includes(route))return;
  const pending=switchTab(route==='job'?'bookings':'projects'),version=navigationVersion;
  try{await pending;}catch(error){if(version===navigationVersion)alert('No se pudo abrir esta sección. Tu borrador se conserva; vuelve a intentarlo.');return;}
  if(version!==navigationVersion)return;
  // Never reset a draft or write records merely by navigating.
  let target,focus;
  if(route==='job'){target=document.getElementById('booking-create');target.open=true;focus=document.getElementById('job-title');}
  else if(route==='album'){target=document.getElementById('project-form');target.hidden=false;focus=document.getElementById('project-title');}
  else{target=document.getElementById('portfolio-photo-groups');focus=target.querySelector('button');if(!focus){target=document.getElementById('new-project-btn');focus=target;}}
  target.scrollIntoView({block:'start'});if(!focus.disabled)focus.focus();
}
document.querySelector('[data-action="quick-new-project"]').addEventListener('click',()=>toggleCreateChooser(document.getElementById('studio-create-chooser').hidden));
document.getElementById('studio-create-close').addEventListener('click',()=>toggleCreateChooser(false));
document.querySelectorAll('[data-create-route]').forEach(button=>button.addEventListener('click',()=>openCreateRoute(button.dataset.createRoute)));
document.querySelector('[data-action="quick-upload"]').addEventListener('click',()=>openCreateRoute('upload'));
document.querySelector('[data-action="quick-edit-content"]').addEventListener('click', () => switchTab('content'));
document.querySelector('[data-action="quick-messages"]').addEventListener('click', () => switchTab('messages'));

// ---------- Global search: filters the rows visible in the active panel ----------
function applyGlobalSearch(){
  const value=document.getElementById('global-search').value;const q=value.trim().toLowerCase();
  const activePanel = document.querySelector('.studio-panel:not([hidden])');
  if (!activePanel) return;
  const workspace = activePanel.querySelector('.ws-bookings, .ws-quotes');
  if (workspace && window.StudioWorkspace.search(workspace, value)) return;
  activePanel.querySelectorAll('.list-row, .album-card, .category-row, .client-card').forEach(row => {
    row.style.display = (!q || row.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
}
document.getElementById('global-search').addEventListener('input',applyGlobalSearch);
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.getElementById('global-search').focus();
  }
});

// ============================================================
// Shared helper: drag-to-reorder (native HTML5 DnD)
// ============================================================
const dragReorderBindings=new WeakMap();
function enableDragReorder(container,itemSelector,onDrop){
 const prior=dragReorderBindings.get(container);if(prior){prior.itemSelector=itemSelector;prior.onDrop=onDrop;return;}
 const binding={itemSelector,onDrop,dragEl:null,changed:false};dragReorderBindings.set(container,binding);
 container.addEventListener('dragstart',e=>{const item=e.target.closest(binding.itemSelector);if(!item||!container.contains(item))return;binding.dragEl=item;binding.changed=false;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',item.dataset.id||'');}catch(error){}setTimeout(()=>item.classList.add('dragging'),0);});
 container.addEventListener('dragover',e=>{const dragEl=binding.dragEl;if(!dragEl)return;e.preventDefault();const item=e.target.closest(binding.itemSelector);if(!item||item===dragEl||!container.contains(item))return;const rect=item.getBoundingClientRect();const after=(e.clientY-rect.top)/rect.height>0.5;const before=after?item.nextSibling:item;if(before===dragEl||dragEl.nextSibling===before)return;container.insertBefore(dragEl,before);binding.changed=true;});
 container.addEventListener('drop',e=>e.preventDefault());
 container.addEventListener('dragend',()=>{const moved=!!binding.dragEl&&binding.changed;binding.dragEl?.classList.remove('dragging');binding.dragEl=null;binding.changed=false;if(moved)binding.onDrop?.();});
}
const orderSaveBusy=new WeakSet(),orderSaveQueued=new WeakSet();
async function persistOrder(container,itemSelector,table){
 if(orderSaveBusy.has(container)){orderSaveQueued.add(container);return;}orderSaveBusy.add(container);
 try{do{orderSaveQueued.delete(container);const items=[...container.querySelectorAll(itemSelector)];const results=await Promise.all(items.filter(el=>el.dataset.id).map((el,i)=>supabaseClient.from(table).update({sort_order:i}).eq('id',el.dataset.id).select('id')));if(results.some(result=>result.error||!result.data?.length))throw Error('No se pudo confirmar todo el orden. Recarga esta sección para comprobar lo guardado.');}while(orderSaveQueued.has(container));}
 catch(error){alert(error.message||'No se pudo confirmar el orden.');}finally{orderSaveBusy.delete(container);}
}

// ============================================================
// Shared helper: populate a <select> with clients
// ============================================================
const clientSelectVersions = new WeakMap();
async function populateClientSelect(selectEl) {
  const version = (clientSelectVersions.get(selectEl) || 0) + 1;
  clientSelectVersions.set(selectEl, version);
  const current = selectEl.value;
  selectEl.disabled = true;
  try {
    const { data, error } = await readStudio(supabaseClient.from('clients').select('id, name').order('name'));
    if (clientSelectVersions.get(selectEl) !== version) return false;
    if (error || !Array.isArray(data) || (current && !data.some(client=>String(client.id)===current))) throw new Error('Clients unavailable');
    selectEl.innerHTML = '<option value="">Sin cliente</option>' +
      data.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
    selectEl.value = current;
    selectEl.disabled = false;
    return true;
  } catch (error) {
    if (clientSelectVersions.get(selectEl) !== version) return false;
    // Keep the selected ID in the disabled error option: retry must not erase a draft association.
    selectEl.innerHTML = '<option value="'+escapeAttr(escapeHtml(current))+'">No se pudieron cargar los clientes</option>';
    selectEl.value = current;
    selectEl.disabled = true;
    return false;
  }
}

// ============================================================
// Media uploads (Supabase Storage bucket `media`)
// ============================================================
const mediaUploadPaths=new WeakMap();
async function uploadMediaFile(file, folder = 'portfolio', acknowledged=false) {
  try{window.OGPortfolioPhotoEditor.validateFile(file);}catch(error){alert(error.message);return null;}
  if(!acknowledged&&!confirm('Este archivo se subirá al almacenamiento público: cualquier persona con su enlace podrá verlo. No subas material confidencial. ¿Subir?'))return null;
  let path=mediaUploadPaths.get(file);if(!path){path=`${folder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;mediaUploadPaths.set(file,path);}
  try{
   const result=await window.OGPortfolioPhotoEditor.bounded(supabaseClient.storage.from('media').upload(path,file,{upsert:false,contentType:file.type}));
   if(result.error){const prior=await window.OGPortfolioPhotoEditor.bounded(supabaseClient.storage.from('media').download(path));if(prior.error||!prior.data)throw Error('No se pudo confirmar la subida. El archivo podría haberse recibido; no se ha sobrescrito.');const [a,b]=await Promise.all([prior.data.arrayBuffer(),file.arrayBuffer()]);const aa=new Uint8Array(a),bb=new Uint8Array(b);if(aa.length!==bb.length||aa.some((v,i)=>v!==bb[i]))throw Error('El archivo remoto no coincide. No se sobrescribió.');}
   return supabaseClient.storage.from('media').getPublicUrl(path).data?.publicUrl||null;
  }catch(error){alert(error.message||'No se pudo confirmar la subida.');return null;}
}

document.getElementById('gallery-upload-input').addEventListener('change', async (e) => {
  const input=e.target;if(input.dataset.saving==='true')return;const files=[...input.files];if(!files.length)return;
  if(!confirm('Subir estos archivos al almacenamiento público no los añade a un álbum ni los publica en la galería. Cualquier persona con el enlace podrá verlos. ¿Continuar?'))return;
  const statusEl=document.getElementById('gallery-upload-status');statusEl.hidden=false;input.dataset.saving='true';input.disabled=true;let saved=0;
  try{for(const file of files){statusEl.textContent=`Subiendo ${saved} de ${files.length} archivos…`;if(await uploadMediaFile(file,'portfolio',true))saved++;}statusEl.textContent=`${saved} de ${files.length} subidas confirmadas. ${saved<files.length?'Quedan archivos sin confirmar; revisa los avisos.':'Están en la biblioteca, todavía sin álbum.'}`;if(saved===files.length)input.value='';await loadGalleries();}
  finally{input.disabled=false;input.dataset.saving='false';}
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

async function readStudio(query){
 try{return await window.OGPortfolioPhotoEditor.bounded(query,12000);}
 catch(error){return {data:null,error:{message:error.message||'No se pudo completar la lectura.'}};}
}
let messageBadgeVersion=0;
async function updateMessageBadge() {
  const version=++messageBadgeVersion;
  const { count,error } = await readStudio(supabaseClient.from('enquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'));
  if(version!==messageBadgeVersion)return null;
  if(error){const badge=document.getElementById('badge-messages');badge.textContent='?';badge.hidden=false;badge.setAttribute('aria-label','No se pudo comprobar mensajes nuevos');return null;}
  const n = count || 0;
  const badge = document.getElementById('badge-messages');
  badge.removeAttribute('aria-label');badge.textContent = String(n);
  badge.hidden = n === 0;
  document.getElementById('bell-dot').hidden = n === 0;
  return n;
}

let overviewLoadVersion=0;
async function loadOverview() {
  const version=++overviewLoadVersion;const notice=document.getElementById('overview-load-status');notice.textContent='Actualizando resumen…';
  const todayIso = new Date().toISOString().slice(0, 10);

  const results = await Promise.all([
    supabaseClient.from('portfolio_projects').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabaseClient.from('portfolio_categories').select('*', { count: 'exact', head: true }),
    supabaseClient.from('portfolio_projects').select('*, portfolio_categories(name)').order('created_at', { ascending: false }).limit(6),
    supabaseClient.from('portfolio_projects').select('status, is_published'),
    supabaseClient.from('enquiries').select('*').order('created_at', { ascending: false }).limit(3),
    supabaseClient.from('projects').select('*, clients(name)').gte('event_date', todayIso).order('event_date', { ascending: true }).limit(30),
  ].map(readStudio));

  if(version!==overviewLoadVersion)return;
  if(results.some(result=>result.error)){notice.textContent='No se pudo actualizar el resumen. Los datos anteriores, si aparecen, no están comprobados ahora. Vuelve a Inicio para reintentar.';return;}
  const [{count:publishedCount},{count:categoryCount},{data:recentProjects},{data:allProjectsForBar},{data:latestMessages},{data:upcomingRaw}]=results;
  const newMsgCount = await updateMessageBadge();
  if(version!==overviewLoadVersion)return;notice.textContent=newMsgCount===null?'No se pudieron comprobar los mensajes nuevos.':'';
  const upcoming = (upcomingRaw || []).filter(j => j.status !== 'cancelled' && j.status !== 'delivered');

  document.getElementById('stat-projects').textContent = publishedCount ?? '0';
  document.getElementById('stat-galleries').textContent = categoryCount ?? '0';
  document.getElementById('stat-bookings').textContent = String(upcoming.length);
  document.getElementById('stat-messages').textContent = newMsgCount===null?'—':String(newMsgCount);

  const quickMsgSub = document.getElementById('quick-messages-sub');
  if (quickMsgSub) quickMsgSub.textContent = newMsgCount===null?'Sin comprobar':newMsgCount ? `${newMsgCount} sin leer` : 'Sin novedades';

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
            ${featured.is_published?'<a class="og-btn og-btn-outline og-btn-sm" href="/work" target="_blank" rel="noopener">Ver galería pública</a>':''}
          </div>
        </div>
        <div class="og-featured-photo" ></div>
      </div>
    `;
    const featuredUrl=window.OGServiceCatalog.imageUrl(featured.cover_image_url||'');featuredEl.querySelector('.og-featured-photo').classList.toggle('is-empty',!featuredUrl);if(featuredUrl)featuredEl.querySelector('.og-featured-photo').style.backgroundImage='url('+JSON.stringify(featuredUrl.startsWith('assets/')?'/'+featuredUrl:featuredUrl)+')';
    document.getElementById('featured-edit-btn').addEventListener('click',async()=>{await switchTab('projects');await openPortfolioPhotoById(featured.id);});
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
    ? `${publishedForBar} de ${totalProjects} fotografías publicadas`
    : 'Todavía no hay proyectos.';
  document.getElementById('publish-bar').style.width = pct + '%';

  // Recent work strip
  const stripEl = document.getElementById('recent-work');
  stripEl.innerHTML = (recentProjects && recentProjects.length) ? recentProjects.map(p => `
    <button type="button" class="og-strip-item" data-project-id="${escapeAttr(p.id)}">
      <div class="og-strip-photo${p.cover_image_url ? '' : ' empty'}" >${p.cover_image_url ? '' : '–'}</div>
      <b>${escapeHtml(p.title)}</b>
      <span>${escapeHtml(p.portfolio_categories?.name || 'Sin categoría')}</span>
    </button>
  `).join('') : '<p class="panel-sub">Todavía no hay fotografías — añade el primer proyecto desde Portfolio.</p>';
  stripEl.querySelectorAll('.og-strip-item').forEach(el=>{const photo=recentProjects.find(p=>p.id===el.dataset.projectId);const url=window.OGServiceCatalog.imageUrl(photo?.cover_image_url||'');if(url)el.querySelector('.og-strip-photo').style.backgroundImage='url('+JSON.stringify(url.startsWith('assets/')?'/'+url:url)+')';});
  stripEl.querySelectorAll('.og-strip-item').forEach(el=>el.addEventListener('click',async()=>{await switchTab('projects');await openPortfolioPhotoById(el.dataset.projectId);}));
}

// ============================================================
// Proyectos y portfolio
// ============================================================
let currentProjectFilter = 'all';
let allProjectsCache = [];

async function loadCategories() {
  const { data: categories, error } = await readStudio(supabaseClient.from('portfolio_categories').select('*').order('sort_order'));
  if(error){document.getElementById('category-list').textContent='No se pudieron cargar las categorías. Vuelve a abrir Portfolio para reintentar.';return [];}

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
      const toggle=e.target,value=toggle.checked;toggle.disabled=true;try{const result=await supabaseClient.from('portfolio_categories').update({is_active:value}).eq('id',cat.id).eq('is_active',cat.is_active).select('id');if(result.error||!result.data?.length)throw Error('No se pudo confirmar la categoría. Recarga para revisar su estado.');cat.is_active=value;}catch(error){toggle.checked=cat.is_active;alert(error.message);}finally{toggle.disabled=false;}
    });
    catList.appendChild(row);
  });
  enableDragReorder(catList, '.category-row', () => persistOrder(catList, '.category-row', 'portfolio_categories'));

  const select = document.getElementById('project-category');
  if(select)select.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

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

let portfolioLoadVersion=0,portfolioLoadError=false;
async function loadProjectsData() {
  const version=++portfolioLoadVersion;
  const { data, error } = await readStudio(supabaseClient.from('portfolio_projects').select('*, portfolio_categories(name), portfolio_workflows(project_id)').order('sort_order'));
  if(version!==portfolioLoadVersion)return;
  portfolioLoadError=!!error||!Array.isArray(data);
  if(portfolioLoadError){allProjectsCache=[];return;}
  allProjectsCache=data;
}

function renderProjects() {
  const projList = document.getElementById('project-list');
  projList.innerHTML = '';
  if(portfolioLoadError){projList.textContent='No se pudo cargar el portfolio. Vuelve a abrir esta sección para reintentarlo.';return;}
  const filtered = currentProjectFilter === 'all'
    ? allProjectsCache
    : allProjectsCache.filter(p => p.category_id === currentProjectFilter);

  if (!filtered.length) {
    projList.innerHTML = '<p class="panel-sub">No hay proyectos en esta categoría todavía.</p>';
    return;
  }

  filtered.forEach(p => {
    const status = resolveStatus(p);
    const origin = Array.isArray(p.portfolio_workflows) ? p.portfolio_workflows[0] : p.portfolio_workflows;
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
          ? `<button type="button" class="album-open-photo" data-open-photo aria-label="Abrir fotos de ${escapeAttr(p.title)}"><img class="album-photo" src="${escapeAttr(p.cover_image_url)}" alt="" draggable="false"></button>`
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
        ${origin ? (origin.project_id ? '<button type="button" class="link-btn" data-origin-open>Ver reserva de origen ↗</button>' : '<span class="panel-sub">Reserva de origen eliminada</span>') : '<button type="button" class="link-btn" data-origin-link>Vincular reserva de origen ↗</button>'}
      </div>
      <div class="album-controls">
        <label class="link-btn file-label">Cambiar foto<input type="file" accept="image/*" data-field="photo" hidden></label>
        <button class="link-btn" data-action="delete">Eliminar</button>
      </div>
    `;
    row.querySelector('[data-open-photo]')?.addEventListener('click',()=>openPortfolioPhotoById(p.id));
    row.querySelector('[data-origin-open]')?.addEventListener('click',()=>openWorkspaceEntity('bookings',origin.project_id));
    row.querySelector('[data-origin-link]')?.addEventListener('click',()=>preparePortfolioWorkflow(p.id));
    row.querySelector('[data-field="layout"]').value = p.layout_class || 'tall';
    row.querySelector('[data-field="layout"]').addEventListener('change', async (e) => {
      const value=e.target.value;e.target.disabled=true;try{const result=await supabaseClient.from('portfolio_projects').update({layout_class:value}).eq('id',p.id).select('id');if(result.error||!result.data?.length)throw Error('No se pudo confirmar el formato.');p.layout_class=value;}catch(error){e.target.value=p.layout_class||'tall';alert(error.message);}finally{e.target.disabled=false;}
    });
    row.querySelector('[data-field="status"]').value = status;
    row.querySelector('[data-field="status"]').addEventListener('change', async (e) => {
      const next = e.target.value;
      const patch = { is_published: next === 'published' };
      e.target.disabled=true;const { data,error } = await supabaseClient.from('portfolio_projects').update({ ...patch, status: next }).eq('id', p.id).eq('is_published',p.is_published).select('id');e.target.disabled=false;
      if(error||!data?.length){e.target.value=status;alert('No se pudo confirmar la publicación. Recarga para comprobar el estado.');return;}
      await loadProjectsData();
      renderProjects();
    });
    const handlePhotoChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadMediaFile(file, 'portfolio');
      if (!url) return;
      let update=supabaseClient.from('portfolio_projects').update({cover_image_url:url}).eq('id',p.id);update=p.cover_image_url==null?update.is('cover_image_url',null):update.eq('cover_image_url',p.cover_image_url);const saved=await update.select('id');
      if(saved.error||!saved.data?.length){alert('Archivo subido, pero no se confirmó el cambio de foto. Revisa la biblioteca antes de reintentar.');return;}
      await loadProjectsData();
      renderProjects();
    };
    row.querySelector('[data-field="photo"]').addEventListener('change', handlePhotoChange);
    const emptyPhotoInput = row.querySelector('[data-field="photo-empty"]');
    if (emptyPhotoInput) emptyPhotoInput.addEventListener('change', handlePhotoChange);
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${p.title}"?`)) return;
      const result=await supabaseClient.from('portfolio_projects').delete().eq('id',p.id).select('id');if(result.error||!result.data?.length){alert('No se pudo confirmar la eliminación. Recarga para comprobarlo.');return;}
      await loadProjectsData();
      renderProjects();
    });
    projList.appendChild(row);
  });

  enableDragReorder(projList, '.album-card', () => persistOrder(projList, '.album-card', 'portfolio_projects'));
  applyGlobalSearch();
}

async function loadProjects() {
  currentProjectFilter = 'all';
  await loadCategories();
  await loadProjectsData();
  renderProjects();
  await loadPortfolioGroupsEditor();
}

const portfolioWorkflowDialog=document.getElementById('portfolio-workflow-dialog');
let portfolioWorkflowIntent=null,portfolioWorkflowVersion=0,portfolioWorkflowSaving=false;
function portfolioSnapshot(piece){return Object.fromEntries(['title','cover_image_url','is_published','status'].map(key=>[key,piece[key]??null]));}
function bookingSnapshot(booking){return Object.fromEntries(['client_id','title','event_date','status'].map(key=>[key,booking[key]??null]));}
function closePortfolioWorkflow(){if(portfolioWorkflowSaving)return;++portfolioWorkflowVersion;portfolioWorkflowIntent=null;portfolioWorkflowDialog.close();}
document.getElementById('portfolio-workflow-cancel').addEventListener('click',closePortfolioWorkflow);
portfolioWorkflowDialog.addEventListener('cancel',e=>{e.preventDefault();closePortfolioWorkflow();});
async function preparePortfolioWorkflow(portfolioId){
  if(portfolioWorkflowSaving)return;
  const version=++portfolioWorkflowVersion;portfolioWorkflowIntent=null;
  document.getElementById('portfolio-workflow-form').reset();
  const select=document.getElementById('portfolio-workflow-project');select.disabled=true;select.innerHTML='<option value="">Selecciona una reserva existente</option>';
  document.getElementById('portfolio-workflow-save').disabled=true;
  document.getElementById('portfolio-workflow-source').textContent='Cargando pieza y reservas…';
  document.getElementById('portfolio-workflow-target').textContent='';
  const errorEl=document.getElementById('portfolio-workflow-error');errorEl.hidden=true;
  if(!portfolioWorkflowDialog.open)portfolioWorkflowDialog.showModal();
  try{
    const [pieceResult,bookingsResult]=await Promise.all([
      supabaseClient.from('portfolio_projects').select('id,title,cover_image_url,is_published,status,portfolio_workflows(project_id)').eq('id',portfolioId).single(),
      supabaseClient.from('projects').select('id,title,client_id,event_date,status,clients(name)').neq('status','cancelled').order('event_date',{ascending:false,nullsFirst:false})
    ]);
    if(version!==portfolioWorkflowVersion)return;
    const piece=pieceResult.data;
    if(pieceResult.error||!piece||bookingsResult.error||!Array.isArray(bookingsResult.data))throw new Error('No se pudieron comprobar la pieza y las reservas. No se ha vinculado nada.');
    const prior=Array.isArray(piece.portfolio_workflows)?piece.portfolio_workflows[0]:piece.portfolio_workflows;
    if(prior){if(!prior.project_id)throw new Error('La reserva de origen se eliminó. No se reasigna automáticamente.');closePortfolioWorkflow();return openWorkspaceEntity('bookings',prior.project_id);}
    document.getElementById('portfolio-workflow-source').textContent=piece.title+' · Estado público actual: '+(piece.is_published?'Publicado':'No publicado');
    select.innerHTML='<option value="">Selecciona una reserva existente</option>'+bookingsResult.data.map(b=>`<option value="${escapeAttr(b.id)}">${escapeHtml(b.title)}${b.clients?.name?' · '+escapeHtml(b.clients.name):''}${b.event_date?' · '+escapeHtml(b.event_date):''}</option>`).join('');
    select.disabled=false;portfolioWorkflowIntent={portfolioId:piece.id,piece:portfolioSnapshot(piece),bookings:bookingsResult.data};select.focus();
  }catch(error){if(version!==portfolioWorkflowVersion)return;errorEl.textContent=error.message||'No se pudo preparar el vínculo.';errorEl.hidden=false;}
}
document.getElementById('portfolio-workflow-project').addEventListener('change',()=>{
  const booking=portfolioWorkflowIntent?.bookings.find(b=>b.id===document.getElementById('portfolio-workflow-project').value);
  document.getElementById('portfolio-workflow-save').disabled=!booking;
  document.getElementById('portfolio-workflow-target').textContent=booking?[booking.title,booking.clients?.name,booking.event_date,'Estado: '+(statusLabels[booking.status]||booking.status)].filter(Boolean).join(' · '):'';
});
document.getElementById('portfolio-workflow-form').addEventListener('submit',async e=>{
  e.preventDefault();if(portfolioWorkflowSaving||!portfolioWorkflowIntent)return;
  const intent=portfolioWorkflowIntent,booking=intent.bookings.find(b=>b.id===document.getElementById('portfolio-workflow-project').value);if(!booking)return;
  const controls=['save','cancel','project'].map(key=>document.getElementById('portfolio-workflow-'+key));
  const errorEl=document.getElementById('portfolio-workflow-error');errorEl.hidden=true;portfolioWorkflowSaving=true;controls.forEach(el=>el.disabled=true);
  try{
    const {data,error}=await supabaseClient.rpc('studio_link_portfolio_booking',{p_portfolio_id:intent.portfolioId,p_expected_portfolio:intent.piece,p_project_id:booking.id,p_expected_project:bookingSnapshot(booking)});
    if(error||!data?.project_id)throw new Error('No se pudo vincular: revisa si los registros cambiaron o si ya existe otro origen. No se ha publicado ni modificado la pieza.');
    portfolioWorkflowSaving=false;closePortfolioWorkflow();await openWorkspaceEntity('bookings',data.project_id);
  }catch(error){errorEl.textContent=error.message||'No se pudo guardar el vínculo.';errorEl.hidden=false;}
  finally{portfolioWorkflowSaving=false;controls.forEach(el=>el.disabled=false);}
});

document.getElementById('new-project-btn').addEventListener('click', () => {
  const form = document.getElementById('project-form');
  if(!form.hidden){closeProjectCreate();return;}
  form.hidden=false;form.scrollIntoView({block:'start'});document.getElementById('project-title').focus();
});

let projectCreateIntent=null,projectCreateBusy=false;
const projectCreateForm=document.getElementById('project-form');
function closeProjectCreate(){
 if(projectCreateBusy)return;
 if(projectCreateIntent&&!confirm('¿Cerrar el proyecto pendiente? Los borradores o archivos ya subidos se conservarán en la biblioteca; no se eliminan.'))return;
 for(const item of projectCreateIntent?.items||[])if(item.preview)URL.revokeObjectURL(item.preview);
 projectCreateIntent=null;projectCreateForm.reset();projectCreateForm.hidden=true;
 projectCreateForm.querySelectorAll('input,button').forEach(el=>el.disabled=false);
 document.getElementById('project-create-status').textContent='';
}
document.getElementById('project-create-cancel').addEventListener('click',closeProjectCreate);
projectCreateForm.addEventListener('submit',async e=>{
 e.preventDefault();if(projectCreateBusy)return;
 const status=document.getElementById('project-create-status');
 if(portfolioGroupEditorBusy||portfolioGroupEditorState?.dirty){status.textContent='Guarda o recarga los cambios de grupos antes de crear un proyecto.';return;}
 try{
  if(!projectCreateIntent)projectCreateIntent=window.OGPortfolioPhotoEditor.newProject(document.getElementById('project-title').value,Array.from(document.getElementById('project-photo').files),()=>crypto.randomUUID(),file=>URL.createObjectURL(file));
  projectCreateBusy=true;projectCreateForm.querySelectorAll('input,button').forEach(el=>el.disabled=true);
  status.textContent='Guardando fotos en borrador y creando el álbum…';
  const group=await window.OGPortfolioPhotoEditor.createProject(projectCreateIntent,supabaseClient,document.getElementById('project-upload-consent').checked,window.OGPortfolioGroups);
  if(!group)return;
  for(const item of projectCreateIntent.items)if(item.preview)URL.revokeObjectURL(item.preview);
  projectCreateIntent=null;projectCreateForm.reset();projectCreateForm.hidden=true;status.textContent='';
  await loadProjects();await openPortfolioPhotoGroup(group);
 }catch(error){status.textContent=error.message||'No se pudo confirmar el proyecto. Reintenta para verificarlo.';}
 finally{projectCreateBusy=false;projectCreateForm.querySelectorAll('input,button').forEach(el=>el.disabled=false);if(projectCreateIntent){document.getElementById('project-title').disabled=true;document.getElementById('project-photo').disabled=true;}}
});
window.addEventListener('beforeunload',event=>{if(projectCreateIntent||projectCreateBusy||portfolioGroupEditorState?.dirty){event.preventDefault();event.returnValue='';}});

// ============================================================
// Galerías y archivos multimedia
// ============================================================
async function loadGalleries() {
  await loadPortfolioGroupsEditor();
  const groupsEl=document.getElementById('gallery-groups');
  if(!portfolioGroupEditorState){groupsEl.textContent='No se pudieron cargar los álbumes. Vuelve a abrir esta sección para reintentar.';}
  else renderPortfolioPhotoGroups(groupsEl);

  const mediaEl = document.getElementById('media-library');
  const { data: files, error } = await supabaseClient.storage.from('media').list('portfolio', {
    limit: 60, sortBy: { column: 'created_at', order: 'desc' },
  });
  if(error){mediaEl.textContent='No se pudo cargar la biblioteca de archivos. No significa que esté vacía.';}
  else if (!files || !files.length) {
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
const serviceEditors = new WeakMap();
const serviceLoads = new WeakMap();
function serviceFingerprint(rows) { return JSON.stringify(window.OGServiceCatalog.expected(rows)); }
function serviceFieldsMarkup(catalog) {
  return catalog.items.map((item,i)=>`<div class="content-field draggable" draggable="true" data-service-id="${escapeAttr(item.id)}">
    ${dragHandleSvg}<div class="content-field-body"><label class="content-field-label">Servicio ${i+1}</label>
      <div class="content-field-row"><label>Nombre ES<input maxlength="120" data-service-lang="es" value="${escapeAttr(item.labels.es)}"></label><label>Name EN<input maxlength="120" data-service-lang="en" value="${escapeAttr(item.labels.en)}"></label></div>
      <div class="content-field-row"><label>Descripción ES<textarea maxlength="5000" data-service-description="es">${escapeHtml(item.descriptions.es)}</textarea></label><label>Description EN<textarea maxlength="5000" data-service-description="en">${escapeHtml(item.descriptions.en)}</textarea></label></div>
      <label>Imagen (ruta assets/ o URL HTTPS)<input data-service-image value="${escapeAttr(item.image)}"></label>
      <div class="ws-context-actions"><label><input type="checkbox" data-service-active${item.active?' checked':''}> Visible en la web</label><button type="button" class="og-btn og-btn-outline" data-service-up aria-label="Subir servicio">↑</button><button type="button" class="og-btn og-btn-outline" data-service-down aria-label="Bajar servicio">↓</button><button type="button" class="og-btn og-btn-outline" data-service-remove>Eliminar del catálogo</button></div>
    </div></div>`).join('');
}
function collectServiceCatalog(containerId) {
  const container=document.getElementById(containerId);
  if (!serviceEditors.has(container)) throw new Error('El catálogo no está cargado.');
  return window.OGServiceCatalog.validate({version:1,legacyIds:[...serviceEditors.get(container).catalog.legacyIds],items:Array.from(container.querySelectorAll('[data-service-id]')).map(row=>({
    id:row.dataset.serviceId,labels:{es:row.querySelector('[data-service-lang="es"]').value,en:row.querySelector('[data-service-lang="en"]').value},
    descriptions:{es:row.querySelector('[data-service-description="es"]').value,en:row.querySelector('[data-service-description="en"]').value},image:row.querySelector('[data-service-image]').value.trim(),active:row.querySelector('[data-service-active]').checked
  }))});
}
function renderServiceEditor(container,catalog,state) {
  container.innerHTML=serviceFieldsMarkup(catalog)+'<button type="button" class="og-btn og-btn-outline" data-service-add>+ Añadir servicio</button>';
  const changed=()=>{const current=serviceEditors.get(container);if(current){current.dirty=true;if(current.onChange)current.onChange();}};
  container.querySelectorAll('input,textarea').forEach(input=>input.addEventListener('input',changed));
  // Keyboard/touch reordering carries the entire stable-ID record (including media/descriptions).
  container.querySelectorAll('[data-service-up],[data-service-down],[data-service-remove]').forEach(button=>button.addEventListener('click',()=>{
    const row=button.closest('[data-service-id]');
    if(button.hasAttribute('data-service-remove')) {if(!confirm('¿Quitar este servicio del catálogo público? Las solicitudes y reservas históricas no se modifican.'))return;row.remove();}
    else if(button.hasAttribute('data-service-up')&&row.previousElementSibling?.hasAttribute('data-service-id')) container.insertBefore(row,row.previousElementSibling);
    else if(button.hasAttribute('data-service-down')&&row.nextElementSibling?.hasAttribute('data-service-id'))container.insertBefore(row.nextElementSibling,row);
    changed();
  }));
  container.querySelector('[data-service-add]').addEventListener('click',()=>{
    let catalog;try{catalog=collectServiceCatalog(container.id);}catch(error){return alert(error.message);}
    catalog.items.push({id:crypto.randomUUID(),labels:{es:'Nuevo servicio',en:'New service'},descriptions:{es:'',en:''},image:window.OGServiceCatalog.images[0],active:false});
    renderServiceEditor(container,catalog,state);changed();
  });
  if(!state.dragBound){state.dragBound=true;enableDragReorder(container,'.content-field.draggable',changed);}
}
async function fetchServiceCatalog() {
  const {data,error}=await supabaseClient.from('site_content').select('key,lang,value').in('key',['serviceCatalog','serviceList']);
  if(error||!Array.isArray(data))throw new Error('No se pudo cargar el catálogo. No guardes datos de reserva como si fueran actuales.');
  return {catalog:window.OGServiceCatalog.fromRows(window.DEFAULT_COPY,data),baseline:serviceFingerprint(data)};
}
async function loadServicesInto(containerId,onChange) {
  const container=document.getElementById(containerId),version=(serviceLoads.get(container)||0)+1;
  serviceLoads.set(container,version);
  const prior=serviceEditors.get(container);
  if(prior?.dirty)return; // A section switch must not erase an unsaved editor.
  try{
    const loaded=await fetchServiceCatalog();if(serviceLoads.get(container)!==version||serviceEditors.get(container)?.dirty)return;
    const state={...loaded,onChange,dirty:false,dragBound:prior?.dragBound||false};serviceEditors.set(container,state);renderServiceEditor(container,loaded.catalog,state);
  }catch(error){if(serviceLoads.get(container)!==version||serviceEditors.get(container)?.dirty)return;serviceEditors.delete(container);container.textContent=error.message;}
}
function serviceSaveRequest(containerId) {
  const state=serviceEditors.get(document.getElementById(containerId));
  if(!state)throw new Error('Primero carga el catálogo de servicios.');
  return {p_expected:JSON.parse(state.baseline),p_catalog:collectServiceCatalog(containerId)};
}
function serviceSaveCompleted(containerId,saved){
  const container=document.getElementById(containerId),state=serviceEditors.get(container);
  if(!state)return false;
  serviceLoads.set(container,(serviceLoads.get(container)||0)+1);
  state.baseline=JSON.stringify(saved);
  try{state.dirty=JSON.stringify(collectServiceCatalog(containerId))!==JSON.stringify(window.OGServiceCatalog.parse(saved.find(row=>row.key==='serviceCatalog').value));}catch{state.dirty=true;}
  return !state.dirty;
}
async function persistServiceCatalog(containerId){
  const {data,error}=await supabaseClient.rpc('studio_save_service_catalog',serviceSaveRequest(containerId));
  if(error||!Array.isArray(data)||data.length!==3||data.some(row=>typeof row.value!=='string'))throw new Error('No se pudo publicar el catálogo: puede haber cambiado en otra pestaña o faltar su migración. Tus cambios siguen aquí; revisa antes de reintentar.');
  // Normalize response property order for stable draft baseline comparison.
  const saved=window.OGServiceCatalog.expected(data);
  return serviceSaveCompleted(containerId,saved);
}

async function saveServiceLists(containerId,statusEl) {
  try{
    const clean=await persistServiceCatalog(containerId);
    if(statusEl){statusEl.hidden=false;statusEl.textContent=clean?'Guardado. Catálogo, descripciones e imágenes publicados juntos.':'Se guardó la versión enviada. Tus cambios más recientes siguen pendientes.';}return true;
  }catch(error){if(statusEl){statusEl.hidden=false;statusEl.textContent=error.message||'No se pudo guardar.';}return false;}
}
async function loadServices(){await loadServicesInto('services-fields');}
document.getElementById('services-save').addEventListener('click',async()=>{
  const button=document.getElementById('services-save');if(button.disabled)return;button.disabled=true;
  try{const ok=await saveServiceLists('services-fields',document.getElementById('services-status'));if(ok&&document.getElementById('content-services').innerHTML)await loadServicesInto('content-services',onContentFieldChanged);}finally{button.disabled=false;}
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
  try { return window.OGServiceCatalog.active(collectServiceCatalog('content-services'),lang).map(item=>item.label); } catch { return []; }
}

function sendPreview() {
  const frame = document.getElementById('preview-frame');
  if (!frame || !frame.contentWindow) return;
  const fields = collectFieldValues(previewLang);
  let serviceCatalog; try { serviceCatalog=collectServiceCatalog('content-services'); } catch { return; }
  try {
    frame.contentWindow.postMessage({ type: 'og-preview', lang: previewLang, fields, serviceCatalog }, window.location.origin);
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
    version:2, serviceCatalog:collectServiceCatalog('content-services'),
    serviceBaseline:serviceEditors.get(document.getElementById('content-services'))?.baseline,
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

let contentLoadReady=false,contentLoading=false;
async function loadSiteContent() {
  if(contentLoading||contentLoadReady)return;
  contentLoading=true;document.getElementById('content-save').disabled=true;
  try{
  const { data, error } = await supabaseClient.from('site_content').select('key, lang, value');
  if (error || !Array.isArray(data)) { document.getElementById('content-save').disabled=true; setAiStatus('No se pudo cargar el contenido actual. Vuelve a abrir el editor antes de publicar.'); return; }

  contentOverrides = {};
  (data || []).filter(row => row.key !== 'studio_ai_enabled').forEach(row => { contentOverrides[contentKey(row.key, row.lang)] = row.value; });

  document.getElementById('content-fields-hero').innerHTML = fieldsMarkup(HERO_KEYS);
  document.getElementById('content-fields-textos').innerHTML = fieldsMarkup(TEXT_KEYS);
  document.querySelectorAll('#content-fields-hero textarea, #content-fields-textos textarea').forEach(el=>el.disabled=true);
  await loadServicesInto('content-services', onContentFieldChanged);
  if(!serviceEditors.has(document.getElementById('content-services')))throw Error('No se pudo cargar el catálogo. Vuelve a abrir Contenido para reintentar; publicar sigue desactivado.');

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
    const container=document.getElementById('content-services'),state=serviceEditors.get(container);
    if(draft.version===2&&state&&draft.serviceBaseline===state.baseline){
      try{const restored=window.OGServiceCatalog.parse(draft.serviceCatalog);renderServiceEditor(container,restored,state);state.dirty=true;}catch(error){alert('El borrador de servicios no es válido; se conserva el catálogo publicado.');}
    }else if(draft.serviceCatalog||draft.servicesEs||draft.servicesEn){
      alert('Hay un borrador de servicios anterior o con otra versión publicada. No se ha aplicado por posición: revisa los servicios para no mezclar nombres, imágenes y descripciones.');
    }
    markContentDirty();
  } else {
    setSaveBarState('saved');
  }
  contentLoadReady=true;document.getElementById('content-save').disabled=false;
  document.querySelectorAll('#content-fields-hero textarea, #content-fields-textos textarea').forEach(el=>el.disabled=false);
  sendPreview();
  }catch(error){contentLoadReady=false;document.getElementById('content-save').disabled=true;setAiStatus(error.message||'No se pudo cargar el contenido. Vuelve a abrir esta sección.');}finally{contentLoading=false;}
}

document.getElementById('content-save').addEventListener('click', async () => {
  const saveBtn=document.getElementById('content-save');if(saveBtn.disabled||!contentLoadReady)return;saveBtn.disabled=true;
  let catalogSaved=false;
  try{
    const rows=[];
    document.querySelectorAll('#content-fields-hero textarea, #content-fields-textos textarea').forEach(el=>rows.push({key:el.dataset.key,lang:el.dataset.lang,value:el.value}));
    const catalogClean=await persistServiceCatalog('content-services');catalogSaved=true;
    const {error}=await supabaseClient.from('site_content').upsert(rows,{onConflict:'key,lang'});
    if(error)throw error;
    const fieldsClean=Array.from(document.querySelectorAll('#content-fields-hero textarea, #content-fields-textos textarea')).every(el=>rows.some(row=>row.key===el.dataset.key&&row.lang===el.dataset.lang&&row.value===el.value));
    if(catalogClean&&!serviceEditors.get(document.getElementById('content-services'))?.dirty&&fieldsClean){clearDraft();setSaveBarState('saved');}else{markContentDirty();saveDraftToLocalStorage();}
    if(document.getElementById('services-fields').innerHTML)await loadServicesInto('services-fields');
  }catch(error){markContentDirty();saveDraftToLocalStorage();alert((catalogSaved?'El catálogo se guardó, pero no se pudieron guardar los textos. ':'')+(error.message||'No se pudo guardar.'));}
  finally{saveBtn.disabled=false;}
});

// ---------- Persistent AI spending switch (server also checks every request) ----------
let aiEnabled = false;
let aiControlBusy = false;
const aiControl = document.getElementById('studio-ai-enabled');
function paintAIControl(message) {
  aiControl.checked = aiEnabled;
  aiControl.disabled = aiControlBusy;
  document.getElementById('studio-ai-control-status').textContent = message || (aiEnabled ? 'IA activada. Solo se usa bajo petición.' : 'IA apagada. No se enviarán nuevas peticiones.');
}
async function loadAIControl() {
  if (aiControlBusy) return;
  aiControlBusy = true;
  aiEnabled = false;
  paintAIControl('Comprobando estado…');
  try {
    const { data, error } = await supabaseClient.from('site_content').select('value').eq('key', 'studio_ai_enabled').eq('lang', 'es').maybeSingle();
    if (error) throw error;
    aiEnabled = data?.value === 'true';
    paintAIControl();
  } catch {
    aiEnabled = false;
    paintAIControl('No se pudo comprobar el estado. IA bloqueada por seguridad; vuelve a intentarlo.');
  } finally { aiControlBusy = false; aiControl.disabled = false; }
}
aiControl.addEventListener('change', async () => {
  if (aiControlBusy) return;
  const desired = aiControl.checked;
  aiControlBusy = true;
  paintAIControl('Guardando estado…');
  try {
    const { data, error } = await supabaseClient.from('site_content').upsert({ key: 'studio_ai_enabled', lang: 'es', value: String(desired) }, { onConflict: 'key,lang' }).select('value').single();
    if (error || data?.value !== String(desired)) throw error || new Error('Not saved');
    aiEnabled = desired;
    paintAIControl();
  } catch {
    // Do not claim OFF was saved if a network failure made the result uncertain.
    aiEnabled = false;
    paintAIControl('No se pudo confirmar el cambio. No uses la IA hasta volver a comprobar el estado.');
  } finally { aiControlBusy = false; aiControl.disabled = false; }
});
window.addEventListener('focus', () => { if (!dashboard.hidden) loadAIControl(); });

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
  if (!aiEnabled || aiControlBusy) { setAiStatus('La IA está apagada o su estado no está confirmado.'); return; }
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
        contentOverrides: (contentRows || []).filter(row => row.key !== 'studio_ai_enabled'),
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
  if (pendingAiChanges.some(c=>c.table==='site_content'&&['serviceList','serviceCatalog','serviceBlurbs'].includes(c.key))) { setAiStatus('Los servicios se editan en Servicios para mantener sus identificadores, imágenes y descripciones unidos. No se ha aplicado este lote.'); return; }
  setAiStatus('Aplicando…');
  for (const c of pendingAiChanges) {
    if (c.table === 'site_content') {
      await supabaseClient.from('site_content')
        .upsert({ key: c.key, lang: c.lang, value: c.new_value }, { onConflict: 'key,lang' });
    } else if (c.table === 'portfolio_projects' && c.id && c.field) {
      const updates={ [c.field]:c.new_value };
      if(c.field==='is_published')updates.status=c.new_value?'published':'draft';
      if(c.field==='status')updates.is_published=c.new_value==='published';
      const {error}=await supabaseClient.from('portfolio_projects').update(updates).eq('id',c.id);
      if(error){setAiStatus('No se pudieron aplicar todos los cambios. Revisa los registros antes de reintentar.');return;}
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
let ugcLoadVersion=0;
async function loadUgc(){
 const version=++ugcLoadVersion,listEl=document.getElementById('ugc-project-list');
 const categories=await readStudio(supabaseClient.from('portfolio_categories').select('*'));
 if(version!==ugcLoadVersion)return;
 if(categories.error||!Array.isArray(categories.data)){listEl.textContent='No se pudo comprobar la categoría UGC. Vuelve a abrir la sección para reintentar.';await loadSocial();return;}
 const cat=categories.data.find(c=>(c.slug||'').toLowerCase()==='ugc'||(c.name||'').toLowerCase().includes('ugc'));
 if(!cat){listEl.textContent='No hay una categoría UGC configurada.';await loadSocial();return;}
 const result=await readStudio(supabaseClient.from('portfolio_projects').select('*').eq('category_id',cat.id).order('sort_order'));
 if(version!==ugcLoadVersion)return;
 if(result.error||!Array.isArray(result.data))listEl.textContent='No se pudieron cargar las fotos UGC. No significa que la categoría esté vacía.';
 else{listEl.replaceChildren();if(!result.data.length)listEl.textContent='Todavía no hay fotos UGC.';
  for(const photo of result.data){const button=document.createElement('button');button.type='button';button.className='album-card photo-group-launcher';const url=window.OGServiceCatalog.imageUrl(photo.cover_image_url||'');if(url){const img=document.createElement('img');img.src=url.startsWith('assets/')?'/'+url:url;img.alt='';img.loading='lazy';button.append(img);}const label=document.createElement('strong');label.textContent=photo.title;button.append(label);button.addEventListener('click',()=>openPortfolioPhotoById(photo.id));listEl.append(button);}}
 await loadSocial();
}

let socialLoadVersion=0;
async function loadSocial() {
  const version=++socialLoadVersion;
  const { data, error } = await readStudio(supabaseClient.from('social_posts').select('*').order('sort_order'));
  if(version!==socialLoadVersion)return;const list=document.getElementById('social-list');
  if(error||!Array.isArray(data)){list.textContent='No se pudieron cargar las publicaciones. Vuelve a abrir UGC para reintentar.';return;}
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
      const toggle=e.target,value=toggle.checked;toggle.disabled=true;try{const result=await supabaseClient.from('social_posts').update({is_selected:value}).eq('id',post.id).eq('is_selected',post.is_selected).select('id');if(result.error||!result.data?.length)throw Error('No se pudo confirmar la selección. Recarga para comprobarlo.');post.is_selected=value;}catch(error){toggle.checked=post.is_selected;alert(error.message);}finally{toggle.disabled=false;}
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if(!confirm('¿Eliminar esta referencia social?'))return;const result=await supabaseClient.from('social_posts').delete().eq('id',post.id).select('id');if(result.error||!result.data?.length){alert('No se pudo confirmar la eliminación. Recarga para comprobarlo.');return;}
      loadSocial();
    });
    list.appendChild(row);
  });
}

document.getElementById('social-form').addEventListener('submit', async (e) => {
  e.preventDefault();const form=e.currentTarget;if(form.dataset.saving==='true')return;form.dataset.saving='true';const controls=form.querySelectorAll('input,select,button');controls.forEach(el=>el.disabled=true);try{
  const platform = document.getElementById('social-platform').value;
  const external_url = document.getElementById('social-url').value.trim();
  if (!external_url) return;
  await saveNewRecord(form,'social_posts',{platform,external_url});
  e.target.reset();
  loadSocial();  }catch(error){alert(error.message||'No se pudo confirmar el guardado.');}finally{delete form.dataset.saving;controls.forEach(el=>el.disabled=false);}
});

// ---------- Content ideas (drafts only — never saved automatically) ----------
function setIdeaStatus(text) {
  const el = document.getElementById('idea-status');
  if (!text) { el.hidden = true; el.textContent = ''; return; }
  el.hidden = false;
  el.textContent = text;
}

document.getElementById('idea-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!aiEnabled || aiControlBusy) { setIdeaStatus('La IA está apagada. Actívala en Editar web → IA.'); return; }
  const prompt = document.getElementById('idea-prompt').value.trim();
  if (!prompt) return;
  const platform = document.getElementById('idea-platform').value;
  const submitBtn = document.getElementById('idea-submit');
  submitBtn.disabled = true;
  setIdeaStatus('Pensando…');
  document.getElementById('idea-list').innerHTML = '';

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const { data: contentRows } = await supabaseClient.from('site_content').select('key, lang, value').eq('lang', 'es');
    const overrides = {};
    (contentRows || []).forEach(row => { overrides[row.key] = row.value; });
    const defaultsEs = (window.DEFAULT_COPY && window.DEFAULT_COPY.es) || {};
    const brand = {
      serviceList: overrides.serviceList ? JSON.parse(overrides.serviceList) : defaultsEs.serviceList,
      aboutBody: overrides.aboutBody || defaultsEs.aboutBody,
      studioTag: overrides.studioTag || defaultsEs.studioTag,
    };

    const res = await fetch('/api/market-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ prompt, platform, brand }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Error ${res.status}`);

    renderIdeas(json.summary || '', Array.isArray(json.ideas) ? json.ideas : []);
    setIdeaStatus(json.ideas && json.ideas.length ? '' : (json.summary || 'No he encontrado ninguna idea para eso.'));
  } catch (err) {
    setIdeaStatus('Error: ' + err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

function renderIdeas(summary, ideas) {
  const container = document.getElementById('idea-list');
  if (!ideas.length) { container.innerHTML = ''; return; }
  container.innerHTML = `
    ${summary ? `<p class="ai-summary">${escapeHtml(summary)}</p>` : ''}
    ${ideas.map((idea, i) => `
      <div class="idea-card" data-index="${i}">
        <div class="idea-card-head">
          <span class="idea-card-tag">${escapeHtml(idea.platform || '')} · ${escapeHtml(idea.format || '')}</span>
        </div>
        <div class="idea-card-hook">${escapeHtml(idea.hook || '')}</div>
        <div class="idea-card-caption">${escapeHtml(idea.caption || '')}</div>
        <div class="idea-card-hashtags">${escapeHtml(idea.hashtags || '')}</div>
        <button type="button" class="og-btn og-btn-outline idea-card-copy" data-action="copy">Copiar</button>
      </div>
    `).join('')}
  `;
  container.querySelectorAll('[data-action="copy"]').forEach((btn, i) => {
    btn.addEventListener('click', async () => {
      const idea = ideas[i];
      const text = `${idea.hook || ''}\n\n${idea.caption || ''}\n\n${idea.hashtags || ''}`.trim();
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copiado';
        setTimeout(() => { btn.textContent = 'Copiar'; }, 1500);
      } catch (e) {
        alert('No se pudo copiar automáticamente. Selecciona el texto a mano.');
      }
    });
  });
}

// ============================================================
// Mensajes y solicitudes (enquiries)
// ============================================================
let enquiryLoadVersion = 0;
async function loadEnquiries() {
  const version = ++enquiryLoadVersion;
  const list = document.getElementById('enquiry-list');
  const [{data, error}, linksResult] = await Promise.all([
    supabaseClient.from('enquiries').select('*, portfolio_projects(title), portfolio_groups(name)').order('created_at', {ascending:false}),
    supabaseClient.from('enquiry_workflows').select('enquiry_id,client_id,project_id')
  ]);
  if (version !== enquiryLoadVersion) return;
  if (error || !Array.isArray(data)) { list.textContent = 'No se pudieron cargar las solicitudes. Vuelve a abrir esta sección.'; return; }
  list.innerHTML = '';
  const linksKnown = !linksResult.error && Array.isArray(linksResult.data);
  if (!linksKnown) { const warning = document.createElement('p'); warning.className = 'panel-sub'; warning.textContent = 'No se pudo comprobar la conexión con clientes y reservas. Comprueba la migración o vuelve a abrir esta sección.'; list.appendChild(warning); }
  if (!data.length) { const empty = document.createElement('p'); empty.textContent = 'Todavía no hay solicitudes.'; list.appendChild(empty); return; }
  data.forEach(en => {
    const link = (linksResult.data || []).find(row => row.enquiry_id === en.id);
    const row = document.createElement('article'); row.className = 'list-row ws-enquiry-row'; row.dataset.enquiryId = en.id; row.tabIndex = -1;
    row.innerHTML = `
      <div><b>${escapeHtml(en.name)}</b><p>${escapeHtml(en.service || 'Sin servicio')} · ${escapeHtml(en.email)}</p>
        <details><summary>Ver solicitud original</summary><p class="ws-source-message">${escapeHtml(en.message || 'Sin mensaje')}</p><p>${escapeHtml(en.phone || 'Sin teléfono')} · ${escapeHtml(en.preferred_date || 'Sin fecha')} · ${escapeHtml(en.budget_range || 'Sin rango de presupuesto')}</p><small>Consentimiento: ${en.consent_accepted ? 'aceptado' : 'no registrado'}</small></details>
      </div>
      <div class="ws-context-actions">
        ${en.portfolio_project_id ? `<button type="button" class="og-btn og-btn-outline" data-open-portfolio-context>Referencia: ${escapeHtml(en.portfolio_projects?.title || 'Ver foto')} ${en.portfolio_groups?.name ? '· '+escapeHtml(en.portfolio_groups.name) : ''} ↗</button>` : ''}
        ${link ? `${link.client_id ? '<button type="button" class="og-btn og-btn-outline" data-open-client>Ver cliente ↗</button>' : '<span>Cliente eliminado</span>'}${link.project_id ? '<button type="button" class="og-btn og-btn-outline" data-open-booking>Ver reserva ↗</button>' : '<span>Reserva eliminada · revisar manualmente</span>'}` : `<button type="button" class="og-btn og-btn-outline" data-start-workflow${!linksKnown || !en.consent_accepted ? ' disabled' : ''}>Revisar y conectar ↗</button>`}
        <label><span class="ws-sr-only">Estado de la solicitud de ${escapeHtml(en.name)}</span><select data-field="status"><option value="new">Nuevo</option><option value="contacted">Contactado</option><option value="archived">Archivado</option></select></label>
      </div>`;
    row.querySelector('[data-open-portfolio-context]')?.addEventListener('click', () => openWorkspaceEntity('projects', en.portfolio_project_id));
    row.querySelector('[data-open-client]')?.addEventListener('click', () => openWorkspaceEntity('clients', link.client_id));
    row.querySelector('[data-open-booking]')?.addEventListener('click', () => openWorkspaceEntity('bookings', link.project_id));
    row.querySelector('[data-start-workflow]')?.addEventListener('click', () => prepareEnquiryWorkflow(en.id));
    const status = row.querySelector('[data-field="status"]'); status.value = en.status;
    status.addEventListener('change', async () => {
      const value = status.value; if (!['new','contacted','archived'].includes(value)) return;
      status.disabled = true;
      try {
        const {data: saved, error} = await supabaseClient.from('enquiries').update({status:value}).eq('id',en.id).select('id').single();
        if (error || !saved) throw new Error('No se pudo guardar el estado.');
        en.status = value; updateMessageBadge();
      } catch (error) { status.value = en.status; alert('No se pudo guardar el estado de la solicitud.'); }
      finally { status.disabled = false; }
    });
    list.appendChild(row);
  });
}

const enquiryWorkflowDialog = document.getElementById('enquiry-workflow-dialog');
let enquiryWorkflowIntent = null, enquiryWorkflowVersion = 0, enquiryTargetVersion = 0, enquiryWorkflowSaving = false;
function enquirySnapshot(source) {
  return Object.fromEntries(['name','email','phone','service','preferred_date','budget_range','message','consent_accepted','consent_at'].map(key => [key,source[key] ?? null]));
}
function closeEnquiryWorkflow() {
  if (enquiryWorkflowSaving) return;
  ++enquiryWorkflowVersion; ++enquiryTargetVersion; enquiryWorkflowIntent = null; enquiryWorkflowDialog.close();
}
document.getElementById('enquiry-workflow-cancel').addEventListener('click', closeEnquiryWorkflow);
enquiryWorkflowDialog.addEventListener('cancel', e => {e.preventDefault(); closeEnquiryWorkflow();});
async function prepareEnquiryWorkflow(enquiryId) {
  if (enquiryWorkflowSaving) return;
  const version = ++enquiryWorkflowVersion; ++enquiryTargetVersion; enquiryWorkflowIntent = null;
  document.getElementById('enquiry-workflow-form').reset();
  document.getElementById('enquiry-workflow-save').disabled = true;
  document.getElementById('enquiry-workflow-client').disabled = true;
  document.getElementById('enquiry-workflow-project').disabled = true;
  document.getElementById('enquiry-workflow-project').innerHTML = '<option value="">Nueva reserva en consulta</option>';
  document.getElementById('enquiry-workflow-title-label').hidden = false;
  document.getElementById('enquiry-workflow-title').required = true;
  const errorEl = document.getElementById('enquiry-workflow-error'); errorEl.hidden = true;
  const context = document.getElementById('enquiry-workflow-source'); context.textContent = 'Cargando solicitud…';
  if (!enquiryWorkflowDialog.open) enquiryWorkflowDialog.showModal();
  try {
    const [sourceResult, clientsResult] = await Promise.all([
      supabaseClient.from('enquiries').select('*').eq('id',enquiryId).single(),
      supabaseClient.from('clients').select('id,name,email').order('name')
    ]);
    if (version !== enquiryWorkflowVersion) return;
    const source = sourceResult.data;
    if (sourceResult.error || !source || clientsResult.error || !Array.isArray(clientsResult.data)) throw new Error('No se pudieron cargar la solicitud y los clientes. No se ha creado nada.');
    context.textContent = [source.name,source.email,source.phone,source.service,source.preferred_date,source.budget_range,source.message,'Consentimiento: '+(source.consent_accepted ? 'aceptado' : 'no registrado'),source.consent_at].filter(Boolean).join('\n');
    if (!source.consent_accepted) throw new Error('Esta solicitud no tiene consentimiento registrado. Revísala antes de crear su ficha.');
    const select = document.getElementById('enquiry-workflow-client');
    select.innerHTML = '<option value="">Selecciona una opción</option><option value="__new__">Crear cliente con los datos de esta solicitud</option>' + clientsResult.data.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}${c.email ? ' · '+escapeHtml(c.email) : ''}</option>`).join('');
    select.disabled = false;
    enquiryWorkflowIntent = {enquiryId,source:enquirySnapshot(source),clientIds:clientsResult.data.map(c=>c.id),projectIds:[],targetsReady:false};
    document.getElementById('enquiry-workflow-title').value = source.service ? source.service+' · '+source.name : 'Solicitud de '+source.name;
    select.focus();
  } catch (error) { if (version !== enquiryWorkflowVersion) return; errorEl.textContent = error.message || 'No se pudo preparar la conexión.'; errorEl.hidden = false; }
}
document.getElementById('enquiry-workflow-client').addEventListener('change', async () => {
  if (!enquiryWorkflowIntent || enquiryWorkflowSaving) return;
  const intent = enquiryWorkflowIntent, version = ++enquiryTargetVersion;
  const clientId = document.getElementById('enquiry-workflow-client').value;
  const select = document.getElementById('enquiry-workflow-project');
  const save = document.getElementById('enquiry-workflow-save');
  const errorEl = document.getElementById('enquiry-workflow-error'); errorEl.hidden = true;
  intent.targetsReady = false; intent.projectIds = []; select.disabled = true; save.disabled = true;
  select.innerHTML = '<option value="">Nueva reserva en consulta</option>'; select.value = '';
  document.getElementById('enquiry-workflow-title-label').hidden = false; document.getElementById('enquiry-workflow-title').required = true;
  if (!clientId) return;
  if (clientId === '__new__') { intent.targetsReady = true; save.disabled = false; return; }
  if (!intent.clientIds.includes(clientId)) return;
  try {
    const {data,error} = await supabaseClient.from('projects').select('id,title,event_date').eq('client_id',clientId).neq('status','cancelled').order('event_date',{ascending:false,nullsFirst:false});
    if (version !== enquiryTargetVersion || intent !== enquiryWorkflowIntent) return;
    if (error || !Array.isArray(data)) throw new Error('No se pudieron comprobar las reservas de este cliente.');
    select.innerHTML = '<option value="">Nueva reserva en consulta</option>' + data.map(b=>`<option value="${escapeHtml(b.id)}">${escapeHtml(b.title)}${b.event_date ? ' · '+escapeHtml(b.event_date) : ''}</option>`).join('');
    intent.projectIds = data.map(b=>b.id); intent.targetsReady = true; select.disabled = false; save.disabled = false;
  } catch(error) { if (version !== enquiryTargetVersion || intent !== enquiryWorkflowIntent) return; errorEl.textContent = error.message || 'No se pudieron cargar las reservas.'; errorEl.hidden = false; }
});
document.getElementById('enquiry-workflow-project').addEventListener('change', () => {
  const existing = !!document.getElementById('enquiry-workflow-project').value;
  document.getElementById('enquiry-workflow-title-label').hidden = existing;
  document.getElementById('enquiry-workflow-title').required = !existing;
});
document.getElementById('enquiry-workflow-form').addEventListener('submit', async e => {
  e.preventDefault();
  const intent = enquiryWorkflowIntent;
  if (!intent || !intent.targetsReady || enquiryWorkflowSaving) return;
  const client = document.getElementById('enquiry-workflow-client').value;
  const project = document.getElementById('enquiry-workflow-project').value || null;
  const title = document.getElementById('enquiry-workflow-title').value.trim();
  if (!(client === '__new__' || intent.clientIds.includes(client)) || (project && !intent.projectIds.includes(project)) || (!project && !title)) return;
  const errorEl = document.getElementById('enquiry-workflow-error'); errorEl.hidden = true;
  const controls = ['save','cancel','client','project'].map(key=>document.getElementById('enquiry-workflow-'+key));
  enquiryWorkflowSaving = true; controls.forEach(el=>el.disabled=true);
  try {
    const {data,error} = await supabaseClient.rpc('studio_start_enquiry_workflow',{
      p_enquiry_id:intent.enquiryId,p_expected_source:intent.source,
      p_existing_client_id:client === '__new__' ? null : client,p_create_client:client === '__new__',
      p_existing_project_id:project,p_title:project ? null : title
    });
    if (error || !data?.client_id || !data?.project_id) throw new Error(error && ['PGRST202','42883'].includes(error.code)
      ? 'Falta instalar la migración de conexión de solicitudes. No se ha creado nada.'
      : 'No se pudo conectar la solicitud. Puede haber cambiado o tener otra conexión. Cierra y revisa sus datos antes de reintentar.');
    enquiryWorkflowSaving = false; closeEnquiryWorkflow();
    await openWorkspaceEntity('bookings',data.project_id);
  } catch(error) { errorEl.textContent = error.message || 'No se pudo guardar la conexión.'; errorEl.hidden = false; }
  finally { enquiryWorkflowSaving=false; controls.forEach(el=>el.disabled=false); }
});

// ============================================================
// Clientes (tarjetas estilo CRM: estadísticas + ficha de detalle)
// ============================================================
let allClientsCache = [];
let currentClientFilter = 'all';
let selectedClientId = null;

const clientIconNew = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M17.7 6.3l-2.5 2.5M8.8 15.2l-2.5 2.5"/></svg>';

function clientActiveBookings(c) { return (c.projects || []).filter(p => ['confirmed', 'in_progress'].includes(p.status)); }
function clientIsNew(c) { return (Date.now() - new Date(c.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000; }

const clientNotesDrafts=new Map();
async function persistClientNotes(client,hint){
 const draft=clientNotesDrafts.get(client.id);if(!draft||draft.busy)return;draft.busy=true;
 try{do{
  const value=draft.value.trim()||null;hint.textContent='Guardando…';let query=supabaseClient.from('clients').update({notes:value}).eq('id',client.id);
  query=draft.baseline==null?query.is('notes',null):query.eq('notes',draft.baseline);
  const result=await window.OGPortfolioPhotoEditor.bounded(query.select('id'));
  if(result.error)throw Error('No se pudo confirmar el guardado. Tu borrador sigue aquí; vuelve a salir del campo para reintentar.');
  if(!result.data?.length){const check=await window.OGPortfolioPhotoEditor.bounded(supabaseClient.from('clients').select('id,notes').eq('id',client.id).maybeSingle());if(check.error||!check.data||(check.data.notes??null)!==value)throw Error('Las notas cambiaron en otra sesión. Se conserva tu borrador; copia lo necesario y descártalo para cargar la versión actual.');}
  client.notes=value;draft.baseline=value;draft.error='';
  if((draft.value.trim()||null)===value){clientNotesDrafts.delete(client.id);hint.textContent='Guardado.';break;}
 }while(clientNotesDrafts.get(client.id)===draft);
 }catch(error){draft.error=error.message;hint.textContent=error.message;}finally{draft.busy=false;}
}
window.addEventListener('beforeunload',event=>{if(clientNotesDrafts.size){event.preventDefault();event.returnValue='';}});
let clientLoadVersion = 0;
async function loadClients() {
  const version = ++clientLoadVersion;
  const { data, error } = await supabaseClient
    .from('clients')
    .select('*, projects(id, title, status, event_date), quotes(id, amount, status, created_at)')
    .order('created_at', { ascending: false });
  if (version !== clientLoadVersion) return;
  if (error) { allClientsCache = []; closeClientDetail(); document.getElementById('client-list').textContent = 'No se pudieron cargar los clientes. Vuelve a abrir esta sección.';document.getElementById('client-stats').textContent='Estadísticas de clientes no disponibles.'; return; }
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
      <textarea id="client-detail-notes" placeholder="Añade notas sobre este cliente…">${escapeHtml(clientNotesDrafts.get(c.id)?.value??c.notes??'')}</textarea>
      <button type="button" class="link-btn" id="client-notes-discard">Descartar borrador y recargar notas</button>
      <p class="client-detail-save-hint" id="client-notes-hint">Se guarda automáticamente al salir del campo.</p>
    </div>

    <div class="client-detail-section">
      <b>Reservas (${bookings.length})</b>
      ${bookings.length ? bookings.map(b => `
        <div class="client-detail-row">
          <button type="button" class="ws-entity-link" data-client-booking="${escapeHtml(b.id)}">${escapeHtml(b.title)}${b.event_date ? ' · ' + new Date(b.event_date + 'T00:00:00').toLocaleDateString() : ''} ↗</button>
          <span class="status-pill ${escapeHtml(b.status)}">${escapeHtml(statusLabels[b.status] || b.status)}</span>
        </div>`).join('') : '<p class="panel-sub" style="margin:0;">Sin reservas todavía.</p>'}
    </div>

    <div class="client-detail-section">
      <b>Presupuestos (${quotes.length})</b>
      ${quotes.length ? quotes.map(q => `
        <div class="client-detail-row">
          <button type="button" class="ws-entity-link" data-client-quote="${escapeHtml(q.id)}">${q.amount != null ? Number(q.amount).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'Sin importe'} ↗</button>
          <span class="status-pill ${escapeHtml(q.status)}">${escapeHtml(statusLabels[q.status] || q.status)}</span>
        </div>`).join('') : '<p class="panel-sub" style="margin:0;">Sin presupuestos todavía.</p>'}
    </div>

    <div class="ws-context-actions"><button type="button" class="og-btn og-btn-dark" id="client-new-quote">+ Presupuesto para este cliente</button><button type="button" class="og-btn og-btn-outline" id="client-new-booking">+ Reserva para este cliente</button></div>
    <button type="button" class="og-btn og-btn-outline" id="client-detail-delete" style="color:var(--og-bad); border-color:var(--og-bad);">Eliminar cliente</button>
  `;

  detail.querySelectorAll('[data-client-booking]').forEach(b => b.addEventListener('click', () => openWorkspaceEntity('bookings', b.dataset.clientBooking)));
  detail.querySelectorAll('[data-client-quote]').forEach(b => b.addEventListener('click', () => openWorkspaceEntity('quotes', b.dataset.clientQuote)));
  document.getElementById('client-new-quote').addEventListener('click', () => draftForClient('quotes', c.id));
  document.getElementById('client-new-booking').addEventListener('click', () => draftForClient('bookings', c.id));
  document.getElementById('client-detail-close').addEventListener('click', closeClientDetail);
  const notesInput=document.getElementById('client-detail-notes'),notesHint=document.getElementById('client-notes-hint');
  if(clientNotesDrafts.has(c.id))notesHint.textContent=clientNotesDrafts.get(c.id).error||'Borrador pendiente de guardar.';
  notesInput.addEventListener('input',()=>{let draft=clientNotesDrafts.get(c.id);if(!draft){draft={baseline:c.notes??null,value:notesInput.value,busy:false,error:''};clientNotesDrafts.set(c.id,draft);}else draft.value=notesInput.value;notesHint.textContent='Cambios pendientes; se guardan al salir del campo.';});
  notesInput.addEventListener('blur',()=>persistClientNotes(c,notesHint));
  document.getElementById('client-notes-discard').addEventListener('click',async()=>{if(clientNotesDrafts.get(c.id)?.busy)return;if(clientNotesDrafts.has(c.id)&&!confirm('¿Descartar tus notas sin guardar y cargar la versión actual?'))return;clientNotesDrafts.delete(c.id);await loadClients();});
  document.getElementById('client-detail-delete').addEventListener('click', async () => {
    if (!confirm(`¿Eliminar "${c.name}"? Esta acción no se puede deshacer.`)) return;
    const result=await supabaseClient.from('clients').delete().eq('id',c.id).select('id');if(result.error||!result.data?.length){alert('No se pudo confirmar la eliminación. Recarga para comprobarlo.');return;}
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

let clientCreateIntent=null;
document.getElementById('client-form').addEventListener('submit', async (e) => {
  e.preventDefault();const form=e.currentTarget;if(form.dataset.saving==='true')return;
  const name=document.getElementById('client-name').value.trim();if(!name)return;
  const values={name,email:document.getElementById('client-email').value.trim()||null,phone:document.getElementById('client-phone').value.trim()||null,notes:document.getElementById('client-notes').value.trim()||null};
  if(clientCreateIntent&&JSON.stringify(clientCreateIntent.values)!==JSON.stringify(values))return alert('Hay un intento pendiente. Reintenta con los mismos datos para comprobar si ya se guardó antes de crear otro cliente.');
  if(!clientCreateIntent)clientCreateIntent={id:crypto.randomUUID(),values};
  form.dataset.saving='true';form.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);
  try{
   const intent=clientCreateIntent;const prior=await window.OGPortfolioPhotoEditor.bounded(supabaseClient.from('clients').select('id,name,email,phone,notes').eq('id',intent.id).maybeSingle());
   if(prior.error)throw Error('No se pudo comprobar el intento anterior. Reintenta.');
   if(prior.data){if(Object.keys(values).some(key=>(prior.data[key]??null)!==(values[key]??null)))throw Error('El cliente cambió en otra sesión. Revisa la lista antes de continuar.');}
   else{const result=await window.OGPortfolioPhotoEditor.bounded(supabaseClient.from('clients').insert({id:intent.id,...values}).select('id'));if(result.error||!result.data?.length)throw Error('No se pudo confirmar el cliente. Reintenta para verificarlo sin duplicarlo.');}
   clientCreateIntent=null;form.reset();form.hidden=true;await loadClients();
  }catch(error){alert(error.message||'No se pudo guardar el cliente.');}
  finally{form.dataset.saving='false';form.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=false);}
});

// ============================================================
// Reservas y calendario (projects table)
// ============================================================
let bookingLoadVersion = 0;
async function loadCalendar() {
  const version = ++bookingLoadVersion;
  await populateClientSelect(document.getElementById('job-client'));
  const list = document.getElementById('job-list');
  const { data, error } = await readStudio(supabaseClient.from('projects').select('*, clients(name), quotes(id), enquiry_workflows(enquiry_id), portfolio_workflows(portfolio_project_id, portfolio_projects(title))').order('event_date', { ascending: true, nullsFirst: false }));
  if (version !== bookingLoadVersion) return;
  if (error) { StudioWorkspace.showError(list, 'No se pudieron cargar las reservas. Vuelve a abrir esta sección para reintentarlo.'); return; }
  StudioWorkspace.mountBookings(list, data || [], {
    openClient: id => openWorkspaceEntity('clients', id),
    openQuote: id => openWorkspaceEntity('quotes', id),
    openEnquiry: id => openWorkspaceEntity('messages', id),
    openPortfolio: id => openWorkspaceEntity('projects', id),
    async status(job, value) {
      const { data, error } = await supabaseClient.from('projects').update({ status: value }).eq('id', job.id).eq('status',job.status).select('id');
      if (error||!data?.length) throw new Error('No se pudo guardar el estado de la reserva.');
      job.status = value;
    },
    async remove(job) {
      if (!confirm(`¿Eliminar "${job.title}"?`)) return;
      const { error } = await supabaseClient.from('projects').delete().eq('id', job.id);
      if (error) throw new Error('No se pudo eliminar la reserva.');
      await loadCalendar();
    }
  });
}

const recordCreateIntents=new WeakMap();
async function saveNewRecord(form,table,values){
 let intent=recordCreateIntents.get(form);
 if(intent&&JSON.stringify(intent.values)!==JSON.stringify(values))throw Error('Hay un guardado pendiente. Reintenta con los mismos datos para comprobarlo sin duplicar.');
 if(!intent){intent={id:crypto.randomUUID(),values};recordCreateIntents.set(form,intent);}
 const prior=await window.OGPortfolioPhotoEditor.bounded(supabaseClient.from(table).select('id,'+Object.keys(values).join(',')).eq('id',intent.id).maybeSingle());
 if(prior.error)throw Error('No se pudo comprobar el guardado anterior. Reintenta.');
 if(prior.data){if(Object.keys(values).some(key=>typeof values[key]==='number'?Number(prior.data[key])!==values[key]:String(prior.data[key]??'')!==String(values[key]??'')))throw Error('El registro cambió. Revisa la lista antes de continuar.');}
 else{const result=await window.OGPortfolioPhotoEditor.bounded(supabaseClient.from(table).insert({id:intent.id,...values}).select('id'));if(result.error||!result.data?.length)throw Error('No se pudo confirmar el guardado. Reintenta para verificarlo sin duplicar.');}
 recordCreateIntents.delete(form);
}
document.getElementById('job-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (form.dataset.saving === 'true') return;
  if (document.getElementById('job-client').disabled) return alert('Espera a que se carguen los clientes antes de guardar.');
  form.dataset.saving = 'true';
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
  const title = document.getElementById('job-title').value.trim();
  const client_id = document.getElementById('job-client').value || null;
  const event_date = document.getElementById('job-date').value || null;
  const status = document.getElementById('job-status').value;
  if (!title) return;
  await saveNewRecord(form,'projects',{title,client_id,event_date,status});
  form.reset();
  await loadCalendar();
  } catch (error) { alert(error.message||'No se pudo completar el guardado. Comprueba la lista antes de reintentarlo.'); }
  finally { delete form.dataset.saving; submit.disabled = false; }
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

let analyticsLoadVersion=0;
async function loadAnalytics() {
  const version=++analyticsLoadVersion;const notice=document.getElementById('analytics-load-status');notice.textContent='Actualizando datos…';
  const results = await Promise.all([
    supabaseClient.from('portfolio_projects').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabaseClient.from('clients').select('id, created_at'),
    supabaseClient.from('projects').select('id, status, created_at'),
    supabaseClient.from('quotes').select('*, clients(name), projects(title, status)').order('created_at', { ascending: false }),
    supabaseClient.from('enquiries').select('id, status, created_at'),
  ].map(readStudio));
  if(version!==analyticsLoadVersion)return;
  if(results.some(result=>result.error)){notice.textContent='No se pudieron actualizar los datos. Si hay cifras anteriores visibles, no están verificadas ahora. Vuelve a abrir Analíticas para reintentar.';return;}
  notice.textContent='';
  const [{count:publishedProjects},{data:clientsData},{data:bookingsData},{data:quotesData},{data:enquiriesData}]=results;

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
    cell('a', icon.projects, publishedProjects ?? 0, 'Fotografías publicadas'),
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
    ${window.OGServiceCatalog.imageUrl(q.document_url||'') ? `<a class="og-btn og-btn-outline" href="${escapeAttr(window.OGServiceCatalog.imageUrl(q.document_url))}" target="_blank" rel="noopener">Ver documento</a>` : ''}
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
let inventoryLoadVersion=0;
async function loadInventory() {
  const version=++inventoryLoadVersion;
  const { data, error } = await readStudio(supabaseClient.from('inventory_items').select('*').order('name'));
  if(version!==inventoryLoadVersion)return;const list=document.getElementById('inventory-list');
  if(error||!Array.isArray(data)){list.textContent='No se pudo cargar el inventario. Vuelve a abrir esta sección para reintentar.';return;}
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
      const result=await supabaseClient.from('inventory_items').delete().eq('id',item.id).select('id');if(result.error||!result.data?.length){alert('No se pudo confirmar la eliminación. Recarga para comprobarlo.');return;}
      loadInventory();
    });
    list.appendChild(row);
  });
}

document.getElementById('inventory-form').addEventListener('submit', async (e) => {
  e.preventDefault();const form=e.currentTarget;if(form.dataset.saving==='true')return;form.dataset.saving='true';const controls=form.querySelectorAll('input,select,button');controls.forEach(el=>el.disabled=true);try{
  const name = document.getElementById('inventory-name').value.trim();
  const category = document.getElementById('inventory-category').value.trim() || null;
  const quantityRaw=document.getElementById('inventory-quantity').value.trim(),quantity=Number(quantityRaw);
  if(!quantityRaw||!Number.isSafeInteger(quantity)||quantity<0||quantity>2147483647)throw Error('Escribe una cantidad entera entre 0 y 2147483647.');
  if (!name) return;
  await saveNewRecord(form,'inventory_items',{name,category,quantity});
  e.target.reset();
  loadInventory();  }catch(error){alert(error.message||'No se pudo confirmar el guardado.');}finally{delete form.dataset.saving;controls.forEach(el=>el.disabled=false);}
});

// ============================================================
// Presupuestos y contratos
// ============================================================
let quoteLoadVersion = 0;
async function loadQuotes() {
  const version = ++quoteLoadVersion;
  await populateClientSelect(document.getElementById('quote-client'));
  const list = document.getElementById('quote-list');
  const { data, error } = await supabaseClient.from('quotes').select('*, clients(name)').order('created_at', { ascending: false });
  if (version !== quoteLoadVersion) return;
  if (error) { StudioWorkspace.showError(list, 'No se pudieron cargar los presupuestos. Vuelve a abrir esta sección para reintentarlo.'); return; }
  StudioWorkspace.mountQuotes(list, data || [], {
    prepareBooking: prepareQuoteBooking,
    openClient: id => openWorkspaceEntity('clients', id),
    openBooking: id => openWorkspaceEntity('bookings', id),
    async status(quote, value) {
      const { data, error } = await supabaseClient.from('quotes').update({ status: value }).eq('id', quote.id).eq('status',quote.status).select('id');
      if (error||!data?.length) throw new Error('No se pudo guardar el estado del presupuesto.');
      quote.status = value;
    },
    async remove(quote) {
      if (!confirm('¿Eliminar este presupuesto?')) return;
      const { error } = await supabaseClient.from('quotes').delete().eq('id', quote.id);
      if (error) throw new Error('No se pudo eliminar el presupuesto.');
      await loadQuotes();
    }
  });
}

// The conversion is one reviewed transaction, not an insert followed by a fragile update.
const quoteBookingDialog = document.getElementById('quote-booking-dialog');
let quoteBookingIntent = null;
let quoteBookingVersion = 0;
let quoteBookingSaving = false;
function closeQuoteBooking() {
  if (quoteBookingSaving) return;
  ++quoteBookingVersion; quoteBookingIntent = null; quoteBookingDialog.close();
}
document.getElementById('quote-booking-cancel').addEventListener('click', closeQuoteBooking);
quoteBookingDialog.addEventListener('cancel', e => { e.preventDefault(); closeQuoteBooking(); });
function updateQuoteBookingMode() {
  const existing = !!document.getElementById('quote-booking-target').value;
  document.getElementById('quote-booking-fields').hidden = existing;
  document.getElementById('quote-booking-title').required = !existing;
  document.getElementById('quote-booking-save').textContent = existing ? 'Vincular reserva existente' : 'Crear y vincular consulta';
}
document.getElementById('quote-booking-target').addEventListener('change', updateQuoteBookingMode);
async function prepareQuoteBooking(quoteId) {
  if (quoteBookingSaving) return;
  const version = ++quoteBookingVersion;
  quoteBookingIntent = null;
  const form = document.getElementById('quote-booking-form'); form.reset();
  const submit = document.getElementById('quote-booking-save'); submit.disabled = true;
  const errorEl = document.getElementById('quote-booking-error'); errorEl.hidden = true;
  document.getElementById('quote-booking-context').textContent = 'Cargando presupuesto y reservas…';
  document.getElementById('quote-booking-target').innerHTML = '<option value="">Nueva reserva</option>';
  updateQuoteBookingMode();
  if (!quoteBookingDialog.open) quoteBookingDialog.showModal();
  try {
    const { data: quote, error } = await supabaseClient.from('quotes').select('id,client_id,project_id,status,clients(name)').eq('id', quoteId).single();
    if (version !== quoteBookingVersion) return;
    if (error || !quote) throw new Error('No se pudo cargar el presupuesto. Cierra y vuelve a intentarlo.');
    if (quote.project_id) { closeQuoteBooking(); return openWorkspaceEntity('bookings', quote.project_id); }
    if (quote.status !== 'accepted' || !quote.client_id) throw new Error('Solo puedes vincular un presupuesto aceptado con cliente asignado.');
    const { data: bookings, error: bookingError } = await supabaseClient.from('projects').select('id,title,event_date,status').eq('client_id', quote.client_id).neq('status', 'cancelled').order('event_date', {ascending:false, nullsFirst:false});
    if (version !== quoteBookingVersion) return;
    if (bookingError || !Array.isArray(bookings)) throw new Error('No se pudieron comprobar las reservas existentes. No se ha creado nada.');
    document.getElementById('quote-booking-context').textContent = 'Cliente: ' + (quote.clients?.name || 'Cliente asignado') + ' · Presupuesto ' + String(quote.id).slice(0,8).toUpperCase();
    document.getElementById('quote-booking-target').innerHTML = '<option value="">Nueva reserva</option>' + bookings.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.title)}${b.event_date ? ' · ' + escapeHtml(b.event_date) : ' · Sin fecha'}</option>`).join('');
    quoteBookingIntent = { quoteId: quote.id, clientId: quote.client_id, bookingIds: bookings.map(b => b.id) };
    submit.disabled = false;
    document.getElementById('quote-booking-title').focus();
  } catch (error) {
    if (version !== quoteBookingVersion) return;
    errorEl.textContent = error.message || 'No se pudo preparar la reserva.'; errorEl.hidden = false;
  }
}
document.getElementById('quote-booking-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (quoteBookingSaving || !quoteBookingIntent) return;
  const intent = quoteBookingIntent;
  const target = document.getElementById('quote-booking-target').value || null;
  if (target && !intent.bookingIds.includes(target)) return;
  const title = document.getElementById('quote-booking-title').value.trim();
  const eventDate = document.getElementById('quote-booking-date').value || null;
  if (!target && (!title || (eventDate && !StudioWorkspace.localDate(eventDate)))) return;
  const submit = document.getElementById('quote-booking-save');
  const cancel = document.getElementById('quote-booking-cancel');
  const errorEl = document.getElementById('quote-booking-error');
  quoteBookingSaving = true; submit.disabled = true; cancel.disabled = true; errorEl.hidden = true;
  try {
    const {data, error} = await supabaseClient.rpc('studio_link_quote_booking', {
      p_quote_id: intent.quoteId, p_expected_client_id: intent.clientId, p_existing_project_id: target,
      p_title: target ? null : title, p_event_date: target ? null : eventDate,
      p_service: target ? null : document.getElementById('quote-booking-service').value.trim() || null,
      p_notes: target ? null : document.getElementById('quote-booking-notes').value.trim() || null
    });
    if (error || !data) throw new Error(error && ['PGRST202','42883'].includes(error.code)
      ? 'La conexión de reservas aún no está disponible. Falta instalar su migración; no se ha creado nada.'
      : 'No se pudo completar la conexión. Revisa el presupuesto antes de reintentar; un reintento no creará otra reserva para el mismo presupuesto.');
    quoteBookingSaving = false; closeQuoteBooking();
    await openWorkspaceEntity('bookings', data);
  } catch (error) { errorEl.textContent = error.message || 'No se pudo conectar la reserva.'; errorEl.hidden = false; }
  finally { quoteBookingSaving = false; submit.disabled = false; cancel.disabled = false; }
});

document.getElementById('quote-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (form.dataset.saving === 'true') return;
  if (document.getElementById('quote-client').disabled) return alert('Espera a que se carguen los clientes antes de guardar.');
  form.dataset.saving = 'true';
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
  const client_id = document.getElementById('quote-client').value || null;
  const amountRaw = document.getElementById('quote-amount').value.trim();
  const amount = StudioWorkspace.parseAmount(amountRaw);
  if (Number.isNaN(amount)) return alert('Escribe un importe válido, por ejemplo 150,50, sin separador de miles.');
  const status = document.getElementById('quote-status').value;
  await saveNewRecord(form,'quotes',{client_id,amount,status});
  form.reset();
  await loadQuotes();
  } catch (error) { alert(error.message||'No se pudo completar el guardado. Comprueba la lista antes de reintentarlo.'); }
  finally { delete form.dataset.saving; submit.disabled = false; }
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
  if (error && !['42703', 'PGRST204'].includes(error.code)) {
    const notice = document.createElement('p');
    notice.className = 'panel-sub';
    notice.textContent = 'No se pudo comprobar la base de datos. Revisa tu conexión o vuelve a iniciar sesión.';
    slot.appendChild(notice);
    return;
  }
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

const portfolioPhotoEditor=window.OGPortfolioPhotoEditor.mount({client:supabaseClient,safeUrl:url=>window.OGServiceCatalog.imageUrl(url),onSaved:async()=>{await loadProjectsData();renderProjects();await loadPortfolioGroupsEditor(true);}});
async function openPortfolioPhotoById(photoId){
 if(!portfolioGroupEditorState)await loadPortfolioGroupsEditor();
 const state=portfolioGroupEditorState;if(!state)return;
 const group=state.groups.find(g=>g.photo_ids.includes(photoId));
 const photo=state.photos.find(p=>p.id===photoId);
 if(group)return openPortfolioPhotoGroup(group);
 if(photo)return openPortfolioPhotoGroup({id:null,photoId:photo.id,name:photo.title+' · Foto sin álbum'});
 alert('La foto ya no está disponible. Recarga la biblioteca.');
}
function openPortfolioPhotoGroup(group){
 if(portfolioGroupEditorBusy||portfolioGroupEditorState?.dirty){alert('Guarda o recarga los cambios de grupos antes de editar sus fotos.');return;}
 return portfolioPhotoEditor.open(group);
}
function renderPortfolioPhotoGroups(target=document.getElementById('portfolio-photo-groups')){
 target.replaceChildren();
 for(const group of portfolioGroupEditorState?.groups||[]){
  const button=document.createElement('button');button.type='button';button.className='album-card photo-group-launcher';button.dataset.photoGroup=group.id;
  const photos=group.photo_ids.map(id=>portfolioGroupEditorState.photos.find(p=>p.id===id)).filter(Boolean);
  const cover=photos.find(p=>p.is_published)||photos[0];const url=window.OGServiceCatalog.imageUrl(cover?.cover_image_url||'');
  if(url){const img=document.createElement('img');img.src=url.startsWith('assets/')?'/'+url:url;img.alt='';img.loading='lazy';button.append(img);}
  const title=document.createElement('strong');title.textContent=group.name;const detail=document.createElement('span');detail.textContent=photos.length+' fotos · '+photos.filter(p=>p.is_published).length+' publicadas · '+photos.filter(p=>!p.is_published).length+' sin publicar · abrir y editar';button.append(title,detail);button.addEventListener('click',()=>openPortfolioPhotoGroup(group));target.append(button);
 }
 const assigned=new Set((portfolioGroupEditorState?.groups||[]).flatMap(g=>g.photo_ids));
 for(const photo of portfolioGroupEditorState?.photos||[]){if(assigned.has(photo.id))continue;
  const button=document.createElement('button');button.type='button';button.className='album-card photo-group-launcher';
  const url=window.OGServiceCatalog.imageUrl(photo.cover_image_url||'');if(url){const img=document.createElement('img');img.src=url.startsWith('assets/')?'/'+url:url;img.alt='';img.loading='lazy';button.append(img);}
  const title=document.createElement('strong');title.textContent=photo.title;const detail=document.createElement('span');detail.textContent='Foto sin álbum · abrir ficha';button.append(title,detail);button.addEventListener('click',()=>openPortfolioPhotoById(photo.id));target.append(button);
 }
}

// Deterministic public gallery group editor. Draft only until explicit Save.
let portfolioGroupEditorState=null,portfolioGroupEditorVersion=0,portfolioGroupEditorBusy=false;
const pgFields=document.getElementById('portfolio-group-fields'),pgStatus=document.getElementById('portfolio-group-status');
function pgControls(disabled){['add','reload','save'].forEach(key=>document.getElementById('portfolio-group-'+key).disabled=disabled);pgFields.querySelectorAll('button,input,select').forEach(el=>el.disabled=disabled);}
function pgChanged(){if(portfolioGroupEditorState){portfolioGroupEditorState.dirty=true;pgStatus.textContent='Cambios sin guardar.';}}
function pgButton(text,action){const button=document.createElement('button');button.type='button';button.className='og-btn og-btn-outline';button.textContent=text;button.addEventListener('click',action);return button;}
function renderPortfolioGroupsEditor(){
 const state=portfolioGroupEditorState;if(!state)return;pgFields.replaceChildren();
 const assigned=new Set(state.groups.flatMap(g=>g.photo_ids));
 state.groups.forEach((group,index)=>{
  const card=document.createElement('section');card.className='pg-editor-card';card.dataset.groupId=group.id;
  const head=document.createElement('div');head.className='pg-editor-head';
  for(const [field,label] of [['name','Nombre ES'],['name_en','Nombre EN']]){const wrapper=document.createElement('label');wrapper.textContent=label;const input=document.createElement('input');input.value=group[field];input.maxLength=120;input.addEventListener('input',()=>{group[field]=input.value;pgChanged();});wrapper.append(input);head.append(wrapper);}
  function reorder(delta){const other=index+delta;if(other<0||other>=state.groups.length)return;[state.groups[index],state.groups[other]]=[state.groups[other],state.groups[index]];pgChanged();renderPortfolioGroupsEditor();pgFields.querySelector(`[data-group-id="${group.id}"] input`)?.focus();}
  head.append(pgButton('Subir grupo',()=>reorder(-1)),pgButton('Bajar grupo',()=>reorder(1)),pgButton('Deshacer grupo',()=>{state.groups.splice(index,1);pgChanged();renderPortfolioGroupsEditor();document.getElementById('portfolio-group-add').focus();}));card.append(head);
  const list=document.createElement('ol');list.className='pg-editor-photos';
  group.photo_ids.forEach((id,position)=>{const photo=state.photos.find(p=>p.id===id);if(!photo)return;const row=document.createElement('li');row.dataset.photoId=id;const img=document.createElement('img');const safe=window.OGServiceCatalog.imageUrl(photo.cover_image_url||'');if(safe)img.src=safe.startsWith('assets/')?'/'+safe:safe;img.alt='';img.loading='lazy';const title=document.createElement('span');title.textContent=(position===0?'Portada · ':'')+photo.title+(photo.is_published?'':' · No publicada');row.append(img,title);
   const move=delta=>{const other=position+delta;if(other<0||other>=group.photo_ids.length)return;[group.photo_ids[position],group.photo_ids[other]]=[group.photo_ids[other],group.photo_ids[position]];pgChanged();renderPortfolioGroupsEditor();pgFields.querySelector('[data-photo-id="'+id+'"] button')?.focus();};
   const up=pgButton('↑',()=>move(-1)),down=pgButton('↓',()=>move(1));up.setAttribute('aria-label','Subir foto '+photo.title);down.setAttribute('aria-label','Bajar foto '+photo.title);
   row.append(up,down,pgButton('Quitar del grupo',()=>{group.photo_ids.splice(position,1);pgChanged();renderPortfolioGroupsEditor();pgFields.querySelector('[data-group-id="'+group.id+'"] select')?.focus();}),pgButton('Ver ficha ↗',()=>openWorkspaceEntity('projects',photo.id)));list.append(row);
  });card.append(list);
  const label=document.createElement('label');label.textContent='Añadir foto sin grupo';const select=document.createElement('select');select.add(new Option('Elige una foto…',''));state.photos.filter(p=>!assigned.has(p.id)).forEach(p=>select.add(new Option(p.title+(p.is_published?'':' · No publicada'),p.id)));select.addEventListener('change',()=>{if(!select.value)return;group.photo_ids.push(select.value);pgChanged();renderPortfolioGroupsEditor();pgFields.querySelector('[data-group-id="'+group.id+'"] select')?.focus();});label.append(select);card.append(label);pgFields.append(card);
 });
 const unassigned=document.createElement('p');unassigned.className='panel-sub';const remaining=state.photos.filter(p=>!assigned.has(p.id));unassigned.textContent=remaining.length+' fotos sin grupo. Las publicadas aparecen individualmente hasta que las agrupes.';pgFields.append(unassigned);pgControls(portfolioGroupEditorBusy);
}
async function loadPortfolioGroupsEditor(force=false){
 if(portfolioGroupEditorBusy||(!force&&portfolioGroupEditorState?.dirty))return;
 const version=++portfolioGroupEditorVersion;pgControls(true);pgStatus.textContent='Cargando grupos…';
 try{const {data,error}=await readStudio(supabaseClient.rpc('studio_portfolio_groups_snapshot'));
  if(version!==portfolioGroupEditorVersion)return;if(error||!Array.isArray(data?.groups)||!Array.isArray(data?.photos))throw Error('No se pudieron cargar los grupos. No se han sustituido por datos vacíos.');
  portfolioGroupEditorState={groups:window.OGPortfolioGroups.editable(data.groups,data.photos),photos:data.photos,expected:data,dirty:false};renderPortfolioGroupsEditor();if(typeof renderPortfolioPhotoGroups==='function')renderPortfolioPhotoGroups();pgStatus.textContent='La primera foto publicada de cada grupo se usa como portada pública.';
 }catch(error){if(version!==portfolioGroupEditorVersion)return;pgStatus.textContent=error.message;document.getElementById('portfolio-group-reload').disabled=false;return;}finally{if(version===portfolioGroupEditorVersion&&portfolioGroupEditorState)pgControls(false);}
}
document.getElementById('portfolio-group-add').addEventListener('click',()=>{const state=portfolioGroupEditorState;if(!state||portfolioGroupEditorBusy)return;state.groups.push({id:crypto.randomUUID(),name:'',name_en:'',photo_ids:[]});pgChanged();renderPortfolioGroupsEditor();pgFields.lastElementChild?.previousElementSibling?.querySelector('input')?.focus();});
document.getElementById('portfolio-group-reload').addEventListener('click',()=>{if(portfolioGroupEditorState?.dirty&&!confirm('¿Descartar los cambios de grupos sin guardar y recargar?'))return;loadPortfolioGroupsEditor(true);});
document.getElementById('portfolio-group-save').addEventListener('click',async()=>{
 const state=portfolioGroupEditorState;if(!state||portfolioGroupEditorBusy)return;
 let groups;try{groups=window.OGPortfolioGroups.validate(state.groups,state.photos);}catch(error){pgStatus.textContent=error.message;return;}
 portfolioGroupEditorBusy=true;pgControls(true);pgStatus.textContent='Guardando grupos…';
 try{const {data,error}=await supabaseClient.rpc('studio_save_portfolio_groups',{p_expected:state.expected,p_groups:groups});if(error||!data?.groups||!data?.photos)throw Error('No se pudo confirmar el guardado. Pueden haber cambiado fotos o grupos en otra sesión; tus cambios siguen aquí. Recarga y revisa antes de volver a guardar.');state.expected=data;state.groups=groups;state.dirty=false;if(typeof renderPortfolioPhotoGroups==='function')renderPortfolioPhotoGroups();pgStatus.textContent='Grupos guardados. La web usa este mismo orden y estas fotos; no se ha cambiado su publicación.';}
 catch(error){pgStatus.textContent=error.message;}finally{portfolioGroupEditorBusy=false;pgControls(false);}
});
