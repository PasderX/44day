// ===== 44day_ — Admin: Shop management =====
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TYPE_LABELS = {
    sni: 'SNI хост',
    http_injector: 'HTTP Injector',
    dark_tunnel: 'Dark Tunnel',
    ha_tunnel: 'HA Tunnel',
  };
  const TARIFF_LABELS = {
    zero: '0 баланс',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
  };
  const OP_LABELS = { bakcell: 'Bakcell', azercell: 'Azercell', nar: 'Nar' };
  const DURATION_LABELS = { '1d': '1 день', '7d': '1 неделя', '30d': '1 месяц' };
  const STATUS_LABEL = {
    pending_payment: { txt: 'ожидает оплаты', cls: 'pending' },
    paid_pending_review: { txt: 'нужна проверка ⚠', cls: 'review' },
    delivered: { txt: 'доставлено ✓', cls: 'done' },
    cancelled: { txt: 'отменён', cls: 'cancelled' },
  };

  const TYPES = ['sni', 'http_injector', 'dark_tunnel', 'ha_tunnel'];
  const TARIFFS = ['zero', 'whatsapp', 'telegram', 'facebook', 'instagram', 'tiktok'];
  const DURATIONS = ['1d', '7d', '30d'];

  function toast(msg, kind) {
    const stack = $('#toast-stack') || document.body;
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '') + ' show';
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
  }
  async function api(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(url, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || ('http_' + r.status));
    return data;
  }

  let cfgCache = null;
  let productsCache = [];
  let ordersCache = [];

  // ---------- sub-tabs ----------
  function bindSubTabs() {
    $$('.shop-subtab').forEach((b) => {
      b.addEventListener('click', () => {
        const tab = b.dataset.shopTab;
        $$('.shop-subtab').forEach((x) => x.classList.toggle('active', x === b));
        $$('.shop-subpanel').forEach((p) => p.classList.toggle('active', p.dataset.shopPanel === tab));
        if (tab === 'orders') loadOrders();
        else if (tab === 'products') loadProducts();
        else if (tab === 'prices') renderPrices();
        else if (tab === 'payments') renderPayments();
      });
    });
  }

  // ---------- enabled toggle ----------
  async function loadConfig() {
    cfgCache = await api('GET', '/api/admin/shop/config');
    renderEnabled();
  }
  function renderEnabled() {
    const pill = $('#shop-enabled-pill');
    if (!pill) return;
    pill.textContent = cfgCache?.enabled ? '🟢 включён' : '🔴 выключен';
    pill.className = 'shop-enabled-pill ' + (cfgCache?.enabled ? 'on' : 'off');
  }
  async function toggleEnabled() {
    if (!cfgCache) return;
    const next = !cfgCache.enabled;
    await api('PUT', '/api/admin/shop/config', { enabled: next });
    cfgCache.enabled = next;
    renderEnabled();
    toast('магазин ' + (next ? 'включён' : 'выключен'));
  }

  // ---------- ORDERS ----------
  async function loadOrders() {
    try {
      const { orders } = await api('GET', '/api/admin/shop/orders');
      ordersCache = orders.sort((a, b) => b.createdAt - a.createdAt);
      $('#ord-count').textContent = ordersCache.filter((o) => o.status === 'paid_pending_review').length || '';
      renderOrdersList();
    } catch (e) { $('#orders-list').textContent = 'ошибка: ' + e.message; }
  }
  function renderOrdersList() {
    const list = $('#orders-list');
    if (!ordersCache.length) {
      list.innerHTML = '<div class="muted">заказов пока нет</div>';
      return;
    }
    list.innerHTML = ordersCache.map(orderCard).join('');
    // bind action buttons
    list.querySelectorAll('[data-deliver]').forEach((b) => {
      b.addEventListener('click', () => openDeliverModal(b.dataset.deliver));
    });
    list.querySelectorAll('[data-cancel]').forEach((b) => {
      b.addEventListener('click', async () => {
        if (!confirm('точно отменить?')) return;
        try {
          await api('POST', `/api/admin/shop/orders/${encodeURIComponent(b.dataset.cancel)}/cancel`, {});
          toast('отменён');
          loadOrders();
        } catch (e) { toast('ошибка: ' + e.message, 'err'); }
      });
    });
  }
  function orderCard(o) {
    const st = STATUS_LABEL[o.status] || { txt: o.status, cls: '' };
    const date = new Date(o.createdAt).toLocaleString('ru');
    const linkUser = `/shop/order/${o.id}?key=${o.accessKey}`;
    let actions = '';
    if (o.status === 'paid_pending_review') {
      actions += `<button class="btn-primary sm" data-deliver="${esc(o.id)}">✓ доставить</button>`;
      actions += `<button class="btn-ghost sm" data-cancel="${esc(o.id)}">отменить</button>`;
    } else if (o.status === 'pending_payment') {
      actions += `<button class="btn-ghost sm" data-cancel="${esc(o.id)}">отменить</button>`;
    }
    return `
    <div class="order-card status-${st.cls}">
      <div class="oc-head">
        <div class="oc-title">
          <code>${esc(o.id)}</code>
          <span class="oc-status">${st.txt}</span>
        </div>
        <div class="oc-date">${date}</div>
      </div>
      <div class="oc-grid">
        <div><span>оператор</span><b>${OP_LABELS[o.operator] || o.operator}</b></div>
        <div><span>тип</span><b>${TYPE_LABELS[o.type] || o.type}</b></div>
        <div><span>тариф</span><b>${TARIFF_LABELS[o.tariff] || o.tariff}</b></div>
        <div><span>срок</span><b>${DURATION_LABELS[o.duration] || o.duration}</b></div>
        <div><span>оплата</span><b>${o.paymentMethod === 'usdt' ? 'USDT' : 'm10'}</b></div>
        <div><span>сумма</span><b>${o.price} ${o.currency}</b></div>
        <div><span>контакт</span><b>${esc(o.contact)}</b></div>
        <div><span>ссылка покупателя</span><b><a href="${esc(linkUser)}" target="_blank">открыть</a></b></div>
      </div>
      ${o.paymentNote ? `<div class="oc-note"><b>заметка от покупателя:</b><br/>${esc(o.paymentNote)}</div>` : ''}
      ${o.delivered ? `<div class="oc-delivered"><b>доставлено:</b> ${esc(o.delivered.title || '')}</div>` : ''}
      <div class="oc-actions">${actions}</div>
    </div>`;
  }

  function openDeliverModal(orderId) {
    const order = ordersCache.find((o) => o.id === orderId);
    if (!order) return;
    // pick available products matching this order's operator/type/tariff
    const matches = productsCache.filter((p) =>
      p.status === 'available' &&
      p.operator === order.operator &&
      p.type === order.type &&
      p.tariff === order.tariff
    );
    let html = '';
    if (!matches.length) {
      html = `<div class="muted">⚠ нет подходящих товаров (${OP_LABELS[order.operator]} / ${TYPE_LABELS[order.type]} / ${TARIFF_LABELS[order.tariff]}). Сначала добавь товар во вкладке «🎁 товары».</div>`;
    } else {
      html = matches.map((p) => `
        <button class="dl-pick" data-pid="${esc(p.id)}">
          <div><b>${esc(p.title || p.id)}</b></div>
          <div class="dl-pick-payload">${esc((p.payload || '').slice(0, 80))}${(p.payload || '').length > 80 ? '…' : ''}</div>
        </button>`).join('');
    }
    const modal = document.createElement('div');
    modal.className = 'shop-modal';
    modal.innerHTML = `
      <div class="shop-modal-card">
        <h3>Выбери товар для доставки</h3>
        <p class="muted">Заказ <code>${esc(orderId)}</code> · ${OP_LABELS[order.operator]} · ${TYPE_LABELS[order.type]} · ${TARIFF_LABELS[order.tariff]} · ${DURATION_LABELS[order.duration]}</p>
        <div class="dl-pick-list">${html}</div>
        <div class="form-actions">
          <button class="btn-ghost" data-close>отмена</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelectorAll('[data-pid]').forEach((b) => {
      b.addEventListener('click', async () => {
        try {
          await api('POST', `/api/admin/shop/orders/${encodeURIComponent(orderId)}/deliver`, { productId: b.dataset.pid });
          toast('доставлено ✓');
          modal.remove();
          await Promise.all([loadOrders(), loadProducts()]);
        } catch (e) { toast('ошибка: ' + e.message, 'err'); }
      });
    });
  }

  // ---------- PRODUCTS ----------
  async function loadProducts() {
    try {
      const { products } = await api('GET', '/api/admin/shop/products');
      productsCache = products.sort((a, b) => b.createdAt - a.createdAt);
      $('#prd-count').textContent = productsCache.filter((p) => p.status === 'available').length || '';
      renderProductsList();
    } catch (e) { $('#products-list').textContent = 'ошибка: ' + e.message; }
  }
  function renderProductsList() {
    const list = $('#products-list');
    if (!productsCache.length) {
      list.innerHTML = '<div class="muted">пока нет товаров — добавь первый, чтобы продавать</div>';
      return;
    }
    list.innerHTML = productsCache.map(productCard).join('');
    list.querySelectorAll('[data-del]').forEach((b) => {
      b.addEventListener('click', async () => {
        if (!confirm('удалить товар?')) return;
        try {
          await api('DELETE', '/api/admin/shop/products/' + encodeURIComponent(b.dataset.del));
          toast('удалён');
          loadProducts();
        } catch (e) { toast('ошибка: ' + e.message, 'err'); }
      });
    });
  }
  function productCard(p) {
    const statusCls = p.status === 'available' ? 'avail' : (p.status === 'sold' ? 'sold' : 'other');
    const date = new Date(p.createdAt).toLocaleString('ru');
    return `
    <div class="product-card status-${statusCls}">
      <div class="pc-head">
        <div class="pc-title"><b>${esc(p.title || p.id)}</b><span class="pc-status">${esc(p.status)}</span></div>
        <div class="pc-date">${date}</div>
      </div>
      <div class="pc-tags">
        <span class="pc-tag">${OP_LABELS[p.operator] || p.operator}</span>
        <span class="pc-tag">${TYPE_LABELS[p.type] || p.type}</span>
        <span class="pc-tag">${TARIFF_LABELS[p.tariff] || p.tariff}</span>
      </div>
      <div class="pc-payload">${esc((p.payload || '').slice(0, 200))}${(p.payload || '').length > 200 ? '…' : ''}</div>
      ${p.payloadFilename ? `<div class="pc-meta">файл: <code>${esc(p.payloadFilename)}</code></div>` : ''}
      ${p.note ? `<div class="pc-meta">заметка: ${esc(p.note)}</div>` : ''}
      <div class="pc-actions">
        ${p.status === 'available' ? `<button class="btn-ghost sm" data-del="${esc(p.id)}">удалить</button>` : ''}
      </div>
    </div>`;
  }
  function openProductForm() {
    $('#prd-form-wrap').style.display = 'block';
    ['prd-title', 'prd-payload', 'prd-payload-filename', 'prd-note'].forEach((id) => { const el = $('#' + id); if (el) el.value = ''; });
    const f = $('#prd-file'); if (f) f.value = '';
    $('#prd-form-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function closeProductForm() { $('#prd-form-wrap').style.display = 'none'; }
  async function saveProduct() {
    const body = {
      operator: $('#prd-operator').value,
      type: $('#prd-type').value,
      tariff: $('#prd-tariff').value,
      title: $('#prd-title').value.trim(),
      payload: $('#prd-payload').value,
      payloadFilename: $('#prd-payload-filename').value.trim(),
      note: $('#prd-note').value.trim(),
    };
    if (!body.payload) { toast('пустое содержимое', 'err'); return; }
    try {
      await api('POST', '/api/admin/shop/products', body);
      toast('добавлен');
      closeProductForm();
      loadProducts();
    } catch (e) { toast('ошибка: ' + e.message, 'err'); }
  }
  function bindProductForm() {
    $('#prd-add-btn').addEventListener('click', openProductForm);
    $('#prd-cancel').addEventListener('click', closeProductForm);
    $('#prd-save').addEventListener('click', saveProduct);
    $('#prd-file').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        // result is data URL; extract base64
        const result = reader.result || '';
        const idx = String(result).indexOf(',');
        const b64 = idx >= 0 ? String(result).slice(idx + 1) : String(result);
        $('#prd-payload').value = b64;
        if (!$('#prd-payload-filename').value) {
          $('#prd-payload-filename').value = file.name;
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- PRICES ----------
  function renderPrices() {
    if (!cfgCache?.prices) return;
    const root = $('#prices-matrix');
    let html = '';
    for (const t of TYPES) {
      html += `<div class="price-type-block"><h4>${TYPE_LABELS[t]}</h4>`;
      html += `<table class="price-table"><thead><tr><th>тариф</th>`;
      for (const d of DURATIONS) html += `<th>${DURATION_LABELS[d]}</th>`;
      html += `</tr></thead><tbody>`;
      for (const tariff of TARIFFS) {
        html += `<tr><td class="pt-tariff">${TARIFF_LABELS[tariff]}</td>`;
        for (const d of DURATIONS) {
          const cell = (cfgCache.prices[t]?.[tariff]?.[d]) || {};
          const p = cell.price != null ? cell.price : '';
          const o = cell.old != null ? cell.old : '';
          html += `<td>
            <div class="price-cell">
              <input type="number" step="0.01" min="0" class="px-price" data-t="${t}" data-r="${tariff}" data-d="${d}" data-k="price" value="${p}" placeholder="цена"/>
              <input type="number" step="0.01" min="0" class="px-old" data-t="${t}" data-r="${tariff}" data-d="${d}" data-k="old" value="${o}" placeholder="старая (опц)"/>
            </div>
          </td>`;
        }
        html += `</tr>`;
      }
      html += `</tbody></table></div>`;
    }
    root.innerHTML = html;
  }
  async function savePrices() {
    if (!cfgCache?.prices) return;
    const next = JSON.parse(JSON.stringify(cfgCache.prices));
    $$('#prices-matrix input').forEach((inp) => {
      const t = inp.dataset.t, tariff = inp.dataset.r, d = inp.dataset.d, k = inp.dataset.k;
      next[t] = next[t] || {};
      next[t][tariff] = next[t][tariff] || {};
      next[t][tariff][d] = next[t][tariff][d] || {};
      const v = inp.value.trim();
      if (k === 'price') {
        next[t][tariff][d].price = v === '' ? 0 : Number(v);
      } else {
        if (v === '') delete next[t][tariff][d].old;
        else next[t][tariff][d].old = Number(v);
      }
    });
    try {
      const r = await api('PUT', '/api/admin/shop/config', { prices: next });
      cfgCache = r.config;
      toast('цены сохранены ✓');
    } catch (e) { toast('ошибка: ' + e.message, 'err'); }
  }
  async function resetPrices() {
    if (!confirm('сбросить все цены к дефолтам?')) return;
    try {
      const r = await api('POST', '/api/admin/shop/config/reset-prices', {});
      cfgCache.prices = r.prices;
      renderPrices();
      toast('цены сброшены');
    } catch (e) { toast('ошибка: ' + e.message, 'err'); }
  }

  // ---------- PAYMENTS ----------
  function renderPayments() {
    const p = cfgCache?.payments || {};
    $('#pay-usdt-trc20').value = p.usdt_trc20 || '';
    $('#pay-usdt-bep20').value = p.usdt_bep20 || '';
    $('#pay-m10-phone-input').value = p.m10_phone || '';
    $('#pay-m10-name-input').value = p.m10_name || '';
    $('#pay-contact-tg').value = p.contact_telegram || '';
  }
  async function savePayments() {
    try {
      const r = await api('PUT', '/api/admin/shop/config', {
        payments: {
          usdt_trc20: $('#pay-usdt-trc20').value.trim(),
          usdt_bep20: $('#pay-usdt-bep20').value.trim(),
          m10_phone: $('#pay-m10-phone-input').value.trim(),
          m10_name: $('#pay-m10-name-input').value.trim(),
          contact_telegram: $('#pay-contact-tg').value.trim(),
        },
      });
      cfgCache = r.config;
      toast('реквизиты сохранены ✓');
    } catch (e) { toast('ошибка: ' + e.message, 'err'); }
  }

  // ---------- init ----------
  let initialized = false;
  async function initShopTab() {
    if (initialized) return;
    initialized = true;
    bindSubTabs();
    bindProductForm();
    $('#shop-toggle-enabled').addEventListener('click', toggleEnabled);
    $('#prices-save').addEventListener('click', savePrices);
    $('#prices-reset').addEventListener('click', resetPrices);
    $('#payments-save').addEventListener('click', savePayments);
    try {
      await loadConfig();
      await Promise.all([loadOrders(), loadProducts()]);
    } catch (e) { toast('загрузка магазина: ' + e.message, 'err'); }
  }

  // Hook into existing admin tab system: when "🛒 магазин" tab clicked → init
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.ad-tab');
    if (t && t.dataset.tab === 'shop') initShopTab();
  });
  // also try once on load if shop is already active (deeplink)
  if (document.readyState !== 'loading') {
    setTimeout(() => {
      const active = document.querySelector('.ad-tab.active');
      if (active && active.dataset.tab === 'shop') initShopTab();
    }, 200);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const active = document.querySelector('.ad-tab.active');
        if (active && active.dataset.tab === 'shop') initShopTab();
      }, 200);
    });
  }
})();
