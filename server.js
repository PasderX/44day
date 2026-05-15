const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const dns = require('dns').promises;
const https = require('https');
const http = require('http');
const tls = require('tls');
const net = require('net');
const crypto = require('crypto');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));

// ===== explicit hub routes (BEFORE static so we control them) =====
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/sni', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'sni.html')));
app.get('/section/:cat', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'section.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/article/:id', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'article.html')));
app.get('/tools', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'tools.html')));
app.get('/favorites', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'favorites.html')));
app.get('/whoami', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'whoami.html')));
app.get('/shop', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'shop.html')));
app.get('/shop/order/:id', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'shop-order.html')));
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/profile', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));

app.use(express.static(path.join(__dirname, 'public')));

// ===== Hub: items + articles storage + auth =====
function loadRaw(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return { items: [] }; }
}
function saveRaw(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
// Returns merged read view (items + articles)
function loadItems() {
  const a = loadRaw(ITEMS_FILE).items || [];
  const b = loadRaw(ARTICLES_FILE).items || [];
  return { items: [...a, ...b] };
}
// Strip heavy fields from list views
function stripContent(it) {
  const { content, content_az, ...rest } = it;
  return rest;
}
// Decide which file an item belongs to (by type)
function fileFor(item) {
  return item && item.type === 'article' ? ARTICLES_FILE : ITEMS_FILE;
}
function findItemFile(id) {
  for (const f of [ITEMS_FILE, ARTICLES_FILE]) {
    const data = loadRaw(f);
    if ((data.items || []).some((x) => x.id === id)) return f;
  }
  return null;
}
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return { adminPassword: '44day-admin-2026', categories: [] }; }
}

// in-memory admin sessions: token -> expiresAt
const adminSessions = new Map();
function newToken() { return crypto.randomBytes(24).toString('hex'); }
function isAuthed(req) {
  const tok = req.headers['x-admin-token'] || req.query.token;
  if (!tok) return false;
  const exp = adminSessions.get(tok);
  if (!exp || exp < Date.now()) { adminSessions.delete(tok); return false; }
  return true;
}
function requireAuth(req, res, next) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// public site config
app.get('/api/site', (_req, res) => {
  const cfg = loadConfig();
  res.json({
    siteName: cfg.siteName,
    accent: cfg.accent || null,
    defaultTheme: cfg.defaultTheme || 'dark',
    defaultLang: cfg.defaultLang || 'ru',
    categories: cfg.categories || [],
  });
});

// list / filter items (without heavy content fields)
app.get('/api/items', (req, res) => {
  const { category, q } = req.query;
  const { items } = loadItems();
  let out = items;
  if (category) out = out.filter((x) => x.category === category);
  if (q) {
    const ql = String(q).toLowerCase();
    out = out.filter((x) =>
      (x.name || '').toLowerCase().includes(ql)
      || (x.name_az || '').toLowerCase().includes(ql)
      || (x.description || '').toLowerCase().includes(ql)
      || (x.description_az || '').toLowerCase().includes(ql)
      || (x.tags || []).some((t) => t.toLowerCase().includes(ql)));
  }
  res.json({ items: out.map(stripContent) });
});
// Full single item (with content for articles).
// For locked items the content is truncated for guests and non-unlocked users.
app.get('/api/items/:id', (req, res) => {
  const { items } = loadItems();
  const it = items.find((x) => x.id === req.params.id);
  if (!it) return res.status(404).json({ error: 'not_found' });

  const user = auth.currentUser(req);
  const locked = it.access === 'registered' || it.access === 'pro';
  const unlocked = user && (
    (user.unlocked || []).includes(it.id)
    || (it.access === 'registered')
    || user.role === 'admin'
  );

  // Free or unlocked → full content
  if (!locked || (user && unlocked)) {
    return res.json({ item: it, locked: false, user: auth.publicUser(user) });
  }

  // Locked & guest → return preview (first ~30%) + locked flag
  const preview = (s) => {
    if (!s) return '';
    const cut = Math.max(300, Math.floor(s.length * 0.30));
    return s.slice(0, cut) + '\n\n…';
  };
  const trimmed = {
    ...it,
    content: preview(it.content),
    content_az: preview(it.content_az),
    downloadUrl: undefined,
    modUrl: undefined,
  };
  res.json({
    item: trimmed,
    locked: true,
    requiredAccess: it.access || 'registered',
    user: auth.publicUser(user),
  });
});

// admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  const cfg = loadConfig();
  const expected = process.env.ADMIN_PASSWORD || cfg.adminPassword;
  if (!password || password !== expected) {
    return res.status(401).json({ error: 'wrong_password' });
  }
  const token = newToken();
  adminSessions.set(token, Date.now() + 4 * 60 * 60 * 1000); // 4h
  res.json({ token, expiresIn: 4 * 60 * 60 });
});
app.post('/api/admin/logout', (req, res) => {
  const tok = req.headers['x-admin-token'];
  if (tok) adminSessions.delete(tok);
  res.json({ ok: true });
});
app.get('/api/admin/check', (req, res) => res.json({ authed: isAuthed(req) }));

// =================== USER AUTH ===================
// in-memory rate-limit (ip -> { count, resetAt })
const authRateLimit = new Map();
function rateLimit(req, res, max = 8, windowMs = 60 * 1000) {
  const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString().split(',')[0].trim();
  const now = Date.now();
  const rec = authRateLimit.get(ip);
  if (!rec || rec.resetAt < now) {
    authRateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  rec.count++;
  if (rec.count > max) {
    res.status(429).json({ error: 'rate_limited', retryAfter: Math.ceil((rec.resetAt - now) / 1000) });
    return false;
  }
  return true;
}

// register
app.post('/api/auth/register', (req, res) => {
  if (!rateLimit(req, res)) return;
  const { username, email, password } = req.body || {};
  if (!username || !auth.RE_USERNAME.test(username)) {
    return res.status(400).json({ error: 'bad_username', message: 'Логин: 3-20 латинских букв/цифр/_' });
  }
  if (!email || !auth.RE_EMAIL.test(email)) {
    return res.status(400).json({ error: 'bad_email', message: 'Неверный email' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'bad_password', message: 'Пароль минимум 6 символов' });
  }
  const db = auth.loadUsers();
  const u = (s) => (s || '').toLowerCase();
  if (db.users.find((x) => u(x.username) === u(username))) {
    return res.status(409).json({ error: 'username_taken', message: 'Логин занят' });
  }
  if (db.users.find((x) => u(x.email) === u(email))) {
    return res.status(409).json({ error: 'email_taken', message: 'Email уже зарегистрирован' });
  }
  const now = new Date().toISOString();
  const newUser = {
    id: auth.newUserId(),
    username: username.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: auth.hashPassword(password),
    role: 'user',
    createdAt: now,
    lastSeen: now,
    streak: 1,
    unlocked: [],     // ids of unlocked PRO items
    achievements: [{
      id: 'welcome',
      icon: '🎁',
      name: 'Welcome bonus',
      at: now,
    }],
    avatar: null,
  };
  db.users.push(newUser);
  auth.saveUsers(db);

  const token = auth.makeToken(newUser.id);
  auth.setSessionCookie(res, token);
  res.json({ ok: true, user: auth.publicUser(newUser) });
});

// login
app.post('/api/auth/login', (req, res) => {
  if (!rateLimit(req, res, 10)) return;
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  const db = auth.loadUsers();
  const id = (login || '').toLowerCase().trim();
  const user = db.users.find(
    (x) => x.username.toLowerCase() === id || (x.email || '').toLowerCase() === id
  );
  if (!user || user.banned) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Неверный логин или пароль' });
  }
  if (!auth.verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Неверный логин или пароль' });
  }
  auth.touchUser(user.id);
  const token = auth.makeToken(user.id);
  auth.setSessionCookie(res, token);
  // re-read to pick up streak/achievement updates
  const fresh = auth.loadUsers().users.find((x) => x.id === user.id) || user;
  res.json({ ok: true, user: auth.publicUser(fresh) });
});

