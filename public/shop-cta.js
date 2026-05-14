// ===== 44day_ — Shop CTA: marquee banner + topbar buy button =====
(() => {
  if (window.__shopCtaInjected) return;
  window.__shopCtaInjected = true;

  const path = location.pathname;
  // don't show CTAs on the shop page itself or admin
  const HIDE = path.startsWith('/shop') || path.startsWith('/admin');

  // Self-contained CSS so the marquee renders correctly on every page,
  // regardless of which stylesheet (hub.css / styles.css) is loaded.
  const CSS = `
    .shop-marquee{display:block;position:relative;background:linear-gradient(90deg,rgba(0,255,136,.05) 0%,rgba(0,255,136,.12) 50%,rgba(0,255,136,.05) 100%);border-bottom:1px solid rgba(0,255,136,.25);overflow:hidden;white-space:nowrap;cursor:pointer;height:32px;line-height:32px;transition:background .25s}
    .shop-marquee,.shop-marquee *{text-decoration:none!important}
    .shop-marquee::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0,transparent 20px,rgba(0,255,136,.03) 20px,rgba(0,255,136,.03) 40px);pointer-events:none}
    .shop-marquee:hover{background:linear-gradient(90deg,rgba(0,255,136,.10) 0%,rgba(0,255,136,.22) 50%,rgba(0,255,136,.10) 100%)}
    .shop-mq-track{display:inline-block;white-space:nowrap;animation:shop-mq-scroll 38s linear infinite;padding-left:100%;will-change:transform}
    .shop-marquee:hover .shop-mq-track{animation-play-state:paused}
    .shop-mq-item{display:inline-flex;align-items:center;gap:6px;vertical-align:middle;padding:0 14px;color:#00ff88;font-family:"JetBrains Mono","Fira Code",ui-monospace,monospace;font-size:11px;font-weight:600;letter-spacing:.4px;text-shadow:0 0 4px rgba(0,255,136,.35);white-space:nowrap}
    .shop-mq-sep{display:inline-block;padding:0 6px;color:rgba(0,255,136,.35);font-size:13px;vertical-align:middle}
    .shop-mq-logo{height:22px;width:auto;display:inline-block;vertical-align:middle;object-fit:contain;background:#fff;border-radius:5px;padding:2px 4px;box-shadow:0 0 6px rgba(0,255,136,.25);margin:0 2px}
    :root[data-theme="light"] .shop-mq-logo{background:#0a0a0a;box-shadow:0 0 6px rgba(19,138,61,.35)}
    .shop-mq-ops{display:inline-flex;align-items:center;gap:8px;padding:0 14px}
    .shop-mq-ops-label{color:rgba(255,255,255,.55);font-size:10px;font-weight:500;letter-spacing:1px;text-transform:uppercase}
    :root[data-theme="light"] .shop-mq-ops-label{color:rgba(0,0,0,.55)}
    @keyframes shop-mq-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    :root[data-theme="light"] .shop-marquee{background:linear-gradient(90deg,rgba(19,138,61,.10) 0%,rgba(19,138,61,.22) 50%,rgba(19,138,61,.10) 100%);border-bottom-color:rgba(19,138,61,.5)}
    :root[data-theme="light"] .shop-mq-item{color:#0a6b30;text-shadow:0 0 6px rgba(19,138,61,.3)}
    @media (max-width:560px){.shop-mq-item{font-size:10px}}
  `;

  function injectCSS() {
    if (document.getElementById('shop-cta-css')) return;
    const s = document.createElement('style');
    s.id = 'shop-cta-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function inject() {
    if (HIDE) return;
    injectCSS();

    // ---- 1) Marquee banner above topbar ----
    const topbar = document.querySelector('header.topbar') || document.querySelector('.topbar');
    if (topbar && !document.getElementById('shop-marquee')) {
      const m = document.createElement('a');
      m.id = 'shop-marquee';
      m.href = '/shop';
      m.className = 'shop-marquee';
      m.setAttribute('aria-label', 'купи хосты');
      m.innerHTML = `
        <div class="shop-mq-track">
          ${Array.from({ length: 2 }).map(() => `
            <span class="shop-mq-item">🔥 КУПИ РАБОЧИЙ SNI ХОСТ</span>
            <span class="shop-mq-sep">·</span>
            <span class="shop-mq-item">⚡ ГОТОВЫЕ КОНФИГИ ДЛЯ HTTP INJECTOR / DARK TUNNEL</span>
            <span class="shop-mq-sep">·</span>
            <span class="shop-mq-ops">
              <span class="shop-mq-ops-label">📡 операторы:</span>
              <img class="shop-mq-logo" src="/img/operators/bakcell.png" alt="Bakcell" loading="lazy"/>
              <img class="shop-mq-logo" src="/img/operators/azercell.png" alt="Azercell" loading="lazy"/>
              <img class="shop-mq-logo" src="/img/operators/nar.png" alt="Nar" loading="lazy"/>
            </span>
            <span class="shop-mq-sep">·</span>
            <span class="shop-mq-item">💎 ОПЛАТА USDT / m10</span>
            <span class="shop-mq-sep">·</span>
            <span class="shop-mq-item">🛡 ГАРАНТИЯ ЗАМЕНЫ</span>
            <span class="shop-mq-sep">·</span>
          `).join('')}
        </div>`;
      topbar.parentNode.insertBefore(m, topbar);
    }

    // ---- 2) Topbar CTA button ----
    const inner = document.querySelector('.topbar-inner');
    const searchTrigger = document.getElementById('search-trigger');
    if (inner && !document.getElementById('shop-cta-btn')) {
      const btn = document.createElement('a');
      btn.id = 'shop-cta-btn';
      btn.href = '/shop';
      btn.className = 'shop-cta-btn';
      btn.setAttribute('data-tip', 'магазин SNI / конфигов');
      btn.innerHTML = `
        <span class="shop-cta-glow"></span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <span class="shop-cta-text">КУПИ ХОСТЫ</span>
        <span class="shop-cta-pulse"></span>`;
      // insert before search-trigger if exists, else as last child
      if (searchTrigger && searchTrigger.parentNode === inner) {
        inner.insertBefore(btn, searchTrigger);
      } else {
        const spacer = inner.querySelector('.topbar-spacer');
        if (spacer) inner.insertBefore(btn, spacer.nextSibling);
        else inner.appendChild(btn);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
