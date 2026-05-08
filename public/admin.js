// ===== 44Day Admin — Items / Categories / Config / Stats =====
const TOKEN_KEY = '44day-admin-token';
let categories = [];
let allItems = [];
let editId = null;
let editCatId = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function token() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }

async function api(url, opts = {}) {
  opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token()) opts.headers['x-admin-token'] = token();
  const r = await fetch(url, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `http_${r.status}`);
  return data;
}

function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toast-stack').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 2200);
}

// ===== AUTH =====
async function checkAuth() {
  if (!token()) return showLogin();
  try {
    const { authed } = await api('/api/admin/check');
    if (authed) showDashboard();
    else showLogin();
  } catch { showLogin(); }
}
function showLogin() {
  $('#login').style.display = '';
  $('#dashboard').style.display = 'none';
  setTimeout(() => $('#login-pass').focus(), 100);
}
function showDashboard() {
  $('#login').style.display = 'none';
  $('#dashboard').style.display = '';
  loadAll();
}
$('#login-btn').addEventListener('click', tryLogin);
$('#login-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
async function tryLogin() {
  const pass = $('#login-pass').value;
  $('#login-error').textContent = '';
  if (!pass) return;
  try {
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pass }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'login_failed');
    setToken(data.token);
    $('#login-pass').value = '';
    showDashboard();
    toast('Добро пожаловать');
  } catch (e) {
    $('#login-error').textContent = e.message === 'wrong_password' ? '❌ Неверный пароль' : `❌ ${e.message}`;
  }
}
$('#logout-btn').addEventListener('click', async () => {
  try { await api('/api/admin/logout', { method: 'POST' }); } catch {}
  setToken(null);
  showLogin();
  toast('Сессия завершена');
});

