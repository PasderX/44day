// ===== 44day_ — small UX utilities =====
// (this file used to inject the "online" badge — now it's just utilities)
(() => {
  const init = () => {
    // 1) Remove any cached online badge
    const el = document.getElementById('online-badge');
    if (el) el.remove();

    // 2) Collapsible disclaimer on mobile (<=720px)
    const disc = document.querySelector('.footer-disclaimer');
    if (!disc || disc.dataset.collapsibleInit === '1') return;
    disc.dataset.collapsibleInit = '1';

    // Create toggle button (only meaningful on small screens — CSS hides on desktop)
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'disc-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="dt-label">читать полностью</span><span class="dt-arrow">▾</span>';
    btn.addEventListener('click', () => {
      const open = disc.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.querySelector('.dt-label').textContent = open ? 'свернуть' : 'читать полностью';
      btn.querySelector('.dt-arrow').textContent = open ? '▴' : '▾';
    });

    // Insert before .disc-meta (or at end if no meta)
    const meta = disc.querySelector('.disc-meta');
    if (meta) disc.insertBefore(btn, meta);
    else disc.appendChild(btn);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
/* legacy code kept below for reference only — never executed */
if (false) {
  (() => {
  if (window.__onlineLoaded) return;
  window.__onlineLoaded = true;

  // inject badge
  const badge = document.createElement('div');
  badge.id = 'online-badge';
  badge.setAttribute('data-tip', 'онлайн на сайте сейчас');
  badge.innerHTML = `
    <span class="ob-dot"></span>
    <span class="ob-stack">
      <span class="ob-num" id="ob-num">—</span>
      <span class="ob-lbl">online</span>
    </span>
    <span class="ob-spark" id="ob-spark"></span>`;
  document.body.appendChild(badge);

  const $num = badge.querySelector('#ob-num');
  const $spark = badge.querySelector('#ob-spark');
  const history = [];
  const MAX = 12;

  function pushSpark(n) {
    history.push(n);
    if (history.length > MAX) history.shift();
    const max = Math.max(2, ...history);
    $spark.innerHTML = history.map((v) => {
      const h = Math.max(3, Math.round((v / max) * 16));
      return `<i style="height:${h}px"></i>`;
    }).join('');
  }
  let es = null;

  function connect() {
    try {
      es = new EventSource('/api/online');
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (typeof d.online === 'number') {
            const prev = parseInt($num.textContent, 10);
            $num.textContent = d.online;
            badge.classList.add('pulse');
            badge.classList.toggle('up', d.online > prev);
            badge.classList.toggle('down', d.online < prev);
            setTimeout(() => badge.classList.remove('pulse', 'up', 'down'), 320);
            pushSpark(d.online);
          }
        } catch {}
      };
      es.onerror = () => {
        try { es.close(); } catch {}
        setTimeout(connect, 4000);
      };
    } catch {}
  }
  // delay so it doesn't fight with initial page loads
  setTimeout(connect, 800);
})();
} /* end if(false) — legacy disabled */