// logout
app.post('/api/auth/logout', (_req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

// who am I
app.get('/api/auth/me', (req, res) => {
  const user = auth.currentUser(req);
  if (!user) return res.json({ user: null });
  auth.touchUser(user.id);
  const fresh = auth.loadUsers().users.find((x) => x.id === user.id) || user;
  res.json({ user: auth.publicUser(fresh) });
});

// unlock pro item (placeholder for future paid flow — currently uses earned points)
app.post('/api/auth/unlock/:itemId', auth.requireUser, (req, res) => {
  const db = auth.loadUsers();
  const u = db.users.find((x) => x.id === req.user.id);
  if (!u) return res.status(404).json({ error: 'no_user' });
  const itemId = req.params.itemId;
  u.unlocked = u.unlocked || [];
  if (!u.unlocked.includes(itemId)) u.unlocked.push(itemId);
  auth.saveUsers(db);
  res.json({ ok: true, unlocked: u.unlocked });
});

// update profile (avatar emoji, etc.)
app.put('/api/auth/profile', auth.requireUser, (req, res) => {
  const { avatar } = req.body || {};
  const db = auth.loadUsers();
  const u = db.users.find((x) => x.id === req.user.id);
  if (!u) return res.status(404).json({ error: 'no_user' });
  if (typeof avatar === 'string' && avatar.length <= 4) u.avatar = avatar;
  auth.saveUsers(db);
  res.json({ ok: true, user: auth.publicUser(u) });
});

// admin CRUD
app.post('/api/items', requireAuth, (req, res) => {
  const it = req.body || {};
  if (!it.name || !it.category) return res.status(400).json({ error: 'name_and_category_required' });
  it.id = it.id || (it.category.slice(0, 3) + '-' + Date.now().toString(36));
  it.createdAt = new Date().toISOString();
  it.tags = Array.isArray(it.tags) ? it.tags : (typeof it.tags === 'string' ? it.tags.split(',').map((s) => s.trim()).filter(Boolean) : []);
  it.downloads = it.downloads || 0;
  it.rating = it.rating || 0;
  const file = fileFor(it);
  const data = loadRaw(file);
  data.items = data.items || [];
  data.items.push(it);
  saveRaw(file, data);
  res.json({ item: it });
});
app.put('/api/items/:id', requireAuth, (req, res) => {
  const file = findItemFile(req.params.id);
  if (!file) return res.status(404).json({ error: 'not_found' });
  const data = loadRaw(file);
  const idx = data.items.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not_found' });
  const patch = req.body || {};
  if (typeof patch.tags === 'string') patch.tags = patch.tags.split(',').map((s) => s.trim()).filter(Boolean);
  const updated = { ...data.items[idx], ...patch, id: data.items[idx].id };
  // If type changed from/to article, move to correct file
  const targetFile = fileFor(updated);
  if (targetFile !== file) {
    data.items.splice(idx, 1);
    saveRaw(file, data);
    const target = loadRaw(targetFile);
    target.items = target.items || [];
    target.items.push(updated);
    saveRaw(targetFile, target);
  } else {
    data.items[idx] = updated;
    saveRaw(file, data);
  }
  res.json({ item: updated });
});
app.delete('/api/items/:id', requireAuth, (req, res) => {
  const file = findItemFile(req.params.id);
  if (!file) return res.status(404).json({ error: 'not_found' });
  const data = loadRaw(file);
  const before = data.items.length;
  data.items = data.items.filter((x) => x.id !== req.params.id);
  if (data.items.length === before) return res.status(404).json({ error: 'not_found' });
  saveRaw(file, data);
  res.json({ ok: true });
});

// item download/view tracker (also records per-day for trending)
app.post('/api/items/:id/track', (req, res) => {
  const file = findItemFile(req.params.id);
  if (!file) return res.status(404).json({ error: 'not_found' });
  const data = loadRaw(file);
  const it = data.items.find((x) => x.id === req.params.id);
  if (!it) return res.status(404).json({ error: 'not_found' });
  it.downloads = (it.downloads || 0) + 1;
  // per-day trending bucket (rolling 7 days)
  const today = new Date().toISOString().slice(0, 10);
  it.daily = it.daily || {};
  it.daily[today] = (it.daily[today] || 0) + 1;
  // prune older than 14 days
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  Object.keys(it.daily).forEach((d) => { if (d < cutoff) delete it.daily[d]; });
  saveRaw(file, data);
  res.json({ downloads: it.downloads });
});

// trending: items sorted by downloads in last 7 days
app.get('/api/trending', (_req, res) => {
  const { items } = loadItems();
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const scored = items.map((it) => {
    const daily = it.daily || {};
    const recent = Object.keys(daily).filter((d) => d >= cutoff).reduce((s, d) => s + daily[d], 0);
    return { ...stripContent(it), trendingScore: recent };
  }).filter((x) => x.trendingScore > 0).sort((a, b) => b.trendingScore - a.trendingScore);
  res.json({ items: scored.slice(0, 20) });
});

// ===== Likes / Dislikes =====
app.post('/api/items/:id/vote', (req, res) => {
  const { vote } = req.body || {}; // 'up' | 'down' | 'unvote-up' | 'unvote-down'
  const data = loadItems();
  const it = data.items.find((x) => x.id === req.params.id);
  if (!it) return res.status(404).json({ error: 'not_found' });
  it.likes = it.likes || 0;
  it.dislikes = it.dislikes || 0;
  if (vote === 'up') it.likes++;
  else if (vote === 'down') it.dislikes++;
  else if (vote === 'unvote-up') it.likes = Math.max(0, it.likes - 1);
  else if (vote === 'unvote-down') it.dislikes = Math.max(0, it.dislikes - 1);
  saveItems(data);
  res.json({ likes: it.likes, dislikes: it.dislikes });
});

// ===== Music — list of mp3 files in public/music/ =====
app.get('/api/music', (_req, res) => {
  try {
    const dir = path.join(__dirname, 'public', 'music');
    if (!fs.existsSync(dir)) return res.json({ tracks: [] });
    const files = fs.readdirSync(dir)
      .filter((f) => /\.(mp3|m4a|ogg|wav|flac)$/i.test(f))
      .sort()
      .map((f) => {
        const base = f.replace(/\.[^.]+$/, '');
        // "Artist - Title.mp3" → split, otherwise just title
        const parts = base.split(' - ');
        const artist = parts.length > 1 ? parts[0] : '';
        const title  = parts.length > 1 ? parts.slice(1).join(' - ') : base;
        return { file: f, url: '/music/' + encodeURIComponent(f), artist, title };
      });
    res.json({ tracks: files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Admin: Categories CRUD =====
app.get('/api/admin/categories', requireAuth, (_req, res) => {
  const cfg = loadConfig();
  res.json({ categories: cfg.categories || [] });
});
app.post('/api/admin/categories', requireAuth, (req, res) => {
  const cfg = loadConfig();
  const c = req.body || {};
  if (!c.id || !c.name) return res.status(400).json({ error: 'id_and_name_required' });
  if ((cfg.categories || []).some((x) => x.id === c.id)) return res.status(400).json({ error: 'id_exists' });
  cfg.categories = cfg.categories || [];
  cfg.categories.push({
    id: c.id, name: c.name, name_az: c.name_az || c.name,
    description: c.description || '', description_az: c.description_az || c.description || '',
    icon: c.icon || '📦', color: c.color || '#5cd4ff',
    external: c.external || null,
  });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  res.json({ category: cfg.categories[cfg.categories.length - 1] });
});
app.put('/api/admin/categories/:id', requireAuth, (req, res) => {
  const cfg = loadConfig();
  const idx = (cfg.categories || []).findIndex((x) => x.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not_found' });
  cfg.categories[idx] = { ...cfg.categories[idx], ...(req.body || {}), id: cfg.categories[idx].id };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  res.json({ category: cfg.categories[idx] });
});
app.delete('/api/admin/categories/:id', requireAuth, (req, res) => {
  const cfg = loadConfig();
  const before = (cfg.categories || []).length;
  cfg.categories = (cfg.categories || []).filter((x) => x.id !== req.params.id);
  if (cfg.categories.length === before) return res.status(404).json({ error: 'not_found' });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  res.json({ ok: true });
});

// ===== Admin: site config =====
app.get('/api/admin/config', requireAuth, (_req, res) => {
  const cfg = loadConfig();
  // hide password
  const { adminPassword, ...safe } = cfg;
  res.json({ config: safe });
});
app.put('/api/admin/config', requireAuth, (req, res) => {
  const cfg = loadConfig();
  const patch = req.body || {};
  // allow updating siteName, accent, theme defaults; password change requires explicit field
  if (patch.siteName !== undefined) cfg.siteName = patch.siteName;
  if (patch.accent !== undefined) cfg.accent = patch.accent;
  if (patch.defaultTheme !== undefined) cfg.defaultTheme = patch.defaultTheme;
  if (patch.defaultLang !== undefined) cfg.defaultLang = patch.defaultLang;
  if (patch.adminPassword) cfg.adminPassword = patch.adminPassword;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  const { adminPassword, ...safe } = cfg;
  res.json({ config: safe });
});

// ===== Admin: stats =====
app.get('/api/admin/stats', requireAuth, (_req, res) => {
  const { items } = loadItems();
  const totalDl = items.reduce((s, x) => s + (x.downloads || 0), 0);
  const articles = items.filter((x) => x.type === 'article').length;
  const software = items.length - articles;
  const topDownloads = items.slice().sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    .slice(0, 10).map((x) => ({ id: x.id, name: x.name, downloads: x.downloads || 0, type: x.type || 'software' }));
  // build last-14-days activity timeline
  const days = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days[d] = 0;
  }
  items.forEach((it) => {
    Object.entries(it.daily || {}).forEach(([d, n]) => {
      if (days[d] !== undefined) days[d] += n;
    });
  });
  res.json({
    counts: { items: items.length, articles, software, totalDownloads: totalDl },
    topDownloads,
    timeline: Object.entries(days).map(([day, count]) => ({ day, count })),
  });
});

// ---------- helpers ----------
function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  const re = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})+$/;
  return re.test(domain) && domain.length <= 253;
}

async function withTimeout(promise, ms) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error('timeout')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

async function pLimitAll(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try { results[idx] = await fn(items[idx], idx); }
      catch (e) { results[idx] = { error: String(e.message || e) }; }
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------- subdomain sources ----------
async function fromCrtSh(domain) {
  const url = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;
  const res = await withTimeout(fetch(url, { headers: { 'User-Agent': 'sni-finder/1.0' } }), 25000);
  if (!res.ok) throw new Error(`crt.sh ${res.status}`);
  const data = await res.json();
  const set = new Set();
  for (const e of data) {
    const names = (e.name_value || '').split('\n');
    for (let n of names) {
      n = n.trim().toLowerCase().replace(/^\*\./, '');
      if (n && (n === domain || n.endsWith('.' + domain))) set.add(n);
    }
  }
  return Array.from(set);
}

async function fromHackerTarget(domain) {
  const url = `https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(domain)}`;
  const res = await withTimeout(fetch(url), 15000);
  if (!res.ok) return [];
  const text = await res.text();
  if (/error|api count exceeded/i.test(text)) return [];
  const set = new Set();
  for (const line of text.split('\n')) {
    const host = (line.split(',')[0] || '').trim().toLowerCase();
    if (host && (host === domain || host.endsWith('.' + domain))) set.add(host);
  }
  return Array.from(set);
}

async function fromAlienVault(domain) {
  const url = `https://otx.alienvault.com/api/v1/indicators/domain/${encodeURIComponent(domain)}/passive_dns`;
  const res = await withTimeout(fetch(url), 15000);
  if (!res.ok) return [];
  const data = await res.json();
  const set = new Set();
  for (const r of data.passive_dns || []) {
    const host = (r.hostname || '').trim().toLowerCase();
    if (host && (host === domain || host.endsWith('.' + domain))) set.add(host);
  }
  return Array.from(set);
}

async function fromRapidDns(domain) {
  const set = new Set();
  // pages 1..5, full=1
  for (let page = 1; page <= 5; page++) {
    const url = `https://rapiddns.io/subdomain/${encodeURIComponent(domain)}?page=${page}&full=1`;
    try {
      const res = await withTimeout(fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }), 12000);
      if (!res.ok) break;
      const html = await res.text();
      const re = /<td[^>]*>([a-z0-9.\-_]+\.[a-z0-9.\-_]+)<\/td>/gi;
      let m, before = set.size;
      while ((m = re.exec(html)) !== null) {
        const host = m[1].trim().toLowerCase();
        if (host && (host === domain || host.endsWith('.' + domain))) set.add(host);
      }
      if (set.size === before) break; // no new -> stop pagination
    } catch { break; }
  }
  return Array.from(set);
}

// AnubisDB (jonlu.ca) — fast curated subdomain DB
async function fromAnubis(domain) {
  const url = `https://jldc.me/anubis/subdomains/${encodeURIComponent(domain)}`;
  const res = await withTimeout(fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }), 12000);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const set = new Set();
  for (const n of data) {
    const host = String(n).trim().toLowerCase().replace(/^\*\./, '');
    if (host && (host === domain || host.endsWith('.' + domain))) set.add(host);
  }
  return Array.from(set);
}

// URLScan.io — public search
async function fromUrlScan(domain) {
  const url = `https://urlscan.io/api/v1/search/?q=domain:${encodeURIComponent(domain)}&size=10000`;
  const res = await withTimeout(fetch(url), 15000);
  if (!res.ok) return [];
  const data = await res.json();
  const set = new Set();
  for (const r of data.results || []) {
    const host = (r.page?.domain || r.task?.domain || '').toLowerCase();
    if (host && (host === domain || host.endsWith('.' + domain))) set.add(host);
    const apex = (r.page?.apexDomain || '').toLowerCase();
    if (apex && (apex === domain || apex.endsWith('.' + domain))) set.add(apex);
  }
  return Array.from(set);
}

// Wayback Machine CDX — pulls historical URLs, extracts hostnames
async function fromWayback(domain) {
  const url = `https://web.archive.org/cdx/search/cdx?url=*.${encodeURIComponent(domain)}&output=json&fl=original&collapse=urlkey&limit=15000`;
  const res = await withTimeout(fetch(url), 20000);
  if (!res.ok) return [];
  const data = await res.json();
  const set = new Set();
  for (let i = 1; i < data.length; i++) {
    const u = data[i]?.[0];
    if (!u) continue;
    try {
      const host = new URL(u).hostname.toLowerCase();
      if (host && (host === domain || host.endsWith('.' + domain))) set.add(host);
    } catch {}
  }
  return Array.from(set);
}

// CertSpotter — additional CT log source
async function fromCertSpotter(domain) {
  const url = `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names`;
  const res = await withTimeout(fetch(url, { headers: { 'User-Agent': 'sni-finder/1.0' } }), 15000);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const set = new Set();
  for (const e of data) {
    for (let n of e.dns_names || []) {
      n = String(n).trim().toLowerCase().replace(/^\*\./, '');
      if (n && (n === domain || n.endsWith('.' + domain))) set.add(n);
    }
  }
  return Array.from(set);
}

// DNS brute force — try common subdomain prefixes
const COMMON_PREFIXES = [
  'www','mail','ftp','smtp','pop','imap','webmail','m','mobile','app','api','api2','api-v2','dev','test',
  'staging','stage','prod','beta','alpha','demo','admin','administrator','panel','portal','dashboard',
  'cp','cpanel','whm','plesk','ns','ns1','ns2','ns3','ns4','dns','dns1','dns2','mx','mx1','mx2',
  'web','web1','web2','blog','news','shop','store','cart','pay','payment','billing','support','help',
  'docs','wiki','kb','status','stats','analytics','cdn','static','assets','img','images','media',
  'video','videos','file','files','download','downloads','upload','uploads','cloud','storage',
  'auth','sso','login','signin','signup','register','account','accounts','my','user','users',
  'forum','forums','community','chat','live','stream','events','vpn','remote','vps','server','host',
  'gateway','proxy','router','firewall','secure','ssl','db','database','mysql','sql','redis','mongo',
  'git','gitlab','github','jenkins','ci','cd','build','deploy','docker','kubernetes','k8s',
  'corp','intranet','extranet','internal','external','public','private','old','new','v1','v2','v3',
  'mobi','wap','client','clients','partner','partners','vendor','b2b','b2c','crm','erp',
  'office','mail2','ww1','ww2','www1','www2','www3','en','ru','az','tr','fr','de','es','ar',
];
async function fromDnsBrute(domain) {
  const set = new Set();
  await pLimitAll(COMMON_PREFIXES, 50, async (prefix) => {
    const host = `${prefix}.${domain}`;
    try {
      // dns.lookup uses system resolver; quick fail on NXDOMAIN
      await withTimeout(dns.lookup(host), 2500);
      set.add(host);
    } catch {}
  });
  return Array.from(set);
}

// ---------- routes ----------
app.get('/api/search', async (req, res) => {
  const domain = (req.query.domain || '').trim().toLowerCase();
  if (!isValidDomain(domain)) return res.status(400).json({ error: 'invalid_domain' });
  const useBrute = req.query.brute !== '0'; // default ON

  const sourceFns = [
    ['crtsh', fromCrtSh(domain)],
    ['hackertarget', fromHackerTarget(domain)],
    ['alienvault', fromAlienVault(domain)],
    ['rapiddns', fromRapidDns(domain)],
    ['anubis', fromAnubis(domain)],
    ['urlscan', fromUrlScan(domain)],
    ['wayback', fromWayback(domain)],
    ['certspotter', fromCertSpotter(domain)],
  ];
  if (useBrute) sourceFns.push(['brute', fromDnsBrute(domain)]);

  const results = await Promise.allSettled(sourceFns.map((x) => x[1]));
  const merged = new Set();
  const counts = {};
  results.forEach((s, i) => {
    const label = sourceFns[i][0];
    counts[label] = s.status === 'fulfilled' ? s.value.length : 0;
    if (s.status === 'fulfilled') s.value.forEach((x) => merged.add(x));
  });

  const subdomains = Array.from(merged).sort();
  res.json({ domain, total: subdomains.length, sources: counts, results: subdomains });
});

// quick DNS resolve
app.post('/api/resolve', async (req, res) => {
  const hosts = Array.isArray(req.body.hosts) ? req.body.hosts.slice(0, 200) : [];
  const out = await pLimitAll(hosts, 20, async (host) => {
    try {
      const a = await withTimeout(dns.resolve4(host), 3000).catch(() => []);
      const aaaa = a.length ? [] : await withTimeout(dns.resolve6(host), 2500).catch(() => []);
      return { host, ips: [...a, ...aaaa] };
    } catch { return { host, ips: [] }; }
  });
  res.json({ results: out });
});

// HTTP test
function httpTest(host, useHttps = true) {
  return new Promise((resolve) => {
    const lib = useHttps ? https : http;
    const start = Date.now();
    const req = lib.request({
      host,
      port: useHttps ? 443 : 80,
      method: 'GET',
      path: '/',
      servername: host,
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SNI-Finder/1.0)',
        'Accept': '*/*',
        'Connection': 'close',
      },
      timeout: 8000,
    }, (r) => {
      const headers = r.headers;
      const server = headers.server || '';
      const cfRay = headers['cf-ray'] || '';
      const cfCache = headers['cf-cache-status'] || '';
      const isCloudflare = /cloudflare/i.test(server) || !!cfRay;
      const cdn = isCloudflare ? 'cloudflare'
        : /cloudfront/i.test(server) ? 'cloudfront'
        : /akamai/i.test(server) ? 'akamai'
        : /fastly/i.test(server) ? 'fastly'
        : /google/i.test(server) ? 'google'
        : /amazon|aws/i.test(server) ? 'aws'
        : '';
      let location = headers.location || '';
      r.on('data', () => {});
      r.on('end', () => {
        resolve({
          ok: true,
          status: r.statusCode,
          server,
          cdn,
          isCloudflare,
          cfRay: cfRay || null,
          cfCache: cfCache || null,
          location: location || null,
          ms: Date.now() - start,
        });
      });
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', (e) => resolve({ ok: false, error: e.code || e.message, ms: Date.now() - start }));
    req.end();
  });
}

// WebSocket handshake test
function wsTest(host, useTls = true) {
  return new Promise((resolve) => {
    const start = Date.now();
    const key = crypto.randomBytes(16).toString('base64');
    const port = useTls ? 443 : 80;
    const opts = { host, port, servername: host, rejectUnauthorized: false };
    const sock = useTls ? tls.connect(opts) : net.connect({ host, port });
    sock.setTimeout(8000);

    let buf = '';
    let done = false;
    const finish = (obj) => { if (done) return; done = true; try { sock.destroy(); } catch {} resolve({ ...obj, ms: Date.now() - start }); };

    sock.on('connect', () => {
      const req =
        `GET /chat HTTP/1.1\r\n` +
        `Host: ${host}\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\n` +
        `Sec-WebSocket-Version: 13\r\n` +
        `User-Agent: Mozilla/5.0\r\n` +
        `\r\n`;
      sock.write(req);
    });
    if (useTls) sock.on('secureConnect', () => {
      const req =
        `GET /chat HTTP/1.1\r\n` +
        `Host: ${host}\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\n` +
        `Sec-WebSocket-Version: 13\r\n` +
        `\r\n`;
      sock.write(req);
    });

    sock.on('data', (d) => {
      buf += d.toString('binary');
      if (buf.includes('\r\n\r\n')) {
        const head = buf.split('\r\n\r\n')[0];
        const firstLine = head.split('\r\n')[0] || '';
        const m = firstLine.match(/HTTP\/1\.[01]\s+(\d+)/);
        const status = m ? parseInt(m[1]) : 0;
        const upgrade = /upgrade:\s*websocket/i.test(head) && status === 101;
        finish({ ok: true, status, upgrade });
      }
    });
    sock.on('timeout', () => finish({ ok: false, error: 'timeout' }));
    sock.on('error', (e) => finish({ ok: false, error: e.code || e.message }));
    sock.on('end', () => { if (!done) finish({ ok: false, error: 'closed' }); });
  });
}

// SNI / TLS info
function sniTest(host) {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = tls.connect({
      host, port: 443, servername: host, rejectUnauthorized: false, ALPNProtocols: ['h2', 'http/1.1'],
    });
    sock.setTimeout(8000);
    sock.on('secureConnect', () => {
      const cert = sock.getPeerCertificate();
      const proto = sock.getProtocol();
      const alpn = sock.alpnProtocol || '';
      resolve({
        ok: true,
        tls: proto,
        alpn,
        cert: cert ? {
          subject: cert.subject?.CN || null,
          issuer: cert.issuer?.O || null,
          valid_to: cert.valid_to || null,
        } : null,
        ms: Date.now() - start,
      });
      try { sock.end(); } catch {}
    });
    sock.on('timeout', () => { sock.destroy(); resolve({ ok: false, error: 'timeout', ms: Date.now() - start }); });
    sock.on('error', (e) => resolve({ ok: false, error: e.code || e.message, ms: Date.now() - start }));
  });
}

