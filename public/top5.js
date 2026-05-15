// ===== 44day_ — TOP 5 carousel for homepage =====
(() => {
  const mount = document.getElementById('top5-mount');
  if (!mount) return;

  // Curated top-5 article IDs (order matters — first is shown first)
  const FEATURED = ['art-14', 'art-11', 'art-12', 'art-16', 'art-15'];

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Tagline pool — random catchy line per slide, just for vibe
  const TAGS = ['🔥 hot', '⚡ live', '👁 trending', '💀 must-read', '🎯 top'];

  let slides = [];
  let idx = 0;
  let timer = null;
  const DELAY = 6000; // 6 sec per slide

  async function fetchOne(id) {
    try {
      const r = await fetch('/api/items/' + encodeURIComponent(id));
      const d = await r.json();
      if (!r.ok || !d.item) return null;
      return d.item;
    } catch (_) {
      return null;
    }
  }

  function field(it, key) {
    // Read translated field if i18n helper exists, else fallback
    if (window.tField) return window.tField(it, key) || it[key] || '';
    return it[key] || '';
  }

  // Safe translate: return fallback if key returns itself (missing key)
  function tt(key, fallback) {
    if (!window.t) return fallback;
    const v = window.t(key);
    return (!v || v === key) ? fallback : v;
  }
  function tagLabel()  { return tt('home.featured', 'рекомендуем'); }
  function readLabel() { return tt('btn.read', 'читать'); }

  function buildSlide(it, i) {
    const title = field(it, 'name') || it.id;
    const desc  = field(it, 'description') || '';
    const icon  = it.icon || '📄';
    const rt    = it.readingTime || '';
    const rating = it.rating || 0;
    const tag = TAGS[i % TAGS.length];
    return `
      <a class="top5-slide" href="/article/${esc(it.id)}" data-i="${i}">
        <div class="top5-bg-grid" aria-hidden="true"></div>
        <div class="top5-scan" aria-hidden="true"></div>
        <div class="top5-slide-inner">
          <div class="top5-icon">${esc(icon)}</div>
          <div class="top5-body">
            <div class="top5-meta">
              <span class="top5-tag">${esc(tag)}</span>
              ${rt ? `<span class="top5-time">⏱ ${esc(rt)}</span>` : ''}
              ${rating ? `<span class="top5-rate">★ ${rating}</span>` : ''}
            </div>
            <h3 class="top5-title">${esc(title)}</h3>
            <p class="top5-desc">${esc(desc)}</p>
            <div class="top5-cta">
              <span class="top5-cta-btn">${esc(readLabel())} <span class="top5-arrow">→</span></span>
            </div>
          </div>
        </div>
      </a>
    `;
  }

  function render() {
    if (!slides.length) {
      mount.innerHTML = '';
      return;
    }
    const dotsHtml = slides.map((_, i) =>
      `<button class="top5-dot${i === idx ? ' is-active' : ''}" data-i="${i}" aria-label="slide ${i + 1}"></button>`
    ).join('');

    mount.innerHTML = `
      <section class="top5" aria-label="featured articles">
        <div class="top5-head">
          <span class="top5-badge">▲ TOP ${slides.length}</span>
          <span class="top5-headline">${esc(tagLabel())}</span>
          <div class="top5-controls">
            <button class="top5-arrow-btn" data-dir="-1" aria-label="prev">‹</button>
            <div class="top5-dots">${dotsHtml}</div>
            <button class="top5-arrow-btn" data-dir="1" aria-label="next">›</button>
          </div>
        </div>
        <div class="top5-viewport">
          <div class="top5-track" style="transform: translateX(-${idx * 100}%)">
            ${slides.map((it, i) => buildSlide(it, i)).join('')}
          </div>
        </div>
      </section>
    `;
    wire();
  }

  function wire() {
    mount.querySelectorAll('.top5-dot').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        goTo(parseInt(b.dataset.i, 10));
        restartTimer();
      });
    });
    mount.querySelectorAll('.top5-arrow-btn').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dir = parseInt(b.dataset.dir, 10) || 1;
        goTo(idx + dir);
        restartTimer();
        if (window.snd) window.snd('hover');
      });
    });
    // Pause on hover (UX nice-to-have)
    const root = mount.querySelector('.top5');
    if (root) {
      root.addEventListener('mouseenter', stopTimer);
      root.addEventListener('mouseleave', startTimer);
    }
  }

  function goTo(i) {
    if (!slides.length) return;
    idx = ((i % slides.length) + slides.length) % slides.length;
    const track = mount.querySelector('.top5-track');
    if (track) track.style.transform = `translateX(-${idx * 100}%)`;
    mount.querySelectorAll('.top5-dot').forEach((d, j) =>
      d.classList.toggle('is-active', j === idx));
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => goTo(idx + 1), DELAY);
  }
  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function restartTimer() {
    stopTimer();
    startTimer();
  }

  async function init() {
    const results = await Promise.all(FEATURED.map(fetchOne));
    slides = results.filter(Boolean);
    if (!slides.length) {
      mount.innerHTML = '';
      return;
    }
    render();
    startTimer();
  }

  // Re-render on language change (if user toggles RU/AZ)
  window.addEventListener('lang-changed', () => {
    if (slides.length) render();
  });

  init();
})();
