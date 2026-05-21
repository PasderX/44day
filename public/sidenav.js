// ===== 44day_ — sidenav: HTML template + burger + drawer + active highlight =====
//
// Behavior:
//   • If page has <aside id="sidenav">  → fill it with grouped nav (used on home).
//   • Otherwise  → create a fixed drawer + burger and append to body (mobile-only nav).
//   • Burger button is visible only on mobile (CSS).
//
(() => {
  // -------- icon SVG factory (Lucide-style, currentColor) --------
  const ICONS = {
    android: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    ios:     '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/>',
    win:     '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    linux:   '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
    sni:     '<path d="m4 11 0.9 -0.9c4.7 -4.7 12.4 -4.7 17.2 0L23 11"/><path d="m7 14 0.9 -0.9c3 -3 8 -3 11 0L20 14"/><path d="m10 17 0.6 -0.6a2.5 2.5 0 0 1 3.5 0L15 17"/><path d="M12 20h.01"/>',
    cfg:     '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M14 2v6h6"/><circle cx="14" cy="15" r="2"/><path d="M14 12v1"/><path d="M14 17v1"/><path d="m18 13-1 1"/><path d="m11 16-1 1"/>',
    script:  '<polyline points="14 2 14 8 20 8"/><path d="M4 22h16a2 2 0 0 0 2 -2V8l-6 -6H6a2 2 0 0 0 -2 2v16a2 2 0 0 0 2 2z"/><path d="m9 18 -2 -2 2 -2"/><path d="m15 14 2 2 -2 2"/>',
    shield:  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    user:    '<circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/>',
    star:    '<polygon points="12 2 15 8.5 22 9.3 17 14 18.5 21 12 17.5 5.5 21 7 14 2 9.3 9 8.5 12 2"/>',
  };
  const svg = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

  const tgSvg = `
    <svg viewBox="0 0 240 240" aria-hidden="true">
      <defs>
        <linearGradient id="tgGradSn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#37bbfe"/>
          <stop offset="1" stop-color="#007dbb"/>
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="120" fill="url(#tgGradSn)"/>
      <path fill="#ffffff" d="M81 128.5l-27.5-8.6c-6-1.9-6-6 1.3-9l128.4-49.5c5-1.9 7.7 1.1 6 8.5L168.8 168c-1.5 6.6-5.4 8.2-11 5.1l-30.6-22.6-14.7 14.2c-1.6 1.6-3 3-6.1 3l2.2-31z"/>
      <path fill="#c8daea" d="M108.6 162.1l-2.2 23.8c0 0-.9 7.4 6.5 0l17.6-16.4-22-7.4z"/>
    </svg>`;

  // -------- nav structure (single source of truth) --------
  const NAV = [
    { label: 'смартфоны', items: [
      { href: '/section/android', icon: ICONS.android, label: 'Android' },
      { href: '/section/ios',     icon: ICONS.ios,     label: 'iOS' },
    ]},
    { label: 'пк', items: [
      { href: '/section/windows', icon: ICONS.win,   label: 'Windows' },
      { href: '/section/linux',   icon: ICONS.linux, label: 'Linux' },
    ]},
    { label: 'сеть', items: [
      { href: '/sni',             icon: ICONS.sni, label: 'SNI хосты' },
      { href: '/section/configs', icon: ICONS.cfg, label: 'Конфиги' },
    ]},
    { label: 'знания', items: [
      { href: '/section/scripts',  icon: ICONS.script, label: 'Скрипты' },
      { href: '/section/security', icon: ICONS.shield, label: 'Гайды' },
    ]},
  ];
  const FOOTER = [
    { href: '/profile',   icon: ICONS.user, label: 'Профиль' },
    { href: '/favorites', icon: ICONS.star, label: 'Избранное' },
  ];

  function buildInnerHTML() {
    let html = `
      <div class="sn-inner">
        <div class="sn-head">
          <span class="sn-h-prompt">44day:~$</span>
          <span> tree /</span>
        </div>`;
    NAV.forEach((g) => {
      html += `<div class="sn-group"><div class="sn-glabel">[ <span class="sn-glabel-text">${g.label}</span> ]</div>`;
      g.items.forEach((it) => {
        html += `<a class="sn-item" href="${it.href}">${svg(it.icon)}${it.label}</a>`;
      });
      html += `</div>`;
    });
    html += `<div class="sn-divider"></div>`;
    FOOTER.forEach((it) => {
      html += `<a class="sn-item" href="${it.href}">${svg(it.icon)}${it.label}</a>`;
    });
    html += `<div class="sn-divider"></div>`;
    html += `<a class="sn-item sn-item-tg" href="https://t.me/baku_root" target="_blank" rel="noopener">${tgSvg}@baku_root</a>`;
    html += `</div>`;
    return html;
  }

  // -------- ensure sidenav element + burger button --------
  let sidenav = document.getElementById('sidenav');
  let injected = false;
  if (!sidenav) {
    sidenav = document.createElement('aside');
    sidenav.id = 'sidenav';
    sidenav.className = 'sidenav sidenav-floating';
    sidenav.setAttribute('aria-label', 'навигация');
    document.body.appendChild(sidenav);
    injected = true;
  }
  sidenav.innerHTML = buildInnerHTML();

  // Ensure burger button exists in topbar
  let burger = document.getElementById('burger');
  if (!burger) {
    const bar = document.querySelector('.topbar-inner');
    if (bar) {
      burger = document.createElement('button');
      burger.id = 'burger';
      burger.className = 'burger';
      burger.setAttribute('aria-label', 'меню');
      burger.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>`;
      bar.insertBefore(burger, bar.firstChild);
    }
  }

  // -------- backdrop --------
  let backdrop = document.querySelector('.sn-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sn-backdrop';
    document.body.appendChild(backdrop);
  }

  function isMobile() { return window.innerWidth <= 720; }
  function setOpen(open) {
    sidenav.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-show', open);
    if (burger) burger.classList.toggle('is-open', open);
    document.body.style.overflow = (isMobile() && open) ? 'hidden' : '';
  }

  if (burger) burger.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!sidenav.classList.contains('is-open'));
  });
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidenav.classList.contains('is-open')) setOpen(false);
  });
  sidenav.querySelectorAll('.sn-item').forEach((a) => {
    a.addEventListener('click', () => { if (isMobile()) setOpen(false); });
  });

  // close on resize from mobile to desktop
  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (!isMobile()) setOpen(false); }, 100);
  });

  // -------- swipe-to-close --------
  let touchX = null, touchY = null, touchMoved = false;
  sidenav.addEventListener('touchstart', (e) => {
    if (!isMobile()) return;
    const t = e.touches[0]; touchX = t.clientX; touchY = t.clientY; touchMoved = false;
  }, { passive: true });
  sidenav.addEventListener('touchmove', (e) => {
    if (!isMobile() || touchX === null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchX;
    const dy = Math.abs(t.clientY - touchY);
    if (Math.abs(dx) > 12 && Math.abs(dx) > dy) touchMoved = true;
    if (touchMoved && dx < 0) sidenav.style.transform = `translateX(${Math.max(dx, -300)}px)`;
  }, { passive: true });
  sidenav.addEventListener('touchend', (e) => {
    if (!isMobile() || touchX === null) return;
    const t = (e.changedTouches && e.changedTouches[0]) || null;
    sidenav.style.transform = '';
    if (t && touchMoved && (t.clientX - touchX) < -60) setOpen(false);
    touchX = null; touchY = null; touchMoved = false;
  }, { passive: true });

  // -------- active highlight --------
  const path = location.pathname.replace(/\/+$/, '') || '/';
  let bestMatch = null, bestLen = -1;
  sidenav.querySelectorAll('.sn-item').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || /^https?:/i.test(href) || href.startsWith('#')) return;
    const cleanHref = href.replace(/\/+$/, '') || '/';
    if (path === cleanHref) {
      a.classList.add('is-active');
      bestMatch = a; bestLen = 9999;
    } else if (cleanHref !== '/' && path.startsWith(cleanHref + '/') && cleanHref.length > bestLen) {
      bestMatch = a; bestLen = cleanHref.length;
    }
  });
  if (bestMatch && bestLen < 9999) bestMatch.classList.add('is-active');
})();
