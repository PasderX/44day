// ===== 44day_ — command palette (Ctrl+K / `) =====
(() => {
  const overlay = document.createElement('div');
  overlay.id = 'cmd-overlay';
  overlay.innerHTML = `
    <div class="cmd-box" role="dialog" aria-label="command palette">
      <input id="cmd-input" class="cmd-input" autocomplete="off" spellcheck="false" placeholder="type a command or search..."/>
      <div id="cmd-list" class="cmd-list"></div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#cmd-input');
  const list = overlay.querySelector('#cmd-list');
  let selIdx = 0;
  let currentItems = [];

  // ---------- static commands ----------
  const COMMANDS = () => [
    { type: 'cmd', icon: '~',  label: 'home',         action: () => (location.href = '/') },
    { type: 'cmd', icon: '⛭',  label: 'tools',        action: () => (location.href = '/tools') },
    { type: 'cmd', icon: '★',  label: 'favorites',    action: () => (location.href = '/favorites') },
    { type: 'cmd', icon: '#',  label: 'whoami',       action: () => (location.href = '/whoami') },
    { type: 'cmd', icon: '$',  label: 'admin',        action: () => (location.href = '/admin') },
    { type: 'cmd', icon: '☾',  label: 'theme: dark',  action: () => setTheme('dark') },
    { type: 'cmd', icon: '☼',  label: 'theme: light', action: () => setTheme('light') },
    { type: 'cmd', icon: '¶',  label: 'lang: ru',     action: () => window.setLang && window.setLang('ru') },
    { type: 'cmd', icon: '¶',  label: 'lang: az',     action: () => window.setLang && window.setLang('az') },
    { type: 'cmd', icon: '⤴',  label: 'random pick',  action: pickRandom },
    { type: 'cmd', icon: '?',  label: 'help',         action: () => alert('Ctrl+K — palette · ` — same · / — focus search') },
  ];

  function setTheme(t) {
    if (t === 'dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('44day-theme', t);
    document.querySelectorAll('.theme-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.theme === t));
  }
  function pickRandom() {
    const items = (window.__hubCache && window.__hubCache.items) || [];
    if (!items.length) return;
    const it = items[Math.floor(Math.random() * items.length)];
    if (it.type === 'article') location.href = '/article/' + it.id;
    else if (it.downloadUrl) window.open(it.downloadUrl, '_blank');
  }

  // ---------- search items + categories ----------
  function searchItems(q) {
    const cache = window.__hubCache;
    if (!cache) return [];
    const Q = q.trim().toLowerCase();
    if (!Q) return [];
    const out = [];
    cache.categories.forEach((c) => {
      const name = (c.name || '') + ' ' + (c.name_az || '') + ' ' + c.id;
      if (name.toLowerCase().includes(Q)) {
        out.push({
          type: 'cat',
          icon: c.icon || '·',
          label: c.name || c.id,
          hint: 'category',
          action: () => (location.href = '/section/' + c.id),
        });
      }
    });
    cache.items.forEach((it) => {
      const name = (it.name || '') + ' ' + (it.name_az || '') + ' ' + (it.id || '');
      if (name.toLowerCase().includes(Q)) {
        out.push({
          type: 'item',
          icon: it.icon || '·',
          label: it.name || it.id,
          hint: it.type === 'article' ? 'article' : 'app',
          action: () => {
            if (it.type === 'article') location.href = '/article/' + it.id;
            else if (it.downloadUrl) window.open(it.downloadUrl, '_blank');
          },
        });
      }
    });
    return out.slice(0, 20);
  }

  // ---------- render ----------
  function render() {
    const q = input.value.trim();
    let items;
    if (!q) {
      items = COMMANDS();
    } else {
      const filtered = COMMANDS().filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));
      items = [...filtered, ...searchItems(q)];
    }
    currentItems = items;
    if (!items.length) {
      list.innerHTML = `<div class="cmd-empty">${(window.t && window.t('search.empty')) || 'no results'}</div>`;
      return;
    }
    if (selIdx >= items.length) selIdx = 0;
    list.innerHTML = items.map((c, i) => `
      <div class="cmd-item ${i === selIdx ? 'is-sel' : ''}" data-i="${i}">
        <span class="cmd-key" style="width:14px;text-align:center">${c.icon}</span>
        <span style="flex:1">${escapeHtml(c.label)}</span>
        ${c.hint ? `<span class="cmd-key">${c.hint}</span>` : ''}
      </div>`).join('');
    list.querySelectorAll('.cmd-item').forEach((el) => {
      el.addEventListener('click', () => activate(parseInt(el.dataset.i, 10)));
      el.addEventListener('mouseenter', () => {
        selIdx = parseInt(el.dataset.i, 10);
        updateSel();
      });
    });
  }
  function updateSel() {
    list.querySelectorAll('.cmd-item').forEach((el, i) => el.classList.toggle('is-sel', i === selIdx));
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function activate(i) {
    const it = currentItems[i];
    if (!it) return;
    close();
    setTimeout(() => it.action(), 30);
  }

  // ---------- open/close ----------
  function open() {
    overlay.classList.add('open');
    input.value = '';
    selIdx = 0;
    render();
    setTimeout(() => input.focus(), 20);
  }
  function close() {
    overlay.classList.remove('open');
  }

  // ---------- events ----------
  document.addEventListener('keydown', (e) => {
    // open
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      open();
      return;
    }
    if (e.key === '`' && !overlay.classList.contains('open') && !isInInput(e.target)) {
      e.preventDefault();
      open();
      return;
    }
    if (!overlay.classList.contains('open')) return;
    // navigate
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); selIdx = Math.min(selIdx + 1, currentItems.length - 1); updateSel(); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); selIdx = Math.max(selIdx - 1, 0); updateSel(); }
    else if (e.key === 'Enter')      { e.preventDefault(); activate(selIdx); }
  });
  function isInInput(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  input.addEventListener('input', () => { selIdx = 0; render(); });

  window.openCmd = open;
  window.closeCmd = close;
})();