// ====================== DEEP PROBE FUNCTIONS ======================

// 1) DNS resolution: IPv4 + IPv6 (system resolver + DoH fallback)
async function dohResolve(host, type) {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`;
    const r = await withTimeout(fetch(url, { headers: { 'accept': 'application/dns-json' } }), 4000);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.Answer || []).filter((x) => x.type === (type === 'A' ? 1 : type === 'AAAA' ? 28 : 5)).map((x) => x.data);
  } catch { return []; }
}
async function dnsAll(host) {
  const out = { ipv4: [], ipv6: [], cname: null };
  // Primary: dns.lookup (uses OS resolver — most reliable on Windows)
  try {
    const all = await dns.lookup(host, { all: true, verbatim: true });
    for (const a of all) {
      if (a.family === 4 && !out.ipv4.includes(a.address)) out.ipv4.push(a.address);
      else if (a.family === 6 && !out.ipv6.includes(a.address)) out.ipv6.push(a.address);
    }
  } catch {}
  // Fallback: explicit A/AAAA queries
  if (!out.ipv4.length) { try { out.ipv4 = await dns.resolve4(host); } catch {} }
  if (!out.ipv6.length) { try { out.ipv6 = await dns.resolve6(host); } catch {} }
  // Last resort: DoH over Cloudflare
  if (!out.ipv4.length) out.ipv4 = await dohResolve(host, 'A');
  if (!out.ipv6.length) out.ipv6 = await dohResolve(host, 'AAAA');
  // CNAME (best effort)
  try {
    const c = await dns.resolveCname(host);
    out.cname = c?.[0] || null;
  } catch {
    const cnames = await dohResolve(host, 'CNAME');
    out.cname = cnames[0]?.replace(/\.$/, '') || null;
  }
  return out;
}

// 2) TCP ping (3 attempts) — measures pure TCP RTT
function tcpPingOnce(host, port = 443, timeout = 4000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = net.createConnection({ host, port });
    let done = false;
    const fin = (ok, err) => { if (done) return; done = true; try { sock.destroy(); } catch {} resolve({ ok, ms: Date.now() - start, err: err || null }); };
    sock.setTimeout(timeout);
    sock.on('connect', () => fin(true));
    sock.on('timeout', () => fin(false, 'timeout'));
    sock.on('error', (e) => fin(false, e.code || e.message));
  });
}
async function tcpPing(host, port = 443, n = 3) {
  const results = [];
  for (let i = 0; i < n; i++) {
    results.push(await tcpPingOnce(host, port));
    await new Promise((r) => setTimeout(r, 80));
  }
  const ok = results.filter((r) => r.ok).map((r) => r.ms);
  const stability = Math.round((ok.length / n) * 100);
  return {
    attempts: n,
    success: ok.length,
    stability,
    min: ok.length ? Math.min(...ok) : null,
    avg: ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : null,
    max: ok.length ? Math.max(...ok) : null,
    samples: results,
  };
}

// 3) Deep TLS info: cipher, ALPN list, full cert chain, fingerprint
function deepTls(host, alpnList = ['h2', 'http/1.1']) {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = tls.connect({
      host, port: 443, servername: host, rejectUnauthorized: false,
      ALPNProtocols: alpnList,
    });
    sock.setTimeout(8000);
    sock.on('secureConnect', () => {
      const cert = sock.getPeerCertificate(true);
      const proto = sock.getProtocol();
      const cipher = sock.getCipher?.() || null;
      const alpn = sock.alpnProtocol || '';
      // fingerprint: hash of (proto + cipher + alpn). Not a real JA3 but deterministic per server config
      const fp = crypto.createHash('sha256').update(`${proto}|${cipher?.name||''}|${alpn}`).digest('hex').slice(0, 16);
      // SAN list
      let san = [];
      if (cert?.subjectaltname) {
        san = cert.subjectaltname.split(',').map((s) => s.trim().replace(/^DNS:/, ''));
      }
      // chain
      const chain = [];
      let c = cert;
      const seen = new Set();
      while (c && c.subject && !seen.has(c.fingerprint)) {
        seen.add(c.fingerprint);
        chain.push({
          subject: c.subject?.CN || c.subject?.O || null,
          issuer: c.issuer?.CN || c.issuer?.O || null,
          valid_from: c.valid_from || null,
          valid_to: c.valid_to || null,
        });
        if (!c.issuerCertificate || c.issuerCertificate === c) break;
        c = c.issuerCertificate;
      }
      resolve({
        ok: true, tls: proto, alpn, cipher: cipher ? { name: cipher.name, version: cipher.version } : null,
        fingerprint: fp,
        cert: cert ? {
          subject: cert.subject?.CN || null,
          issuer: cert.issuer?.O || cert.issuer?.CN || null,
          valid_from: cert.valid_from || null,
          valid_to: cert.valid_to || null,
          san,
        } : null,
        chain,
        ms: Date.now() - start,
      });
      try { sock.end(); } catch {}
    });
    sock.on('timeout', () => { sock.destroy(); resolve({ ok: false, error: 'timeout', ms: Date.now() - start }); });
    sock.on('error', (e) => resolve({ ok: false, error: e.code || e.message, ms: Date.now() - start }));
  });
}

// 4) HTTP/2 negotiation test
async function http2Test(host) {
  const r = await deepTls(host, ['h2']);
  return { ok: r.ok, h2: r.alpn === 'h2', alpn: r.alpn || null, ms: r.ms, error: r.error || null };
}

// 5) SNI vs no-SNI comparison
function noSniTls(host) {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = tls.connect({
      host, port: 443, rejectUnauthorized: false, // no servername
    });
    sock.setTimeout(6000);
    sock.on('secureConnect', () => {
      const cert = sock.getPeerCertificate();
      resolve({ ok: true, subject: cert?.subject?.CN || null, ms: Date.now() - start });
      try { sock.end(); } catch {}
    });
    sock.on('timeout', () => { sock.destroy(); resolve({ ok: false, error: 'timeout', ms: Date.now() - start }); });
    sock.on('error', (e) => resolve({ ok: false, error: e.code || e.message, ms: Date.now() - start }));
  });
}
async function sniRouting(host) {
  const [withSni, withoutSni] = await Promise.all([
    deepTls(host).then((r) => r.cert?.subject || null).catch(() => null),
    noSniTls(host).then((r) => r.subject || null).catch(() => null),
  ]);
  // if cert with SNI != cert without SNI -> server uses SNI routing -> good for bypass
  const sniRouted = withSni && withoutSni && withSni !== withoutSni;
  return { withSni, withoutSni, sniRouted: !!sniRouted };
}

// 6) Domain Fronting test: SNI=host, raw TLS write GET / with Host: facebook.com
function domainFronting(sniHost, frontHost = 'www.facebook.com') {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = tls.connect({
      host: sniHost, port: 443, servername: sniHost, rejectUnauthorized: false,
      ALPNProtocols: ['http/1.1'],
    });
    sock.setTimeout(6000);
    let buf = '';
    let done = false;
    const fin = (obj) => { if (done) return; done = true; try { sock.destroy(); } catch {} resolve({ ...obj, ms: Date.now() - start }); };
    sock.on('secureConnect', () => {
      const req = `GET / HTTP/1.1\r\nHost: ${frontHost}\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\nAccept: */*\r\n\r\n`;
      sock.write(req);
    });
    sock.on('data', (d) => {
      buf += d.toString('binary');
      if (buf.length > 4000 || buf.includes('\r\n\r\n')) {
        const m = buf.match(/HTTP\/1\.[01]\s+(\d+)/);
        const status = m ? parseInt(m[1]) : 0;
        // 200/301/302 with content -> fronting works (server forwarded based on Host header)
        const works = status >= 200 && status < 400;
        fin({ ok: true, status, works });
      }
    });
    sock.on('timeout', () => fin({ ok: false, error: 'timeout' }));
    sock.on('error', (e) => fin({ ok: false, error: e.code || e.message }));
    sock.on('end', () => { if (!done) fin({ ok: false, error: 'closed' }); });
  });
}

// 7) Replay test: 3 quick TLS handshakes -> stability
async function replayTest(host, n = 3) {
  const results = [];
  for (let i = 0; i < n; i++) {
    const r = await deepTls(host);
    results.push({ ok: r.ok, ms: r.ms });
    await new Promise((r) => setTimeout(r, 250));
  }
  const ok = results.filter((r) => r.ok).length;
  return { attempts: n, success: ok, stability: Math.round((ok / n) * 100), samples: results };
}

// 8) ASN / GeoIP via ip-api.com (free, no token, 45 req/min)
async function asnLookup(ip) {
  if (!ip) return null;
  try {
    const url = `http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp,org,as,asname,query`;
    const r = await withTimeout(fetch(url), 4000);
    if (!r.ok) return null;
    const j = await r.json();
    if (j.status !== 'success') return null;
    return { country: j.country, cc: j.countryCode, region: j.regionName, city: j.city, isp: j.isp, org: j.org, asn: j.as, asname: j.asname };
  } catch { return null; }
}

// 9) ECH support detection via DoH HTTPS RR
async function echDetect(host) {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=HTTPS`;
    const r = await withTimeout(fetch(url, { headers: { 'accept': 'application/dns-json' } }), 4000);
    if (!r.ok) return { supported: false };
    const j = await r.json();
    const records = j.Answer || [];
    let ech = false, alpn = [], ipv4hint = [], ipv6hint = [];
    for (const rec of records) {
      if (rec.type !== 65) continue; // HTTPS RR
      const data = (rec.data || '').toLowerCase();
      if (data.includes('ech=')) ech = true;
      const alpnMatch = data.match(/alpn="([^"]+)"/);
      if (alpnMatch) alpn = alpnMatch[1].split(',').map((s) => s.trim());
    }
    return { supported: ech, alpn, hasHttpsRR: records.length > 0 };
  } catch { return { supported: false, error: 'lookup_failed' }; }
}

// 10) Aggregate deep probe for one host
async function deepProbe(host) {
  const t0 = Date.now();
  const dnsInfo = await dnsAll(host);
  const firstIp = dnsInfo.ipv4[0] || dnsInfo.ipv6[0] || null;

  const [tlsInfo, h2Info, sniRoutInfo, frontInfo, replay, ping, asn, ech] = await Promise.allSettled([
    deepTls(host),
    http2Test(host),
    sniRouting(host),
    domainFronting(host),
    replayTest(host),
    tcpPing(host),
    firstIp ? asnLookup(firstIp) : Promise.resolve(null),
    echDetect(host),
  ]).then((arr) => arr.map((x) => x.status === 'fulfilled' ? x.value : null));

  return {
    host,
    dns: { ...dnsInfo, ipv6Reachable: dnsInfo.ipv6.length > 0 },
    tls: tlsInfo,
    http2: h2Info,
    sniRouting: sniRoutInfo,
    domainFronting: frontInfo,
    replay,
    ping,
    asn,
    ech,
    totalMs: Date.now() - t0,
  };
}

// Endpoint: deep probe single host
app.get('/api/deep', async (req, res) => {
  const host = (req.query.host || '').trim().toLowerCase();
  if (!isValidDomain(host)) return res.status(400).json({ error: 'invalid_host' });
  try {
    const out = await withTimeout(deepProbe(host), 25000);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message || 'probe_failed' });
  }
});

app.post('/api/test', async (req, res) => {
  const hosts = Array.isArray(req.body.hosts) ? req.body.hosts.slice(0, 300) : [];
  const tests = req.body.tests || { http: true, ws: true, sni: true };
  const concurrency = Math.min(Math.max(parseInt(req.body.concurrency) || 15, 1), 30);

  const results = await pLimitAll(hosts, concurrency, async (host) => {
    const out = { host };
    const tasks = [];
    if (tests.http) tasks.push(httpTest(host).then((r) => out.http = r));
    if (tests.ws) tasks.push(wsTest(host).then((r) => out.ws = r));
    if (tests.sni) tasks.push(sniTest(host).then((r) => out.sni = r));
    await Promise.all(tasks);
    return out;
  });

  res.json({ total: results.length, results });
});

// session storage for big host lists (avoids URL length limits)
const TEST_SESSIONS = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of TEST_SESSIONS.entries()) {
    if (now - v.created > 5 * 60 * 1000) TEST_SESSIONS.delete(k);
  }
}, 60 * 1000).unref?.();

app.post('/api/test-init', (req, res) => {
  const hosts = Array.isArray(req.body?.hosts) ? req.body.hosts : [];
  if (!hosts.length) return res.status(400).json({ error: 'no_hosts' });
  const cleaned = hosts.map((s) => String(s).trim().toLowerCase()).filter(isValidDomain).slice(0, 1000);
  const id = crypto.randomBytes(8).toString('hex');
  TEST_SESSIONS.set(id, {
    created: Date.now(),
    hosts: cleaned,
    options: {
      http: req.body?.http !== false,
      ws: req.body?.ws !== false,
      sni: req.body?.sni !== false,
      concurrency: Math.min(Math.max(parseInt(req.body?.concurrency) || 12, 1), 25),
    },
  });
  res.json({ id, total: cleaned.length });
});

// Streaming version with SSE for terminal-like progress
app.get('/api/test-stream', async (req, res) => {
  let hosts, doHttp, doWs, doSni, concurrency;
  const sessionId = (req.query.id || '').toString();
  if (sessionId) {
    const s = TEST_SESSIONS.get(sessionId);
    if (!s) return res.status(404).end('session_not_found');
    hosts = s.hosts;
    doHttp = s.options.http; doWs = s.options.ws; doSni = s.options.sni;
    concurrency = s.options.concurrency;
    TEST_SESSIONS.delete(sessionId); // single use
  } else {
    const hostsRaw = (req.query.hosts || '').toString();
    hosts = hostsRaw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 300);
    doHttp = req.query.http !== '0';
    doWs = req.query.ws !== '0';
    doSni = req.query.sni !== '0';
    concurrency = Math.min(Math.max(parseInt(req.query.concurrency) || 12, 1), 25);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('start', { total: hosts.length });

  let done = 0;
  await pLimitAll(hosts, concurrency, async (host) => {
    send('log', { msg: `→ ${host}` });
    const out = { host };
    const tasks = [];
    if (doHttp) tasks.push(httpTest(host).then((r) => out.http = r));
    if (doWs) tasks.push(wsTest(host).then((r) => out.ws = r));
    if (doSni) tasks.push(sniTest(host).then((r) => out.sni = r));
    await Promise.all(tasks);
    done++;
    send('result', { ...out, progress: done, total: hosts.length });
    return out;
  });

  send('done', { total: hosts.length });
  res.end();
});

// ===== /api/me — geo + ISP + provider detection =====
const meCache = new Map(); // ip -> { data, ts }
const ME_TTL = 60 * 60 * 1000; // 1h

function detectProvider(asn, isp) {
  if ([29049].includes(asn)) return 'azercell';
  if ([29378].includes(asn)) return 'bakcell';
  if ([41997, 51074].includes(asn)) return 'nar';
  if ([8814].includes(asn)) return 'aztelekom';
  const s = (isp || '').toLowerCase();
  if (s.includes('azercell')) return 'azercell';
  if (s.includes('bakcell')) return 'bakcell';
  if (s.includes('azerfon') || s.includes('nar')) return 'nar';
  if (s.includes('aztelekom') || s.includes('aztelecom')) return 'aztelekom';
  return null;
}

function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '🌐';
  const A = 0x1F1E6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65, A + cc.charCodeAt(1) - 65);
}

app.get('/api/me', async (req, res) => {
  let ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || req.socket.remoteAddress || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);

  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return res.json({
      ip: 'localhost', country: 'Local', countryCode: 'LO', flag: '🏠',
      region: '—', city: 'localhost', isp: 'You', org: '—', asn: 'AS0',
      provider: 'local',
    });
  }

  const cached = meCache.get(ip);
  if (cached && Date.now() - cached.ts < ME_TTL) return res.json(cached.data);

  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp,org,as,query`);
    const d = await r.json();
    if (d.status !== 'success') throw new Error('lookup_failed');
    const asn = parseInt(((d.as || '').match(/AS(\d+)/) || [])[1] || '0', 10);
    const data = {
      ip: d.query,
      country: d.country,
      countryCode: d.countryCode,
      flag: countryFlag(d.countryCode),
      region: d.regionName,
      city: d.city,
      isp: d.isp,
      org: d.org,
      asn: d.as,
      provider: detectProvider(asn, d.isp),
    };
    meCache.set(ip, { data, ts: Date.now() });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'lookup_failed', message: e.message });
  }
});

// ===== ONLINE COUNTER via SSE =====
const onlineClients = new Set();
function broadcastOnline() {
  const count = onlineClients.size;
  const data = `data: ${JSON.stringify({ online: count, ts: Date.now() })}\n\n`;
  for (const res of onlineClients) { try { res.write(data); } catch {} }
}
app.get('/api/online', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ online: onlineClients.size + 1, ts: Date.now() })}\n\n`);
  onlineClients.add(res);
  broadcastOnline();
  const ka = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 25000);
  req.on('close', () => {
    clearInterval(ka);
    onlineClients.delete(res);
    broadcastOnline();
  });
});

// =====================================================================
// ★ SHOP — products + orders (Phase 1: structure + manual payment confirm)
// =====================================================================
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SHOP_CONFIG_FILE = path.join(DATA_DIR, 'shop-config.json');

// =====================================================================
// Default price matrix: prices[type][tariff][duration] = { price, old? }
// SNI = самый дорогой (хост многоразовый), конфиги — одинаковые и дешевле
// 0 баланс — самый дорогой тариф
// =====================================================================
function buildDefaultPrices() {
  // helper: cell with optional discount (old price)
  const c = (price, old) => (old != null ? { price, old } : { price });

  // SNI host (multi-use, hidden in configs — most expensive)
  const sni = {
    zero:      { '1d': c(15),       '7d': c(40, 60), '30d': c(80) },
    whatsapp:  { '1d': c(8),        '7d': c(20, 30), '30d': c(45) },
    telegram:  { '1d': c(8),        '7d': c(20, 30), '30d': c(45) },
    facebook:  { '1d': c(10),       '7d': c(25, 35), '30d': c(55) },
    instagram: { '1d': c(10),       '7d': c(25, 35), '30d': c(55) },
    tiktok:    { '1d': c(12),       '7d': c(30),     '30d': c(60) },
  };
  // configs (sni hidden inside) — same price for all 3 apps
  const cfgPrices = {
    zero:      { '1d': c(8),        '7d': c(20, 30), '30d': c(45) },
    whatsapp:  { '1d': c(3),        '7d': c(8, 12),  '30d': c(18) },
    telegram:  { '1d': c(3),        '7d': c(8, 12),  '30d': c(18) },
    facebook:  { '1d': c(4),        '7d': c(10, 15), '30d': c(22) },
    instagram: { '1d': c(4),        '7d': c(10, 15), '30d': c(22) },
    tiktok:    { '1d': c(5),        '7d': c(12),     '30d': c(25) },
  };
  return {
    sni,
    http_injector: JSON.parse(JSON.stringify(cfgPrices)),
    dark_tunnel:   JSON.parse(JSON.stringify(cfgPrices)),
    ha_tunnel:     JSON.parse(JSON.stringify(cfgPrices)),
  };
}

const DEFAULT_SHOP_CONFIG = {
  enabled: true,
  currency: 'AZN',
  // payment destinations (admin edits in admin panel)
  payments: {
    usdt_trc20: '',     // USDT TRC-20 address
    usdt_bep20: '',     // optional
    m10_phone: '',      // m10 / Birbank phone number
    m10_name: '',       // recipient display name
    contact_telegram: '@baku_root',
  },
  // full price matrix — admin can edit any cell from admin panel
  prices: buildDefaultPrices(),
};

function loadShopFile(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function saveShopFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function getShopConfig() {
  if (!fs.existsSync(SHOP_CONFIG_FILE)) {
    saveShopFile(SHOP_CONFIG_FILE, DEFAULT_SHOP_CONFIG);
    return DEFAULT_SHOP_CONFIG;
  }
  return loadShopFile(SHOP_CONFIG_FILE, DEFAULT_SHOP_CONFIG);
}
function getProducts() {
  return loadShopFile(PRODUCTS_FILE, { products: [] }).products || [];
}
function saveProducts(products) {
  saveShopFile(PRODUCTS_FILE, { products });
}
function getOrders() {
  return loadShopFile(ORDERS_FILE, { orders: [] }).orders || [];
}
function saveOrders(orders) {
  saveShopFile(ORDERS_FILE, { orders });
}

const VALID_OPERATORS = ['bakcell', 'azercell', 'nar'];
const VALID_TYPES = ['sni', 'http_injector', 'dark_tunnel', 'ha_tunnel'];
const VALID_TARIFFS = ['zero', 'whatsapp', 'telegram', 'facebook', 'instagram', 'tiktok'];
const VALID_DURATIONS = ['1d', '7d', '30d'];

// returns { price, old? } from matrix (admin-editable)
function priceCell(cfg, { type, tariff, duration }) {
  const cell = cfg?.prices?.[type]?.[tariff]?.[duration];
  if (cell && typeof cell === 'object') {
    const price = Number(cell.price) || 0;
    const old = cell.old != null ? Number(cell.old) : null;
    return { price, old };
  }
  return { price: 0, old: null };
}

function genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
}

// ---- Public: shop info / catalog ----
app.get('/api/shop/config', (_req, res) => {
  const cfg = getShopConfig();
  // never expose private data
  res.json({
    enabled: cfg.enabled,
    currency: cfg.currency,
    prices: cfg.prices,
    operators: VALID_OPERATORS,
    types: VALID_TYPES,
    tariffs: VALID_TARIFFS,
    durations: VALID_DURATIONS,
  });
});

app.get('/api/shop/stock', (_req, res) => {
  // count of available products by (operator, type, tariff)
  const products = getProducts();
  const stock = {};
  for (const p of products) {
    if (p.status !== 'available') continue;
    const k = `${p.operator}|${p.type}|${p.tariff}`;
    stock[k] = (stock[k] || 0) + 1;
  }
  res.json({ stock });
});

app.post('/api/shop/quote', (req, res) => {
  const cfg = getShopConfig();
  const { operator, type, tariff, duration } = req.body || {};
  if (!VALID_OPERATORS.includes(operator)) return res.status(400).json({ error: 'bad_operator' });
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'bad_type' });
  if (!VALID_TARIFFS.includes(tariff)) return res.status(400).json({ error: 'bad_tariff' });
  if (!VALID_DURATIONS.includes(duration)) return res.status(400).json({ error: 'bad_duration' });
  const { price, old } = priceCell(cfg, { type, tariff, duration });
  const products = getProducts();
  const inStock = products.some((p) =>
    p.status === 'available' && p.operator === operator && p.type === type && p.tariff === tariff);
  res.json({ operator, type, tariff, duration, price, oldPrice: old, currency: cfg.currency, inStock });
});

app.post('/api/shop/order', (req, res) => {
  const cfg = getShopConfig();
  if (!cfg.enabled) return res.status(403).json({ error: 'shop_disabled' });
  const { operator, type, tariff, duration, paymentMethod, contact } = req.body || {};
  if (!VALID_OPERATORS.includes(operator)) return res.status(400).json({ error: 'bad_operator' });
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'bad_type' });
  if (!VALID_TARIFFS.includes(tariff)) return res.status(400).json({ error: 'bad_tariff' });
  if (!VALID_DURATIONS.includes(duration)) return res.status(400).json({ error: 'bad_duration' });
  if (!['usdt', 'm10'].includes(paymentMethod)) return res.status(400).json({ error: 'bad_payment' });
  const cleanContact = String(contact || '').trim().slice(0, 120);
  if (!cleanContact || cleanContact.length < 3) return res.status(400).json({ error: 'bad_contact' });

  const { price } = priceCell(cfg, { type, tariff, duration });
  if (!price || price <= 0) return res.status(400).json({ error: 'price_unavailable' });
  const orderId = genId('ord');
  const accessKey = crypto.randomBytes(8).toString('hex');
  const order = {
    id: orderId,
    accessKey,
    createdAt: Date.now(),
    operator, type, tariff, duration,
    paymentMethod,
    price, currency: cfg.currency,
    contact: cleanContact,
    status: 'pending_payment', // pending_payment | paid_pending_review | confirmed | delivered | cancelled
    paymentNote: '',
    productId: null,
    delivered: null, // populated when admin confirms
  };
  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);

  // public payment info
  const paymentInfo = paymentMethod === 'usdt'
    ? {
        method: 'usdt',
        address: cfg.payments.usdt_trc20 || '(не задано — спроси админа)',
        network: 'TRC-20',
        amount: price,
        amountUSDT: Math.max(0.5, Math.round((price / 1.7) * 100) / 100), // approx AZN→USDT
      }
    : {
        method: 'm10',
        phone: cfg.payments.m10_phone || '(не задано — спроси админа)',
        name: cfg.payments.m10_name || '',
        amount: price,
      };

  res.json({
    orderId, accessKey, price, currency: cfg.currency,
    status: order.status,
    paymentInfo,
    contactTelegram: cfg.payments.contact_telegram,
    redirect: `/shop/order/${orderId}?key=${accessKey}`,
  });
});

function buildPaymentInfo(cfg, o) {
  if (o.paymentMethod === 'usdt') {
    return {
      method: 'usdt',
      address: cfg.payments.usdt_trc20 || '',
      network: 'TRC-20',
      amountAZN: o.price,
      amountUSDT: Math.max(0.5, Math.round((o.price / 1.7) * 100) / 100),
    };
  }
  return {
    method: 'm10',
    phone: cfg.payments.m10_phone || '',
    name: cfg.payments.m10_name || '',
    amountAZN: o.price,
  };
}

app.get('/api/shop/order/:id', (req, res) => {
  const id = String(req.params.id);
  const key = String(req.query.key || '');
  const orders = getOrders();
  const o = orders.find((x) => x.id === id);
  if (!o) return res.status(404).json({ error: 'not_found' });
  if (o.accessKey !== key) return res.status(403).json({ error: 'bad_key' });
  const cfg = getShopConfig();
  res.json({
    id: o.id, status: o.status,
    operator: o.operator, type: o.type, tariff: o.tariff, duration: o.duration,
    price: o.price, currency: o.currency, paymentMethod: o.paymentMethod,
    contact: o.contact,
    createdAt: o.createdAt,
    paymentInfo: buildPaymentInfo(cfg, o),
    contactTelegram: cfg.payments.contact_telegram,
    delivered: o.status === 'delivered' ? o.delivered : null,
  });
});

// user signals "I paid"
app.post('/api/shop/order/:id/paid', (req, res) => {
  const id = String(req.params.id);
  const key = String((req.body && req.body.key) || '');
  const note = String((req.body && req.body.note) || '').trim().slice(0, 500);
  const orders = getOrders();
  const o = orders.find((x) => x.id === id);
  if (!o) return res.status(404).json({ error: 'not_found' });
  if (o.accessKey !== key) return res.status(403).json({ error: 'bad_key' });
  if (o.status === 'pending_payment') {
    o.status = 'paid_pending_review';
    o.paymentNote = note;
    saveOrders(orders);
  }
  res.json({ ok: true, status: o.status });
});

// ---- Admin: products CRUD ----
app.get('/api/admin/shop/products', requireAuth, (_req, res) => {
  res.json({ products: getProducts() });
});
app.post('/api/admin/shop/products', requireAuth, (req, res) => {
  const b = req.body || {};
  if (!VALID_OPERATORS.includes(b.operator)) return res.status(400).json({ error: 'bad_operator' });
  if (!VALID_TYPES.includes(b.type)) return res.status(400).json({ error: 'bad_type' });
  if (!VALID_TARIFFS.includes(b.tariff)) return res.status(400).json({ error: 'bad_tariff' });
  const product = {
    id: genId('prd'),
    createdAt: Date.now(),
    operator: b.operator,
    type: b.type,
    tariff: b.tariff,
    title: String(b.title || '').slice(0, 200),
    payload: String(b.payload || ''), // host string OR base64 file content OR raw config
    payloadFilename: String(b.payloadFilename || '').slice(0, 200),
    note: String(b.note || '').slice(0, 1000),
    status: 'available',
  };
  const products = getProducts();
  products.push(product);
  saveProducts(products);
  res.json({ ok: true, product });
});
app.put('/api/admin/shop/products/:id', requireAuth, (req, res) => {
  const id = String(req.params.id);
  const products = getProducts();
  const p = products.find((x) => x.id === id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  ['operator', 'type', 'tariff'].forEach((k) => {
    if (b[k] != null) p[k] = b[k];
  });
  ['title', 'payload', 'payloadFilename', 'note', 'status'].forEach((k) => {
    if (b[k] != null) p[k] = String(b[k]);
  });
  saveProducts(products);
  res.json({ ok: true, product: p });
});
app.delete('/api/admin/shop/products/:id', requireAuth, (req, res) => {
  const id = String(req.params.id);
  const products = getProducts().filter((p) => p.id !== id);
  saveProducts(products);
  res.json({ ok: true });
});

// ---- Admin: orders ----
app.get('/api/admin/shop/orders', requireAuth, (_req, res) => {
  res.json({ orders: getOrders() });
});
app.post('/api/admin/shop/orders/:id/deliver', requireAuth, (req, res) => {
  const id = String(req.params.id);
  const productId = String((req.body && req.body.productId) || '');
  const orders = getOrders();
  const o = orders.find((x) => x.id === id);
  if (!o) return res.status(404).json({ error: 'not_found' });
  const products = getProducts();
  const p = products.find((x) => x.id === productId);
  if (!p) return res.status(404).json({ error: 'product_not_found' });
  if (p.status !== 'available') return res.status(400).json({ error: 'product_not_available' });
  // attach
  o.productId = p.id;
  o.delivered = {
    title: p.title,
    payload: p.payload,
    payloadFilename: p.payloadFilename,
    note: p.note,
    deliveredAt: Date.now(),
  };
  o.status = 'delivered';
  p.status = 'sold';
  saveOrders(orders);
  saveProducts(products);
  res.json({ ok: true, order: o });
});
app.post('/api/admin/shop/orders/:id/cancel', requireAuth, (req, res) => {
  const id = String(req.params.id);
  const orders = getOrders();
  const o = orders.find((x) => x.id === id);
  if (!o) return res.status(404).json({ error: 'not_found' });
  o.status = 'cancelled';
  saveOrders(orders);
  res.json({ ok: true });
});

// ---- Admin: shop config ----
app.get('/api/admin/shop/config', requireAuth, (_req, res) => {
  res.json(getShopConfig());
});
app.put('/api/admin/shop/config', requireAuth, (req, res) => {
  const cur = getShopConfig();
  const b = req.body || {};
  const next = { ...cur };
  if (typeof b.enabled === 'boolean') next.enabled = b.enabled;
  if (b.currency) next.currency = String(b.currency).slice(0, 8);
  if (b.payments && typeof b.payments === 'object') {
    next.payments = { ...cur.payments };
    ['usdt_trc20', 'usdt_bep20', 'm10_phone', 'm10_name', 'contact_telegram'].forEach((k) => {
      if (b.payments[k] != null) next.payments[k] = String(b.payments[k]).slice(0, 200);
    });
  }
  if (b.prices && typeof b.prices === 'object') {
    // accept full or partial price matrix; sanitize numbers
    const sanitized = {};
    for (const t of VALID_TYPES) {
      sanitized[t] = (cur.prices && cur.prices[t]) ? { ...cur.prices[t] } : {};
      const incomingType = b.prices[t];
      if (!incomingType || typeof incomingType !== 'object') continue;
      for (const tariff of VALID_TARIFFS) {
        sanitized[t][tariff] = sanitized[t][tariff] || {};
        const incomingTariff = incomingType[tariff];
        if (!incomingTariff || typeof incomingTariff !== 'object') continue;
        for (const dur of VALID_DURATIONS) {
          const cell = incomingTariff[dur];
          if (cell && typeof cell === 'object') {
            const price = Number(cell.price);
            if (Number.isFinite(price) && price >= 0) {
              const out = { price: Math.round(price * 100) / 100 };
              const old = cell.old != null ? Number(cell.old) : null;
              if (Number.isFinite(old) && old > 0) out.old = Math.round(old * 100) / 100;
              sanitized[t][tariff][dur] = out;
            }
          }
        }
      }
    }
    next.prices = sanitized;
  }
  saveShopFile(SHOP_CONFIG_FILE, next);
  res.json({ ok: true, config: next });
});

// reset prices to defaults
app.post('/api/admin/shop/config/reset-prices', requireAuth, (_req, res) => {
  const cur = getShopConfig();
  cur.prices = buildDefaultPrices();
  saveShopFile(SHOP_CONFIG_FILE, cur);
  res.json({ ok: true, prices: cur.prices });
});

// ===== 404 kernel-panic =====
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not_found' });
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => console.log(`SNI Finder on http://localhost:${PORT}`));
