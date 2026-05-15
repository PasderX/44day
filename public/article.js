// ===== 44day_ — article page =====
(() => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const id = location.pathname.split('/').pop();

  // tiny markdown renderer (subset: # / ## / ### / ``` / `code` / **bold** / *em* / [link](url) / lists / blockquote)
  // + custom blocks:  ::github user/repo | desc   ::download URL | label   ::warn text   ::tip text
  function md(src) {
    if (!src) return '';
    src = src.replace(/\r\n/g, '\n');

    const blocks = [];
    const stash = (html) => {
      blocks.push(html);
      return `\u0000B${blocks.length - 1}\u0000`;
    };

    // fenced code
    src = src.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => stash(
      `<pre class="art-code"><button class="art-code-copy" data-tip="скопировать" type="button">copy</button><code class="lang-${lang || 'txt'}">${esc(code)}</code></pre>`
    ));

    // ::github user/repo | description
    src = src.replace(/^::github\s+([\w.\-]+\/[\w.\-]+)\s*(?:\|\s*(.+))?$/gm, (_, repo, desc) => stash(
      `<a class="art-gh-card" href="https://github.com/${repo}" target="_blank" rel="noopener">` +
        `<svg class="art-gh-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.7-5.5 6 .5.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>` +
        `<div class="art-gh-body"><div class="art-gh-name">${esc(repo)}</div>` +
        `<div class="art-gh-desc">${esc(desc || 'GitHub репозиторий')}</div></div>` +
        `<span class="art-gh-arrow">→</span></a>`
    ));

    // ::download URL | label
    src = src.replace(/^::download\s+(\S+)\s*(?:\|\s*(.+))?$/gm, (_, url, label) => stash(
      `<a class="art-dl-btn" href="${url}" target="_blank" rel="noopener">⬇ ${esc(label || 'Скачать')}</a>`
    ));

    // ::warn ... / ::tip ... (single-line callout)
    src = src.replace(/^::warn\s+(.+)$/gm, (_, text) => stash(
      `<div class="art-callout warn">${esc(text)}</div>`
    ));
    src = src.replace(/^::tip\s+(.+)$/gm, (_, text) => stash(
      `<div class="art-callout tip">${esc(text)}</div>`
    ));

    // GitHub-flavor tables:
    //   | h1 | h2 |
    //   |----|----|
    //   | a  | b  |
    src = src.replace(
      /^\|(.+)\|\n\|\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|\n((?:\|.+\|\n?)+)/gm,
      (_, head, body) => {
        const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
        const ths = cells(head).map((c) => `<th>${inline(c)}</th>`).join('');
        const trs = body.trim().split('\n').map((r) => {
          const tds = cells(r).map((c) => `<td>${inline(c)}</td>`).join('');
          return `<tr>${tds}</tr>`;
        }).join('');
        return stash(`<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`);
      }
    );

    const lines = src.split('\n');
    const out = [];
    let inList = null;
    for (let line of lines) {
      // standalone block placeholder — emit as-is (don't wrap in <p>)
      if (/^\u0000B\d+\u0000$/.test(line.trim())) {
        if (inList) { out.push(`</${inList}>`); inList = null; }
        out.push(line);
        continue;
      }
      // headings
      const h = line.match(/^(#{1,3})\s+(.+)$/);
      if (h) {
        if (inList) { out.push(`</${inList}>`); inList = null; }
        out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
        continue;
      }
      // blockquote
      if (line.startsWith('> ')) {
        if (inList) { out.push(`</${inList}>`); inList = null; }
        out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
        continue;
      }
      // list
      const ul = line.match(/^[-*]\s+(.+)$/);
      const ol = line.match(/^\d+\.\s+(.+)$/);
      if (ul) {
        if (inList !== 'ul') { if (inList) out.push(`</${inList}>`); out.push('<ul>'); inList = 'ul'; }
        out.push(`<li>${inline(ul[1])}</li>`);
        continue;
      }
      if (ol) {
        if (inList !== 'ol') { if (inList) out.push(`</${inList}>`); out.push('<ol>'); inList = 'ol'; }
        out.push(`<li>${inline(ol[1])}</li>`);
        continue;
      }
      if (inList) { out.push(`</${inList}>`); inList = null; }
      // empty line
      if (!line.trim()) { out.push(''); continue; }
      // paragraph
      out.push(`<p>${inline(line)}</p>`);
    }
    if (inList) out.push(`</${inList}>`);

    let html = out.join('\n');
    // restore code blocks
    html = html.replace(/\u0000B(\d+)\u0000/g, (_, i) => blocks[+i]);
    return html;
  }
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }

  async function load() {
    try {
      const r = await fetch('/api/items/' + encodeURIComponent(id), { credentials: 'same-origin' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'http_' + r.status);
      const it = data.item;
      if (!it || it.type !== 'article') throw new Error('not_article');
      render(it, data);
      // bump view
      fetch(`/api/items/${encodeURIComponent(id)}/track`, { method: 'POST' }).catch(() => {});
    } catch (e) {
      document.getElementById('art-title').textContent = window.t('state.error');
      document.getElementById('art-content').innerHTML = `<p class="dim mono">${esc(e.message)}</p>`;
    }
  }

  function lockOverlayHtml() {
    const next = encodeURIComponent(location.pathname);
    return `
      <div class="art-lock">
        <div class="art-lock-fade"></div>
        <div class="art-lock-card">
          <div class="art-lock-icon">🔒</div>
          <h3 class="art-lock-title">это закрытая статья</h3>
          <p class="art-lock-text">
            Полный гайд, GitHub-ссылки и кнопки скачивания доступны только
            <strong>зарегистрированным пользователям</strong>. Регистрация бесплатная и занимает 20 секунд.
          </p>
          <div class="art-lock-actions">
            <a class="art-lock-btn primary" href="/register">🎁 создать аккаунт</a>
            <a class="art-lock-btn ghost" href="/login?next=${next}">войти</a>
          </div>
          <ul class="art-lock-perks">
            <li>🔓 доступ ко всем закрытым гайдам</li>
            <li>🔥 streak и достижения</li>
            <li>⭐ синк избранного между устройствами</li>
          </ul>
        </div>
      </div>`;
  }

  function render(it, data) {
    const title = window.tField(it, 'name') || it.id;
    const content = window.tField(it, 'content') || '';
    const desc = window.tField(it, 'description') || '';
    document.title = `${title} — 44day_`;
    document.getElementById('art-title').textContent = title;
    const meta = [];
    if (it.readingTime) meta.push(it.readingTime);
    if (it.createdAt) meta.push(new Date(it.createdAt).toLocaleDateString());
    if (it.category) meta.push(it.category);
    document.getElementById('art-meta').textContent = meta.join('  ·  ');

    // back link
    const back = document.getElementById('article-back');
    if (back && it.category) back.href = '/section/' + it.category;

    // markdown content (+ lock overlay if needed)
    const cont = document.getElementById('art-content');
    const baseHtml = md(content) || `<p class="dim">${esc(desc)}</p>`;
    const isLocked = data && data.locked;
    cont.classList.toggle('is-locked', !!isLocked);
    cont.innerHTML = baseHtml + (isLocked ? lockOverlayHtml() : '');

    // wire copy buttons inside <pre> code blocks
    document.querySelectorAll('.art-code-copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.parentNode.querySelector('code');
        if (!code) return;
        navigator.clipboard.writeText(code.textContent).then(() => {
          const old = btn.textContent;
          btn.textContent = '✓ ok';
          btn.classList.add('is-ok');
          if (window.snd) window.snd('pop');
          setTimeout(() => { btn.textContent = old; btn.classList.remove('is-ok'); }, 1200);
        }).catch(() => {});
      });
    });

    // likes + share
    renderActions(it);
  }

  function renderActions(it) {
    const cont = document.getElementById('art-content');
    if (!cont || cont.querySelector('.art-actions')) return;
    const url = location.href;
    const text = window.tField(it, 'name') || it.id;
    const voted = localStorage.getItem('vote:' + it.id) || '';
    const likes = it.likes || 0;
    const dislikes = it.dislikes || 0;

    const wrap = document.createElement('div');
    wrap.className = 'art-actions';
    wrap.innerHTML = `
      <div class="aa-likes">
        <button class="aa-btn aa-up ${voted === 'up' ? 'is-active' : ''}" data-vote="up" data-tip="полезно">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7"/><path d="M3 10h4v12H3z"/></svg>
          <span class="aa-count">${likes}</span>
        </button>
        <button class="aa-btn aa-down ${voted === 'down' ? 'is-active' : ''}" data-vote="down" data-tip="не помогло">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17"/><path d="M21 14h-4V2h4z"/></svg>
          <span class="aa-count">${dislikes}</span>
        </button>
      </div>
      <div class="aa-share">
        <span class="aa-label">поделиться:</span>
        <a class="aa-btn aa-tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}" data-tip="Telegram">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
        </a>
        <a class="aa-btn aa-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text + ' — ' + url)}" data-tip="WhatsApp">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/></svg>
        </a>
        <button class="aa-btn aa-copy" data-tip="скопировать ссылку">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>`;
    cont.appendChild(wrap);

    // votes
    wrap.querySelectorAll('.aa-likes button').forEach((b) => {
      b.addEventListener('click', async () => {
        const want = b.dataset.vote; // up | down
        const cur = localStorage.getItem('vote:' + it.id) || '';
        let action;
        if (cur === want) {
          action = 'unvote-' + want;
          localStorage.removeItem('vote:' + it.id);
        } else {
          if (cur) {
            // switch: undo previous, then vote new
            await fetch(`/api/items/${encodeURIComponent(it.id)}/vote`,
              { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vote: 'unvote-' + cur }) }).catch(() => {});
          }
          action = want;
          localStorage.setItem('vote:' + it.id, want);
        }
        try {
          const r = await fetch(`/api/items/${encodeURIComponent(it.id)}/vote`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vote: action }) });
          const d = await r.json();
          if (r.ok) {
            wrap.querySelector('.aa-up .aa-count').textContent = d.likes;
            wrap.querySelector('.aa-down .aa-count').textContent = d.dislikes;
            wrap.querySelector('.aa-up').classList.toggle('is-active', localStorage.getItem('vote:' + it.id) === 'up');
            wrap.querySelector('.aa-down').classList.toggle('is-active', localStorage.getItem('vote:' + it.id) === 'down');
            if (window.snd) window.snd('pop');
          }
        } catch (_) {}
      });
    });

    // copy link
    wrap.querySelector('.aa-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        if (window.toast) window.toast('ссылка скопирована');
        if (window.snd) window.snd('click');
      } catch (_) { prompt('скопируй ссылку:', url); }
    });
  }

  document.addEventListener('lang-change', load);

  // reading progress
  const prog = document.getElementById('reading-progress');
  function tick() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (prog) prog.style.width = pct + '%';
  }
  window.addEventListener('scroll', tick, { passive: true });
  tick();

  load();
})();
