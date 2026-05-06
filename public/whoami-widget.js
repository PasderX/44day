// ===== 44day_ — "whoami" widget (E feature: detect user's ISP) =====
(() => {
  if (window.__whoamiLoaded) return;
  window.__whoamiLoaded = true;

  const PROVIDER_META = {
    azercell: { name: 'Azercell',  color: '#fbbf24', emoji: '🟡', section: '/section/configs?p=azercell' },
    bakcell:  { name: 'Bakcell',   color: '#60a5fa', emoji: '🔵', section: '/section/configs?p=bakcell'  },
    nar:      { name: 'Nar',       color: '#a78bfa', emoji: '🟣', section: '/section/configs?p=nar'      },
    aztelekom:{ name: 'Aztelekom', color: '#f472b6', emoji: '🟣', section: '/section/configs?p=aztelekom'},
    local:    { name: 'localhost', color: '#7ee787', emoji: '🏠', section: '/'                            },
  };

  function mount() {
    const target = document.getElementById('whoami-mount');
    if (!target) return;

    const compact = target.dataset.compact === '1' || target.classList.contains('compact');
    const el = document.createElement('div');
    el.className = 'wa-widget loading' + (compact ? ' compact' : '');
    el.innerHTML = `
      <div class="wa-bar">
        <span class="wa-dots"><i></i><i></i><i></i></span>
        <span class="wa-title">guest@44day:~$ whoami</span>
      </div>
      <div class="wa-body">
        <div class="wa-line"><span class="wa-k">resolving...</span></div>
      </div>`;
    target.appendChild(el);

    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => render(el, d))
      .catch(() => fail(el));
  }

  function render(el, d) {
    el.classList.remove('loading');
    if (d.error) return fail(el);

    const isCompact = el.classList.contains('compact');
    const meta = PROVIDER_META[d.provider] || null;
    const providerLine = meta
      ? `<span class="wa-prov" style="color:${meta.color}">${meta.emoji} ${meta.name}</span>`
      : `<span class="wa-prov dim">unknown</span>`;

    // в компактном виде — короче, без ip/asn
    const lines = isCompact
      ? `
        <div class="wa-line"><span class="wa-k">isp</span><span class="wa-v">${esc(d.isp || '—')}</span></div>
        <div class="wa-line"><span class="wa-k">geo</span><span class="wa-v">${esc(d.flag)} ${esc(d.city || '—')}</span></div>
        <div class="wa-line"><span class="wa-k">net</span><span class="wa-v">${providerLine}</span></div>`
      : `
        <div class="wa-line"><span class="wa-k">ip</span><span class="wa-v mono">${esc(d.ip)}</span></div>
        <div class="wa-line"><span class="wa-k">isp</span><span class="wa-v">${esc(d.isp || '—')}</span></div>
        <div class="wa-line"><span class="wa-k">geo</span><span class="wa-v">${esc(d.flag)} ${esc(d.city || '—')}, ${esc(d.country || '—')}</span></div>
        <div class="wa-line"><span class="wa-k">asn</span><span class="wa-v mono dim">${esc(d.asn || '—')}</span></div>
        <div class="wa-line"><span class="wa-k">match</span><span class="wa-v">${providerLine}</span></div>`;

    const actions = meta && d.provider !== 'local'
      ? `<div class="wa-actions">
           <a class="wa-btn primary" href="${meta.section}" data-tip="конфиги ${meta.name}">⚡ ${meta.name}</a>
           <a class="wa-btn" href="/sni" data-tip="SNI хосты">🛰 sni</a>
           <a class="wa-btn" href="/section/android" data-tip="приложения">📦 apps</a>
         </div>`
      : `<div class="wa-actions">
           <a class="wa-btn" href="/section/configs">📦 конфиги</a>
           <a class="wa-btn" href="/sni">🛰 SNI</a>
         </div>`;

    el.innerHTML = `
      <div class="wa-bar">
        <span class="wa-dots"><i></i><i></i><i></i></span>
        <span class="wa-title">whoami</span>
      </div>
      <div class="wa-body">${lines}${actions}</div>
    `;
  }

  function fail(el) {
    el.classList.remove('loading');
    el.innerHTML = `
      <div class="wa-bar">
        <span class="wa-dots"><i></i><i></i><i></i></span>
        <span class="wa-title">guest@44day:~$ whoami</span>
      </div>
      <div class="wa-body">
        <div class="wa-line"><span class="wa-k">err</span><span class="wa-v" style="color:#ff6e6e">lookup failed (try later)</span></div>
      </div>`;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // expose for sudo
  window.fetchMe = () => fetch('/api/me', { cache: 'no-store' }).then((r) => r.json());

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
