// ===== 44day_ — My Setup (save & share user combo) =====
(() => {
  const KEY = '44day:setup';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }

  // ---- shared setup via URL hash ----
  function decodeFromHash() {
    const m = location.hash.match(/^#setup=(.+)$/);
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(atob(m[1]))); } catch { return null; }
  }
  function encodeToHash(d) {
    return '#setup=' + btoa(encodeURIComponent(JSON.stringify(d)));
  }

  // ---- inject trigger button into topbar ----
  function injectTrigger() {
    const ts = $('.theme-switch');
    if (!ts || $('#setup-trigger')) return;
    const btn = document.createElement('button');
    btn.id = 'setup-trigger';
    btn.className = 'theme-btn setup-btn';
    btn.setAttribute('data-tip', 'My Setup');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16z"/></svg>`;
    btn.addEventListener('click', openModal);
    ts.parentNode.insertBefore(btn, ts);
  }

  // ---- modal ----
  let modalEl = null;
  function buildModal() {
    if (modalEl) return modalEl;
    const m = document.createElement('div');
    m.id = 'setup-modal';
    m.className = 'setup-modal';
    m.innerHTML = `
      <div class="setup-card">
        <div class="setup-head">
          <span class="setup-title">★ My Setup</span>
          <button class="setup-close" data-tip="закрыть">×</button>
        </div>
        <div class="setup-body">
          <label>оператор
            <select id="su-op">
              <option value="">— не выбран —</option>
              <option value="bakcell">Bakcell</option>
              <option value="azercell">Azercell</option>
              <option value="nar">Nar</option>
            </select>
          </label>
          <label>SNI / хост
            <input id="su-sni" type="text" placeholder="example.host.com" autocomplete="off"/>
          </label>
          <label>конфиг / инжектор
            <input id="su-cfg" type="text" placeholder="bakcell-v3.ehi" autocomplete="off"/>
          </label>
          <label>заметка
            <textarea id="su-note" rows="2" placeholder="работает с утра, 30 мбит"></textarea>
          </label>
          <div class="setup-actions">
            <button class="su-btn save" id="su-save">сохранить</button>
            <button class="su-btn share" id="su-share">поделиться 🔗</button>
            <button class="su-btn reset" id="su-reset">сбросить</button>
          </div>
          <div class="setup-share-out" id="su-out" hidden></div>
        </div>
      </div>`;
    document.body.appendChild(m);
    modalEl = m;
    m.addEventListener('click', (e) => { if (e.target === m) closeModal(); });
    m.querySelector('.setup-close').addEventListener('click', closeModal);
    m.querySelector('#su-save').addEventListener('click', () => {
      const d = formGet();
      save(d);
      toast('сохранено в localStorage');
    });
    m.querySelector('#su-reset').addEventListener('click', () => {
      localStorage.removeItem(KEY);
      formSet({});
      toast('сброшено');
    });
    m.querySelector('#su-share').addEventListener('click', () => doShare(m));
    return m;
  }

  function formGet() {
    return {
      op:   $('#su-op').value,
      sni:  $('#su-sni').value.trim(),
      cfg:  $('#su-cfg').value.trim(),
      note: $('#su-note').value.trim(),
    };
  }
  function formSet(d) {
    $('#su-op').value   = d.op   || '';
    $('#su-sni').value  = d.sni  || '';
    $('#su-cfg').value  = d.cfg  || '';
    $('#su-note').value = d.note || '';
  }
  function doShare(m) {
    const d = formGet();
    if (!d.op && !d.sni && !d.cfg) { toast('заполни хоть одно поле'); return; }
    const url = location.origin + '/' + encodeToHash(d);
    const out = m.querySelector('#su-out');
    out.hidden = false;
    out.innerHTML = `
      <div class="su-out-row">
        <input type="text" value="${esc(url)}" readonly id="su-url"/>
        <button class="su-cp" data-tip="копировать">copy</button>
      </div>
      <div class="su-out-buttons">
        <a class="su-shr-btn tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Моя связка для ' + (d.op || 'интернета') + ' на 44day_')}">→ Telegram</a>
        <a class="su-shr-btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Моя связка: ' + url)}">→ WhatsApp</a>
      </div>`;
    out.querySelector('.su-cp').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); toast('ссылка скопирована'); }
      catch { out.querySelector('#su-url').select(); }
    });
  }

  function openModal() {
    const m = buildModal();
    formSet(load());
    m.classList.add('open');
    if (window.snd) window.snd('beep');
  }
  function closeModal() { if (modalEl) modalEl.classList.remove('open'); }

  function toast(msg) {
    if (window.toast) return window.toast(msg);
    const t = document.createElement('div');
    t.className = 'su-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 2200);
  }

  // ---- if URL has shared setup, show preview banner ----
  function handleSharedHash() {
    const d = decodeFromHash();
    if (!d) return;
    const banner = document.createElement('div');
    banner.className = 'shared-setup-banner';
    banner.innerHTML = `
      <div class="ssb-inner">
        <span class="ssb-tag">★ Shared Setup</span>
        <div class="ssb-grid">
          ${d.op ? `<div><span>оператор:</span> <strong>${esc(d.op)}</strong></div>` : ''}
          ${d.sni ? `<div><span>SNI:</span> <strong>${esc(d.sni)}</strong></div>` : ''}
          ${d.cfg ? `<div><span>конфиг:</span> <strong>${esc(d.cfg)}</strong></div>` : ''}
          ${d.note ? `<div class="ssb-note"><span>заметка:</span> <em>${esc(d.note)}</em></div>` : ''}
        </div>
        <div class="ssb-actions">
          <button class="ssb-import">сохранить себе</button>
          <button class="ssb-close">×</button>
        </div>
      </div>`;
    document.body.appendChild(banner);
    banner.querySelector('.ssb-import').addEventListener('click', () => {
      save(d);
      toast('сохранено как мой setup');
      banner.remove();
      history.replaceState(null, '', location.pathname);
    });
    banner.querySelector('.ssb-close').addEventListener('click', () => {
      banner.remove();
      history.replaceState(null, '', location.pathname);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { injectTrigger(); handleSharedHash(); });
  } else {
    injectTrigger(); handleSharedHash();
  }
})();