// ===== TABS =====
$$('.ad-tab').forEach((t) => t.addEventListener('click', () => {
  const tab = t.dataset.tab;
  $$('.ad-tab').forEach((x) => x.classList.toggle('active', x === t));
  $$('.ad-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === tab));
  if (tab === 'stats') loadStats();
  if (tab === 'config') loadConfigForm();
}));

// ===== DATA =====
async function loadAll() {
  try {
    const [{ categories: cats }, { items }] = await Promise.all([
      fetch('/api/site').then((r) => r.json()),
      fetch('/api/items').then((r) => r.json()),
    ]);
    categories = cats;
    allItems = items;
    populateCategorySelectors();
    renderItemsTable();
    renderCategoriesTable();
  } catch (e) { toast('Ошибка загрузки: ' + e.message, 'err'); }
}

function populateCategorySelectors() {
  const f = $('#f-category');
  const fb = $('#filter-by-cat');
  f.innerHTML = categories.map((c) => `<option value="${esc(c.id)}">${c.icon} ${esc(c.name)}</option>`).join('');
  fb.innerHTML = `<option value="">все категории</option>` + categories.map((c) => `<option value="${esc(c.id)}">${c.icon} ${esc(c.name)}</option>`).join('');
}

// ===== ITEMS TABLE =====
function renderItemsTable() {
  const q = $('#filter-cat').value.trim().toLowerCase();
  const cat = $('#filter-by-cat').value;
  let list = allItems;
  if (cat) list = list.filter((x) => x.category === cat);
  if (q) list = list.filter((x) => (x.name || '').toLowerCase().includes(q));
  const body = $('#items-body');
  if (!list.length) { body.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:30px">— пусто —</td></tr>`; return; }
  body.innerHTML = list.map((it, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(it.icon || '·')} <strong>${esc(it.name)}</strong></td>
      <td>${esc(it.category)}</td>
      <td>${it.type === 'article' ? '📄 статья' : '📦 софт'}</td>
      <td>${esc(it.version || '—')}</td>
      <td>${it.downloads || 0}</td>
      <td>${it.rating || '—'}</td>
      <td class="row-act">
        <button data-edit="${esc(it.id)}">edit</button>
        <button class="del" data-del="${esc(it.id)}">del</button>
      </td>
    </tr>`).join('');
  body.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openForm(b.dataset.edit)));
  body.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => deleteItem(b.dataset.del)));
}
$('#filter-cat').addEventListener('input', renderItemsTable);
$('#filter-by-cat').addEventListener('change', renderItemsTable);

// ===== ITEM FORM =====
function applyTypeVisibility() {
  const isArticle = $('#f-type').value === 'article';
  $$('.row-article').forEach((el) => (el.style.display = isArticle ? '' : 'none'));
  $$('.row-software').forEach((el) => (el.style.display = isArticle ? 'none' : ''));
}
$('#f-type').addEventListener('change', applyTypeVisibility);
$('#add-btn').addEventListener('click', () => openForm(null));
$('#cancel-btn').addEventListener('click', closeForm);
$('#save-btn').addEventListener('click', saveItem);

function openForm(id) {
  editId = id;
  $('#form-wrap').style.display = '';
  $('#form-title').textContent = id ? '✎ Редактировать запись' : '+ Новая запись';
  if (id) {
    const it = allItems.find((x) => x.id === id);
    if (!it) return;
    $('#f-type').value = it.type === 'article' ? 'article' : 'software';
    $('#f-name').value = it.name || '';
    $('#f-name-az').value = it.name_az || '';
    $('#f-category').value = it.category || '';
    $('#f-subcategory').value = it.subcategory || '';
    if ($('#f-operator')) $('#f-operator').value = Array.isArray(it.operator) ? it.operator.join(',') : (it.operator || '');
    $('#f-version').value = it.version || '';
    $('#f-size').value = it.size || '';
    $('#f-icon').value = it.icon || '';
    $('#f-rating').value = it.rating || '';
    $('#f-url').value = it.downloadUrl || '';
    $('#f-mod').value = it.modUrl || '';
    $('#f-status').value = it.status || '';
    $('#f-format').value = it.format || '';
    $('#f-provider').value = it.provider || '';
    $('#f-reading').value = it.readingTime || '';
    $('#f-tags').value = (it.tags || []).join(', ');
    $('#f-desc').value = it.description || '';
    $('#f-desc-az').value = it.description_az || '';
    $('#f-content').value = '';
    $('#f-content-az').value = '';
    if (it.type === 'article') {
      fetch('/api/items/' + encodeURIComponent(id)).then((r) => r.json()).then((d) => {
        if (d.item) { $('#f-content').value = d.item.content || ''; $('#f-content-az').value = d.item.content_az || ''; }
      }).catch(() => {});
    }
  } else {
    ['#f-name','#f-name-az','#f-subcategory','#f-version','#f-size','#f-icon','#f-rating','#f-url','#f-mod','#f-status','#f-format','#f-provider','#f-reading','#f-tags','#f-desc','#f-desc-az','#f-content','#f-content-az'].forEach((s) => ($(s).value = ''));
    if (categories[0]) $('#f-category').value = categories[0].id;
    $('#f-icon').value = '📦';
    $('#f-type').value = 'software';
  }
  applyTypeVisibility();
  $('#form-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function closeForm() { $('#form-wrap').style.display = 'none'; editId = null; }

async function saveItem() {
  const isArticle = $('#f-type').value === 'article';
  const payload = {
    type: isArticle ? 'article' : 'software',
    name: $('#f-name').value.trim(),
    name_az: $('#f-name-az').value.trim(),
    category: $('#f-category').value,
    icon: $('#f-icon').value.trim() || '📦',
    rating: parseFloat($('#f-rating').value) || 0,
    tags: $('#f-tags').value,
    description: $('#f-desc').value.trim(),
    description_az: $('#f-desc-az').value.trim(),
  };
  if (isArticle) {
    payload.readingTime = $('#f-reading').value.trim();
    payload.content = $('#f-content').value;
    payload.content_az = $('#f-content-az').value;
  } else {
    payload.version = $('#f-version').value.trim();
    payload.size = $('#f-size').value.trim();
    payload.downloadUrl = $('#f-url').value.trim();
    payload.modUrl = $('#f-mod').value.trim();
    payload.status = $('#f-status').value.trim();
    payload.format = $('#f-format').value.trim();
    payload.provider = $('#f-provider').value.trim();
  }
  payload.subcategory = $('#f-subcategory').value.trim();
  if ($('#f-operator')) {
    const op = $('#f-operator').value.trim();
    if (op) payload.operator = op.toLowerCase().split(/[,\s]+/).filter(Boolean);
    else payload.operator = [];
  }
  if (!payload.name) return toast('Укажи название', 'err');
  if (!payload.category) return toast('Выбери категорию', 'err');
  try {
    if (editId) {
      await api('/api/items/' + encodeURIComponent(editId), { method: 'PUT', body: JSON.stringify(payload) });
      toast('Сохранено ✓');
    } else {
      await api('/api/items', { method: 'POST', body: JSON.stringify(payload) });
      toast('Добавлено ✓');
    }
    closeForm();
    await loadAll();
  } catch (e) { toast('Ошибка: ' + e.message, 'err'); }
}

async function deleteItem(id) {
  if (!confirm('Удалить запись?')) return;
  try {
    await api('/api/items/' + encodeURIComponent(id), { method: 'DELETE' });
    toast('Удалено');
    await loadAll();
  } catch (e) { toast('Ошибка: ' + e.message, 'err'); }
}

// ===== CATEGORIES TAB =====
function renderCategoriesTable() {
  const counts = {};
  allItems.forEach((it) => { counts[it.category] = (counts[it.category] || 0) + 1; });
  const body = $('#cats-body');
  body.innerHTML = categories.map((c) => `
    <tr>
      <td style="font-size:20px">${esc(c.icon || '📂')}</td>
      <td><code>${esc(c.id)}</code></td>
      <td><strong>${esc(c.name)}</strong>${c.name_az ? ` <span style="color:var(--muted)">/ ${esc(c.name_az)}</span>` : ''}</td>
      <td><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${esc(c.color || '#5cd4ff')};vertical-align:middle"></span> ${esc(c.color || '')}</td>
      <td>${counts[c.id] || 0}</td>
      <td class="row-act">
        <button data-edit-cat="${esc(c.id)}">edit</button>
        <button class="del" data-del-cat="${esc(c.id)}">del</button>
      </td>
    </tr>`).join('');
  body.querySelectorAll('[data-edit-cat]').forEach((b) => b.addEventListener('click', () => openCatForm(b.dataset.editCat)));
  body.querySelectorAll('[data-del-cat]').forEach((b) => b.addEventListener('click', () => deleteCategory(b.dataset.delCat)));
}

$('#add-cat-btn').addEventListener('click', () => openCatForm(null));
$('#cat-cancel-btn').addEventListener('click', () => { $('#cat-form-wrap').style.display = 'none'; editCatId = null; });
$('#cat-save-btn').addEventListener('click', saveCategory);

function openCatForm(id) {
  editCatId = id;
  $('#cat-form-wrap').style.display = '';
  $('#cat-form-title').textContent = id ? '✎ Редактировать категорию' : '+ Новая категория';
  if (id) {
    const c = categories.find((x) => x.id === id);
    if (!c) return;
    $('#cf-id').value = c.id; $('#cf-id').disabled = true;
    $('#cf-icon').value = c.icon || '';
    $('#cf-color').value = c.color || '#5cd4ff';
    $('#cf-external').value = c.external || '';
    $('#cf-name').value = c.name || '';
    $('#cf-name-az').value = c.name_az || '';
    $('#cf-desc').value = c.description || '';
    $('#cf-desc-az').value = c.description_az || '';
  } else {
    $('#cf-id').disabled = false;
    ['#cf-id','#cf-icon','#cf-name','#cf-name-az','#cf-desc','#cf-desc-az','#cf-external'].forEach((s) => ($(s).value = ''));
    $('#cf-color').value = '#5cd4ff';
  }
  $('#cat-form-wrap').scrollIntoView({ behavior: 'smooth' });
}

async function saveCategory() {
  const payload = {
    id: $('#cf-id').value.trim(),
    icon: $('#cf-icon').value.trim() || '📦',
    color: $('#cf-color').value,
    external: $('#cf-external').value.trim() || null,
    name: $('#cf-name').value.trim(),
    name_az: $('#cf-name-az').value.trim(),
    description: $('#cf-desc').value.trim(),
    description_az: $('#cf-desc-az').value.trim(),
  };
  if (!payload.name) return toast('Укажи название', 'err');
  if (!editCatId && !payload.id) return toast('Укажи ID', 'err');
  try {
    if (editCatId) {
      await api('/api/admin/categories/' + encodeURIComponent(editCatId), { method: 'PUT', body: JSON.stringify(payload) });
      toast('Сохранено ✓');
    } else {
      await api('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
      toast('Добавлено ✓');
    }
    $('#cat-form-wrap').style.display = 'none';
    editCatId = null;
    await loadAll();
  } catch (e) { toast('Ошибка: ' + e.message, 'err'); }
}

async function deleteCategory(id) {
  if (!confirm('Удалить категорию? Записи останутся, но будут "осиротевшими".')) return;
  try {
    await api('/api/admin/categories/' + encodeURIComponent(id), { method: 'DELETE' });
    toast('Удалено');
    await loadAll();
  } catch (e) { toast('Ошибка: ' + e.message, 'err'); }
}

// ===== CONFIG TAB =====
async function loadConfigForm() {
  try {
    const { config } = await api('/api/admin/config');
    $('#cfg-siteName').value = config.siteName || '';
    $('#cfg-accent').value = config.accent || '#5cd4ff';
    $('#cfg-theme').value = config.defaultTheme || 'dark';
    $('#cfg-lang').value = config.defaultLang || 'ru';
    $('#cfg-password').value = '';
  } catch (e) { toast('Ошибка: ' + e.message, 'err'); }
}
$('#cfg-save-btn').addEventListener('click', async () => {
  const payload = {
    siteName: $('#cfg-siteName').value.trim(),
    accent: $('#cfg-accent').value,
    defaultTheme: $('#cfg-theme').value,
    defaultLang: $('#cfg-lang').value,
  };
  const pw = $('#cfg-password').value;
  if (pw) payload.adminPassword = pw;
  try {
    await api('/api/admin/config', { method: 'PUT', body: JSON.stringify(payload) });
    toast('Конфиг сохранён ✓');
    $('#cfg-password').value = '';
  } catch (e) { toast('Ошибка: ' + e.message, 'err'); }
});

// ===== STATS TAB =====
async function loadStats() {
  try {
    const { counts, topDownloads, timeline } = await api('/api/admin/stats');
    $('#stat-items').textContent = counts.items;
    $('#stat-soft').textContent = counts.software;
    $('#stat-art').textContent = counts.articles;
    $('#stat-dl').textContent = counts.totalDownloads;
    const max = Math.max(1, ...timeline.map((x) => x.count));
    $('#stat-timeline').innerHTML = timeline.map((d) => {
      const pct = (d.count / max) * 100;
      return `<div class="tl-bar" style="height:${pct}%" title="${d.day}: ${d.count}"></div>`;
    }).join('');
    $('#stat-top').innerHTML = topDownloads.map((x, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(x.name)}</strong></td>
        <td>${x.type === 'article' ? '📄' : '📦'}</td>
        <td>${x.downloads}</td>
      </tr>`).join('');
  } catch (e) { toast('Ошибка: ' + e.message, 'err'); }
}

// init
checkAuth();
