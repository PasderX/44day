// ===== 44day_ — section page =====
(() => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtNum = (n) => {
    n = Number(n) || 0;
    return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
  };
  const api = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error('http_' + r.status);
    return r.json();
  };

  const catId = location.pathname.split('/').pop();
  let category = null;
  let allItems = [];
  let trending = new Set();
  let activeSub = '';
  let activeOp = (new URLSearchParams(location.search)).get('op') || '';

  // operator filter (only relevant for sni / configs)
  function renderOpFilter() {
    if (!['sni', 'configs', 'internet'].includes(catId)) return;
    let bar = document.getElementById('op-filter');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'op-filter';
      bar.className = 'op-filter';
      const grid = document.getElementById('sec-grid');
      grid.parentNode.insertBefore(bar, grid);
    }
    const ops = ['', 'bakcell', 'azercell', 'nar'];
    bar.innerHTML = ops.map((o) => {
      const lbl = o === '' ? 'все' : o;
      const cnt = o === '' ? allItems.length : allItems.filter((x) => hasOp(x, o)).length;
      return `<button class="op-chip${activeOp === o ? ' is-active' : ''}" data-op="${o}">${lbl}<span class="c-num">${cnt}</span></button>`;
    }).join('');
    bar.querySelectorAll('.op-chip').forEach((b) => {
      b.addEventListener('click', () => {
        activeOp = b.dataset.op;
        const url = new URL(location.href);
        if (activeOp) url.searchParams.set('op', activeOp); else url.searchParams.delete('op');
        history.replaceState(null, '', url.pathname + url.search);
        renderOpFilter();
        renderList();
      });
    });
  }
  function hasOp(it, op) {
    const v = it.operator;
    if (!v) return false;
    if (Array.isArray(v)) return v.map((s) => String(s).toLowerCase()).includes(op);
    return String(v).toLowerCase().split(/[,\s]+/).includes(op);
  }

  function showSkeleton() {
    const grid = document.getElementById('sec-grid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 5 }).map(() => `
      <li class="skeleton-row">
        <div class="skeleton sk-icon"></div>
        <div class="sk-lines">
          <div class="skeleton sk-line sk-w-70"></div>
          <div class="skeleton sk-line sk-w-90"></div>
          <div class="skeleton sk-line sk-w-50"></div>
        </div>
      </li>`).join('');
  }

  function detectSource(url) {
    if (!url) return null;
    if (/play\.google\.com/i.test(url)) return { cls: 'gp', label: 'Google Play' };
    if (/apps\.apple\.com/i.test(url)) return { cls: '', label: 'App Store' };
    if (/microsoft\.com/i.test(url)) return { cls: '', label: 'MS Store' };
    if (/github\.com/i.test(url)) return { cls: 'gh', label: 'GitHub' };
    if (/f-droid\.org/i.test(url)) return { cls: '', label: 'F-Droid' };
    return { cls: '', label: 'Site' };
  }

  function renderItem(it) {
    const isArticle = it.type === 'article';
    const name = window.tField(it, 'name') || it.id;
    const desc = window.tField(it, 'description') || '';
    const isFav = window.fav && window.fav.has(it.id);
    const isHot = trending.has(it.id);
    const dlCount = it.downloads || 0;
    const iconHtml = (window.icons && window.icons.forItem)
      ? window.icons.forItem(it)
      : (it.iconUrl ? `<img src="${esc(it.iconUrl)}" alt="" loading="lazy"/>` : esc(it.icon || '·'));

    const src = detectSource(it.downloadUrl);
    // GitHub/site badge — clickable
    const srcBadge = src && !isArticle && it.downloadUrl
      ? `<a class="tag-src ${src.cls}" href="${esc(it.downloadUrl)}" target="_blank" rel="noopener" data-track="${esc(it.id)}" onclick="event.stopPropagation()">${esc(src.label)}</a>`
      : '';
    const hotBadge = isHot ? `<span class="tag-hot">HOT</span>` : '';
    const statusBadge = it.status ? `<span class="tag-status ${esc(it.status)}">${esc(it.status)}</span>` : '';
    const formatBadge = it.format ? `<span class="tag-format">${esc(it.format)}</span>` : '';

    // Primary destination on name-click — article page for articles, downloadUrl for tools
    const primaryHref = isArticle
      ? `/article/${esc(it.id)}`
      : (it.downloadUrl ? esc(it.downloadUrl) : (it.modUrl ? esc(it.modUrl) : ''));
    const primaryTarget = isArticle ? '' : ' target="_blank" rel="noopener"';

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

    // Name span — clickable when there's a destination
    const nameHtml = primaryHref
      ? `<a class="i-name-link" href="${primaryHref}"${primaryTarget} data-track="${esc(it.id)}">${esc(name)}</a>`
      : `<span>${esc(name)}</span>`;

    return `
    <li class="item-row" data-id="${esc(it.id)}">
      <div class="i-icon">${iconHtml}</div>
      <div class="i-meta">
        <div class="i-name">${nameHtml}${formatBadge}${statusBadge}${hotBadge}${srcBadge}</div>
        <div class="i-desc">${esc(desc)}</div>
      </div>
      <div class="i-stat">${isArticle ? fmtNum(dlCount) : '↓ ' + fmtNum(dlCount)}</div>
      <button class="fav-btn${isFav ? ' is-on' : ''}" data-fav="${esc(it.id)}" aria-label="favorite" title="favorite">
        <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
      <div class="i-actions">${actions}</div>
    </li>`;
  }

  function applyHeader() {
    if (!category) return;
    const name = window.tField(category, 'name') || category.id;
    const desc = window.tField(category, 'description') || '';
    document.getElementById('sh-title').textContent = name;
    document.getElementById('sh-desc').textContent = desc;
    const shIcon = document.getElementById('sh-icon');
    if (window.icons && window.icons.forCategory) {
      shIcon.innerHTML = window.icons.forCategory(category.id, category.icon || '·');
      window.icons.refresh();
    } else {
      shIcon.textContent = category.icon || '·';
    }
    document.title = `${name} — 44day_`;
    if (category.color) shIcon.style.color = category.color;
  }

  function renderChips() {
    const wrap = document.getElementById('chips');
    if (!category) { wrap.innerHTML = ''; return; }
    // gather subcategories from items + category.subcategories list
    const present = new Set();
    allItems.forEach((it) => { if (it.subcategory) present.add(it.subcategory); });
    const declared = (category.subcategories || []).map((s) => typeof s === 'string' ? { id: s } : s);
    const map = new Map();
    declared.forEach((s) => map.set(s.id, s));
    present.forEach((id) => { if (!map.has(id)) map.set(id, { id }); });

    if (map.size === 0) { wrap.innerHTML = ''; return; }

    const all = `<button class="chip${activeSub === '' ? ' is-active' : ''}" data-sub=""><span data-i18n="sec.subAll">все</span><span class="c-num">${allItems.length}</span></button>`;
    const chips = Array.from(map.values()).map((s) => {
      const count = allItems.filter((it) => it.subcategory === s.id).length;
      const label = window.tField(s, 'name') || s.id;
      const isOn = activeSub === s.id;
      return `<button class="chip${isOn ? ' is-active' : ''}" data-sub="${esc(s.id)}">${esc(label)}<span class="c-num">${count}</span></button>`;
    }).join('');
    wrap.innerHTML = all + chips;
    wrap.querySelectorAll('.chip').forEach((b) => {
      b.addEventListener('click', () => {
        activeSub = b.dataset.sub;
        renderChips();
        renderList();
      });
    });
  }

  function renderList() {
    const grid = document.getElementById('sec-grid');
    const q = document.getElementById('sec-search').value.trim().toLowerCase();
    const sort = document.getElementById('sec-sort').value;

    let list = allItems.slice();
    if (activeSub) list = list.filter((x) => x.subcategory === activeSub);
    if (activeOp) list = list.filter((x) => hasOp(x, activeOp));
    if (q) {
      list = list.filter((x) =>
        ((x.name || '') + ' ' + (x.name_az || '') + ' ' + (x.description || '') + ' ' + (x.description_az || ''))
          .toLowerCase().includes(q)
      );
    }
    if (sort === 'popular') list.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    else if (sort === 'new')   list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    else if (sort === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'az')   list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    if (!list.length) {
      grid.innerHTML = `<li class="empty"><h3>${window.t('sec.empty')}</h3><p>${window.t('sec.emptyHint')}</p></li>`;
    } else {
      grid.innerHTML = list.map(renderItem).join('');
      bindActions(grid);
      if (window.icons) window.icons.refresh();
    }

    // header stats
    document.getElementById('sh-count').textContent = allItems.length;
    document.getElementById('sh-dl').textContent = fmtNum(allItems.reduce((s, x) => s + (x.downloads || 0), 0));
  }

  function bindActions(root) {
    root.querySelectorAll('a[data-track]').forEach((a) => {
      a.addEventListener('click', () => {
        if (a.dataset.article === '1') return;
        fetch(`/api/items/${encodeURIComponent(a.dataset.track)}/track`, { method: 'POST' }).catch(() => {});
      });
    });
    root.querySelectorAll('.fav-btn').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOn = window.fav.toggle(b.dataset.fav);
        b.classList.toggle('is-on', isOn);
      });
    });
  }

  async function load() {
    showSkeleton();
    try {
      const [{ categories }, { items }, trendRes] = await Promise.all([
        api('/api/site'),
        api('/api/items?category=' + encodeURIComponent(catId)),
        api('/api/trending').catch(() => ({ items: [] })),
      ]);
      trending = new Set((trendRes.items || []).slice(0, 5).map((x) => x.id));
      category = (categories || []).find((c) => c.id === catId);
      if (!category) {
        document.getElementById('sh-title').textContent = window.t('search.empty');
        document.getElementById('sh-desc').textContent = `id=${catId}`;
        document.getElementById('sec-grid').innerHTML = '';
        return;
      }
      allItems = items || [];
      // expose for cmd
      window.__hubCache = { categories: categories || [], items: allItems, trending };
      applyHeader();
      renderChips();
      renderOpFilter();
      renderList();
    } catch (e) {
      document.getElementById('sec-grid').innerHTML = `<li class="empty"><h3>${window.t('state.error')}</h3><p>${esc(e.message)}</p></li>`;
    }
  }

  document.getElementById('sec-search').addEventListener('input', renderList);
  document.getElementById('sec-sort').addEventListener('change', renderList);
  document.addEventListener('lang-change', () => { applyHeader(); renderChips(); renderList(); });

  load();
})();
