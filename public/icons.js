// ===== 44day_ — inline SVG icon library (Lucide-style, no CDN) =====
// Полностью локально. Никаких внешних запросов.
// SVG paths источник: https://lucide.dev (ISC license)
(() => {
  const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lc-svg">';

  // ---- registry: name -> inner SVG ----
  const ICONS = {
    'shield-check':    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'smartphone':      '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    'app-window':      '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/>',
    'file-code-2':     '<path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m5 12-3 3 3 3"/><path d="m9 18 3-3-3-3"/>',
    'wrench':          '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    'folder-cog':      '<path d="M10.5 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v3"/><circle cx="18" cy="18" r="3"/><path d="M18 14.5V14"/><path d="M18 22v-.5"/><path d="M14.5 18H14"/><path d="M22 18h-.5"/><path d="M15.5 15.5l-.4-.4"/><path d="M20.9 20.9l-.4-.4"/><path d="M15.5 20.5l-.4.4"/><path d="M20.9 15.1l-.4.4"/>',
    'satellite-dish':  '<path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/>',
    'star':            '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    'user-search':     '<circle cx="10" cy="7" r="4"/><path d="M10.3 15H7a4 4 0 0 0-4 4v2"/><circle cx="17" cy="17" r="3"/><path d="m21 21-1.9-1.9"/>',
    'send':            '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    'lock':            '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'skull':           '<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/>',
    'terminal':        '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
    'music':           '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    'palette':         '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    'download':        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    'file-text':       '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>',
    'github':          '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
    'video':           '<rect width="14" height="12" x="2" y="6" rx="2"/><path d="m22 8-6 4 6 4V8z"/>',
    'globe':           '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    'key-round':       '<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
    'clapperboard':    '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    'radio-tower':     '<path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/><path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/>',
    'send-plane':      '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  };

  // ---- helpers ----
  function svg(name, size) {
    const inner = ICONS[name];
    if (!inner) return '·';
    const s = size || 18;
    return `<span class="lc-icon" style="width:${s}px;height:${s}px;display:inline-flex;align-items:center;justify-content:center">${SVG_OPEN}${inner}</svg></span>`;
  }

  // ---- mappings ----
  const CAT = {
    security: 'shield-check',
    android:  'smartphone',
    windows:  'app-window',
    scripts:  'file-code-2',
    programs: 'wrench',
    configs:  'folder-cog',
    sni:      'satellite-dish',
  };
  const SUB = {
    tunnels:  'satellite-dish',
    vpn:      'lock',
    hacking:  'skull',
    mods:     'star',
    dev:      'terminal',
    media:    'clapperboard',
    utils:    'wrench',
    azercell: 'radio-tower',
    bakcell:  'radio-tower',
    nar:      'radio-tower',
  };
  const ITEM_BY_KEYWORD = [
    [/injector|инжектор/i,           'satellite-dish'],
    [/vpn|proxy|wireguard|warp/i,    'lock'],
    [/termux|terminal/i,             'terminal'],
    [/spotify/i,                     'music'],
    [/adobe|photoshop/i,             'palette'],
    [/idm|download/i,                'download'],
    [/office|word|excel/i,           'file-text'],
    [/telegram/i,                    'send'],
    [/github/i,                      'github'],
    [/python|node|bash|script/i,     'file-code-2'],
    [/hack|crack|exploit/i,          'skull'],
    [/obs|stream|video/i,            'video'],
    [/browser|firefox|chrome/i,      'globe'],
    [/key|password|auth/i,           'key-round'],
  ];

  function forCategory(id, fallback) {
    return CAT[id] ? svg(CAT[id], 22) : (fallback || '·');
  }
  function forSub(id, fallback) {
    return SUB[id] ? svg(SUB[id], 16) : (fallback || '·');
  }
  function forItem(item) {
    if (item.iconUrl) return `<img src="${item.iconUrl}" alt="" loading="lazy" />`;
    if (item.lucide && ICONS[item.lucide]) return svg(item.lucide, 22);
    const name = (item.name || '') + ' ' + (item.id || '');
    for (const [re, lc] of ITEM_BY_KEYWORD) {
      if (re.test(name)) return svg(lc, 22);
    }
    return item.icon || '·';
  }

  // ---- replace any <i data-lucide="NAME"></i> with inline SVG ----
  function refresh(root) {
    const r = root || document;
    r.querySelectorAll('i[data-lucide]').forEach((el) => {
      const name = el.getAttribute('data-lucide');
      const inner = ICONS[name];
      if (!inner) return;
      const span = document.createElement('span');
      span.className = 'lc-icon ' + (el.className || '');
      span.style.cssText = el.getAttribute('style') || '';
      span.innerHTML = SVG_OPEN + inner + '</svg>';
      el.replaceWith(span);
    });
  }

  // первичный refresh — после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => refresh());
  } else {
    refresh();
  }

  // следим за добавлением новых [data-lucide] (динамические рендеры)
  function startObs() {
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (!m.addedNodes) continue;
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if ((n.matches && n.matches('i[data-lucide]')) ||
              (n.querySelector && n.querySelector('i[data-lucide]'))) {
            refresh(n.parentNode || document);
            break;
          }
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) startObs();
  else document.addEventListener('DOMContentLoaded', startObs);

  // expose
  window.icons = { svg, forCategory, forSub, forItem, refresh, ICONS };
})();
