// ===== 44day_ — homepage logic =====
(() => {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtNum = (n) => {
    if (n == null) return '0';
    n = Number(n) || 0;
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  };

  const cache = { categories: [], items: [], trending: new Set(), counts: {} };

  async function api(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('http_' + r.status);
    return r.json();
  }

  async function loadAll() {
    try {
      const [site, itemsRes, trendingRes] = await Promise.all([
        api('/api/site'),
        api('/api/items'),
        api('/api/trending').catch(() => ({ items: [] })),
      ]);
      cache.categories = site.categories || [];
      cache.items = itemsRes.items || [];
      cache.trending = new Set((trendingRes.items || []).slice(0, 5).map((x) => x.id));

      // counts per category
      cache.counts = {};
      cache.items.forEach((it) => {
        cache.counts[it.category] = (cache.counts[it.category] || 0) + 1;
      });

      renderCategories();
      renderRecent();
      if (window.icons) window.icons.refresh();
    } catch (e) {
      const c = document.getElementById('cat-list');
      if (c) c.innerHTML = `<li class="empty"><h3>${window.t('state.error')}</h3><p>${esc(e.message)}</p></li>`;
    }
  }

  // ===== render =====
  function renderCategories() {
    const list = document.getElementById('cat-list');
    if (!list) return;
    if (!cache.categories.length) {
      list.innerHTML = `<li class="empty"><h3>${window.t('sec.empty')}</h3></li>`;
      return;
    }
    list.innerHTML = cache.categories.map((c) => {
      const name = window.tField(c, 'name') || c.id;
      const desc = window.tField(c, 'description') || '';
      const count = cache.counts[c.id] || 0;
      const href = c.external || `/section/${esc(c.id)}`;
      const target = c.external ? ' target="_blank" rel="noopener"' : '';
      const icon = (window.icons && window.icons.forCategory)
        ? window.icons.forCategory(c.id, esc(c.icon || '·'))
        : esc(c.icon || '·');
      return `
      <li class="cat-row" data-href="${esc(href)}"${target ? ' data-ext="1"' : ''}>
        <span class="c-icon">${icon}</span>
        <div class="c-meta">
          <div class="c-name">${esc(name)}</div>
          <div class="c-desc">${esc(desc)}</div>
        </div>
        <span class="c-count">${count}</span>
        <span class="c-arrow">→</span>
      </li>`;
    }).join('');
    list.querySelectorAll('.cat-row').forEach((row) => {
      row.addEventListener('click', () => {
        const href = row.dataset.href;
        if (row.dataset.ext) window.open(href, '_blank');
        else location.href = href;
      });
    });
  }

  function renderRecent() {
    const list = document.getElementById('recent-list');
    if (!list) return;
    const recent = cache.items
      .slice()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 8);
    if (!recent.length) {
      list.innerHTML = `<li class="empty"><h3>${window.t('sec.empty')}</h3><p>${window.t('sec.emptyHint')}</p></li>`;
      return;
    }
    list.innerHTML = recent.map(renderItemRow).join('');
    bindItemActions(list);
  }

  function detectSource(url) {
    if (!url) return null;
    if (/play\.google\.com/i.test(url)) return { cls: 'gp', label: 'Google Play' };
    if (/apps\.apple\.com/i.test(url)) return { cls: '', label: 'App Store' };
    if (/microsoft\.com/i.test(url)) return { cls: '', label: 'MS Store' };
    if (/github\.com/i.test(url)) return { cls: 'gh', label: 'GitHub' };
    if (/f-droid\.org/i.test(url)) return { cls: '', label: 'F-Droid' };
    if (/t\.me|telegram/i.test(url)) return { cls: '', label: 'Telegram' };
    return { cls: '', label: 'Site' };
  }

  function renderItemRow(it) {
    const isArticle = it.type === 'article';
    const name = window.tField(it, 'name') || it.id;
    const desc = window.tField(it, 'description') || '';
    const isFav = window.fav && window.fav.has(it.id);
    const isHot = cache.trending.has(it.id);
    const dlCount = it.downloads || 0;

    // icon: image url, lucide name, keyword-detected lucide, or emoji
    const iconHtml = (window.icons && window.icons.forItem)
      ? window.icons.forItem(it)
      : (it.iconUrl ? `<img src="${esc(it.iconUrl)}" alt="" loading="lazy"/>` : esc(it.icon || '·'));

    // source badge
    const src = detectSource(it.downloadUrl);
    const srcBadge = src && !isArticle
      ? `<span class="tag-src ${src.cls}">${esc(src.label)}</span>`
      : '';
    const hotBadge = isHot ? `<span class="tag-hot">HOT</span>` : '';

    // actions
    let actions = '';
    if (isArticle) {
      actions = `<a class="dl-btn primary" href="/article/${esc(it.id)}" data-track="${esc(it.id)}" data-article="1">${window.t('btn.read')}</a>`;
    } else {
      const orig = it.downloadUrl
        ? `<a class="dl-btn primary" href="${esc(it.downloadUrl)}" target="_blank" rel="noopener" data-track="${esc(it.id)}">${window.t('btn.original')}</a>`
        : '';
      const mod = it.modUrl
        ? `<a class="dl-btn mod" href="${esc(it.modUrl)}" target="_blank" rel="noopener" data-track="${esc(it.id)}">${window.t('btn.mod')}</a>`
        : '';
      actions = orig + mod;
    }

    const stat = isArticle
      ? `${fmtNum(dlCount)} ${window.t('art.readTime') ? '' : ''}`.trim() || `${fmtNum(dlCount)}`
      : `↓ ${fmtNum(dlCount)}`;

    return `
    <li class="item-row" data-id="${esc(it.id)}">
      <div class="i-icon">${iconHtml}</div>
      <div class="i-meta">
        <div class="i-name">
          <span>${esc(name)}</span>
          ${hotBadge}
          ${srcBadge}
        </div>
        <div class="i-desc">${esc(desc)}</div>
      </div>
      <div class="i-stat">${stat}</div>
      <button class="fav-btn${isFav ? ' is-on' : ''}" data-fav="${esc(it.id)}" aria-label="favorite" title="favorite">
        <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
      <div class="i-actions">${actions}</div>
    </li>`;
  }

  function bindItemActions(root) {
    // download tracking
    root.querySelectorAll('a[data-track]').forEach((a) => {
      a.addEventListener('click', () => {
        if (a.dataset.article === '1') return;
        const id = a.dataset.track;
        fetch(`/api/items/${encodeURIComponent(id)}/track`, { method: 'POST' }).catch(() => {});
      });
    });
    // favorites
    root.querySelectorAll('.fav-btn').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOn = window.fav.toggle(b.dataset.fav);
        b.classList.toggle('is-on', isOn);
      });
    });
  }

  // ===== bootstrap =====
  document.addEventListener('lang-change', () => {
    renderCategories();
    renderRecent();
  });
  loadAll();

  // expose for cmd palette
  window.__hubCache = cache;
  window.__hubRender = { renderItemRow, bindItemActions };
})();
