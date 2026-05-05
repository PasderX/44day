// ===== 44day_ — article page =====
(() => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const id = location.pathname.split('/').pop();

  // tiny markdown renderer (subset: # / ## / ### / ``` / `code` / **bold** / *em* / [link](url) / lists / blockquote)
  function md(src) {
    if (!src) return '';
    src = src.replace(/\r\n/g, '\n');

    // fenced code
    const blocks = [];
    src = src.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      blocks.push(`<pre><code class="lang-${lang || 'txt'}">${esc(code)}</code></pre>`);
      return `\u0000B${blocks.length - 1}\u0000`;
    });

    const lines = src.split('\n');
    const out = [];
    let inList = null;
    for (let line of lines) {
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
      const r = await fetch('/api/items/' + encodeURIComponent(id));
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'http_' + r.status);
      const it = data.item;
      if (!it || it.type !== 'article') throw new Error('not_article');
      render(it);
      // bump view
      fetch(`/api/items/${encodeURIComponent(id)}/track`, { method: 'POST' }).catch(() => {});
    } catch (e) {
      document.getElementById('art-title').textContent = window.t('state.error');
      document.getElementById('art-content').innerHTML = `<p class="dim mono">${esc(e.message)}</p>`;
    }
  }

  function render(it) {
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

    // markdown content
    document.getElementById('art-content').innerHTML = md(content) || `<p class="dim">${esc(desc)}</p>`;
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
