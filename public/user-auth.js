// ===== 44day_ — user auth client + header user-pill =====
// Exposes window.userAuth = { me, login, register, logout, isLoggedIn() }
// Also injects a user pill into .topbar-inner

(() => {
  const state = { user: null, loaded: false };
  const listeners = new Set();

  function emit() {
    listeners.forEach((fn) => { try { fn(state.user); } catch (_) {} });
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error((data && data.message) || (data && data.error) || ('http_' + res.status));
      err.code = data && data.error;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function loadMe() {
    try {
      const r = await api('/api/auth/me');
      state.user = r.user || null;
    } catch (_) {
      state.user = null;
    }
    state.loaded = true;
    emit();
    renderPill();
    return state.user;
  }

  async function login(loginField, password) {
    const r = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: loginField, password }),
    });
    state.user = r.user;
    state.loaded = true;
    emit();
    renderPill();
    return r.user;
  }

  async function register(username, email, password) {
    const r = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    state.user = r.user;
    state.loaded = true;
    emit();
    renderPill();
    return r.user;
  }

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) {}
    state.user = null;
    emit();
    renderPill();
  }

  function isLoggedIn() { return !!state.user; }
  function user() { return state.user; }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  // ---------- header pill UI ----------
  function ensureStyles() {
    if (document.getElementById('user-auth-styles')) return;
    const s = document.createElement('style');
    s.id = 'user-auth-styles';
    s.textContent = `
      .user-pill { position: relative; display: inline-flex; align-items: center; gap: 6px; }
      .user-pill .up-btn {
        display: inline-flex; align-items: center; gap: 8px;
        height: 30px; padding: 0 11px;
        background: var(--bg-elev); color: var(--text);
        border: 1px solid var(--border); border-radius: var(--radius);
        font-family: var(--font-mono); font-size: 12px; font-weight: 600;
        cursor: pointer; text-decoration: none;
        transition: all .15s;
      }
      .user-pill .up-btn:hover { border-color: var(--acc); color: var(--acc); }
      .user-pill .up-avatar {
        width: 20px; height: 20px;
        background: linear-gradient(135deg, var(--acc), var(--acc-bright));
        color: #000; border-radius: 50%;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 800;
      }
      .user-pill .up-login {
        display: inline-flex; align-items: center; gap: 6px;
        height: 30px; padding: 0 11px;
        background: var(--acc); color: #000;
        border: 0; border-radius: var(--radius);
        font-family: var(--font-mono); font-size: 12px; font-weight: 700;
        cursor: pointer; text-decoration: none;
        transition: all .15s;
        letter-spacing: 0.3px;
      }
      .user-pill .up-login:hover { background: var(--acc-bright); transform: translateY(-1px); }
      .user-pill .up-menu {
        position: absolute; top: 38px; right: 0;
        min-width: 200px;
        background: var(--bg-elev);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        box-shadow: 0 8px 28px rgba(0,0,0,0.45);
        padding: 6px;
        display: none;
        z-index: 100;
        font-family: var(--font-mono);
      }
      .user-pill.is-open .up-menu { display: block; }
      .up-menu .up-mhead {
        padding: 10px 12px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 4px;
      }
      .up-menu .up-mname { color: var(--acc); font-weight: 700; font-size: 13px; }
      .up-menu .up-memail { color: var(--muted); font-size: 11px; margin-top: 2px; }
      .up-menu .up-mstreak {
        display: inline-flex; align-items: center; gap: 4px;
        color: var(--acc-bright); font-size: 11px; margin-top: 4px;
      }
      .up-menu a, .up-menu button {
        display: flex; align-items: center; gap: 8px;
        width: 100%;
        background: transparent; border: 0; color: var(--text);
        padding: 8px 12px; text-align: left;
        font-family: var(--font-mono); font-size: 12.5px;
        cursor: pointer; border-radius: 6px;
        text-decoration: none;
        transition: background .12s, color .12s;
      }
      .up-menu a:hover, .up-menu button:hover { background: var(--panel); color: var(--acc); }
      .up-menu .up-logout { color: #ff8888; }
      .up-menu .up-logout:hover { color: #ff5555; background: rgba(255,80,80,0.08); }
      @media (max-width: 720px) {
        .user-pill .up-login span.up-login-text { display: none; }
        .user-pill .up-btn .up-name { display: none; }
      }
    `;
    document.head.appendChild(s);
  }

  function renderPill() {
    ensureStyles();
    // find existing host or create
    let host = document.getElementById('user-pill-host');
    if (!host) {
      // Inject right before the existing profile icon (if any), else append to topbar-inner
      const bar = document.querySelector('.topbar-inner');
      if (!bar) return;
      host = document.createElement('div');
      host.id = 'user-pill-host';
      host.className = 'user-pill';
      // Try to insert before the last child (the profile/burger button), else append
      bar.appendChild(host);
    }

    if (!state.user) {
      host.classList.remove('is-open');
      host.innerHTML = `
        <a href="/login" class="up-login" title="войти">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
            <path d="M10 17l5-5-5-5v3H3v4h7v3zm10-15H12a2 2 0 0 0-2 2v3h2V4h8v16h-8v-3h-2v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
          </svg>
          <span class="up-login-text">войти</span>
        </a>
      `;
      return;
    }

    const u = state.user;
    const initial = (u.avatar || u.username || 'u').slice(0, 1).toUpperCase();
    host.innerHTML = `
      <button class="up-btn" type="button" aria-haspopup="true">
        <span class="up-avatar">${escapeHtml(u.avatar || initial)}</span>
        <span class="up-name">${escapeHtml(u.username)}</span>
      </button>
      <div class="up-menu" role="menu">
        <div class="up-mhead">
          <div class="up-mname">@${escapeHtml(u.username)}</div>
          <div class="up-memail">${escapeHtml(u.email || '')}</div>
          ${u.streak ? `<div class="up-mstreak">🔥 streak: ${u.streak}</div>` : ''}
        </div>
        <a href="/profile">👤 профиль</a>
        <a href="/favorites">⭐ избранное</a>
        ${u.role === 'admin' ? `<a href="/admin">🛠 админка</a>` : ''}
        <button class="up-logout" type="button">⏻ выйти</button>
      </div>
    `;
    const btn = host.querySelector('.up-btn');
    const menu = host.querySelector('.up-menu');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      host.classList.toggle('is-open');
    });
    host.querySelector('.up-logout').addEventListener('click', async () => {
      await logout();
      location.reload();
    });
    document.addEventListener('click', (e) => {
      if (!host.contains(e.target)) host.classList.remove('is-open');
    }, { passive: true });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
      (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // Bootstrap
  window.userAuth = { me: () => state.user, isLoggedIn, login, register, logout, loadMe, onChange, user };

  // run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMe);
  } else {
    loadMe();
  }
})();
