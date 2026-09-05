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
  });
});

// ---------- Overview ----------
async function loadOverview() {
  const [{ count: projectCount }, { count: enquiryCount }, { count: socialCount }] = await Promise.all([
    supabaseClient.from('portfolio_projects').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabaseClient.from('enquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabaseClient.from('social_posts').select('*', { count: 'exact', head: true }).eq('is_selected', true),
  ]);
  document.getElementById('stat-projects').textContent = projectCount ?? '0';
  document.getElementById('stat-enquiries').textContent = enquiryCount ?? '0';
  document.getElementById('stat-social').textContent = socialCount ?? '0';
}

// ---------- Portfolio ----------
async function loadPortfolio() {
  const { data: categories, error: catErr } = await supabaseClient
    .from('portfolio_categories').select('*').order('sort_order');
  if (catErr) return console.error(catErr);

  const catList = document.getElementById('category-list');
  catList.innerHTML = '';
  categories.forEach(cat => {
    const row = document.createElement('label');
    row.className = 'category-row';
    row.innerHTML = `
      <span>${cat.name} <small>${cat.slug}</small></span>
      <input type="checkbox" data-id="${cat.id}" ${cat.is_active ? 'checked' : ''}>
    `;
    row.querySelector('input').addEventListener('change', async (e) => {
      await supabaseClient.from('portfolio_categories').update({ is_active: e.target.checked }).eq('id', cat.id);
    });
    catList.appendChild(row);
  });

  const select = document.getElementById('project-category');
  select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const { data: projects, error: projErr } = await supabaseClient
    .from('portfolio_projects').select('*, portfolio_categories(name)').order('sort_order');
  if (projErr) return console.error(projErr);

  const projList = document.getElementById('project-list');
  projList.innerHTML = '';
  projects.forEach(p => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span>${p.title} <small>${p.portfolio_categories?.name ?? 'Uncategorised'}</small></span>
      <label class="checkbox-label"><input type="checkbox" ${p.is_published ? 'checked' : ''}> Published</label>
      <button class="link-btn" data-action="delete">Delete</button>
    `;
    row.querySelector('input').addEventListener('change', async (e) => {
      await supabaseClient.from('portfolio_projects').update({ is_published: e.target.checked }).eq('id', p.id);
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`Delete "${p.title}"?`)) return;
      await supabaseClient.from('portfolio_projects').delete().eq('id', p.id);
      loadPortfolio();
    });
    projList.appendChild(row);
  });
}

document.getElementById('project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('project-title').value.trim();
  const category_id = document.getElementById('project-category').value;
  const is_published = document.getElementById('project-published').checked;
  if (!title) return;
  const { error } = await supabaseClient.from('portfolio_projects').insert({ title, category_id, is_published });
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

checkSession();
