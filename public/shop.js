// ===== 44day_ — Shop wizard =====
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const state = {
    step: 1,
    operator: null,
    type: null,
    tariff: null,
    duration: null,
    paymentMethod: null,
    config: null,
    stock: {},
  };

  const TYPE_LABELS = {
    sni: 'SNI хост (премиум)',
    http_injector: 'HTTP Injector конфиг',
    dark_tunnel: 'Dark Tunnel конфиг',
    ha_tunnel: 'HA Tunnel конфиг',
  };
  const TARIFF_LABELS = {
    zero: '0 баланс / нет интернета',
    whatsapp: 'бесплатный WhatsApp',
    telegram: 'бесплатный Telegram',
    facebook: 'бесплатный Facebook',
    instagram: 'бесплатный Instagram',
    tiktok: 'бесплатный TikTok',
  };
  const OP_LABELS = { bakcell: 'Bakcell', azercell: 'Azercell', nar: 'Nar' };
  const DURATION_LABELS = { '1d': '1 день', '7d': '1 неделя', '30d': '1 месяц' };

  function toast(msg, kind) {
    const stack = $('#toast-stack') || document.body;
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '') + ' show';
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
  }

  async function loadConfig() {
    try {
      const [cfg, stockRes] = await Promise.all([
        fetch('/api/shop/config').then((r) => r.json()),
        fetch('/api/shop/stock').then((r) => r.json()),
      ]);
      state.config = cfg;
      state.stock = stockRes.stock || {};
      renderTypeHints();
    } catch (e) {
      toast('не удалось загрузить магазин', 'err');
    }
  }

  // returns the lowest active price for a given type across all tariffs/durations
  function minPriceForType(type) {
    const tt = state.config?.prices?.[type];
    if (!tt) return null;
    let min = Infinity;
    for (const tariff of Object.keys(tt)) {
      for (const dur of Object.keys(tt[tariff] || {})) {
        const p = Number(tt[tariff][dur]?.price);
        if (Number.isFinite(p) && p > 0 && p < min) min = p;
      }
    }
    return min === Infinity ? null : min;
  }

  function renderTypeHints() {
    if (!state.config) return;
    const cur = state.config.currency || 'AZN';
    const types = ['sni', 'http_injector', 'dark_tunnel', 'ha_tunnel'];
    for (const t of types) {
      const el = $('#ph-' + t);
      if (!el) continue;
      const m = minPriceForType(t);
      el.textContent = m != null ? `от ${fmtNum(m)} ${cur}` : '—';
    }
  }

  function fmtNum(n) {
    return Number(n).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  function getCell() {
    if (!state.config || !state.type || !state.tariff || !state.duration) return null;
    return state.config.prices?.[state.type]?.[state.tariff]?.[state.duration] || null;
  }

  function priceFor(type, tariff, duration) {
    return state.config?.prices?.[type]?.[tariff]?.[duration] || null;
  }

  function setStep(n) {
    state.step = Math.max(1, Math.min(5, n));
    $$('.wiz-step').forEach((el) => {
      const s = Number(el.dataset.step);
      el.classList.toggle('is-active', s === state.step);
      el.classList.toggle('is-done', s < state.step);
    });
    $$('.wiz-panel').forEach((el) => {
      el.classList.toggle('is-active', Number(el.dataset.panel) === state.step);
    });
    $('#wiz-pos').textContent = state.step;
    $('#wiz-back').disabled = state.step === 1;
    if (state.step === 4) renderDurationPrices();
    if (state.step === 5) renderSummary();
    updateNextButton();
  }

  function updateNextButton() {
    const n = state.step;
    const nxt = $('#wiz-next');
    let ok = false;
    if (n === 1) ok = !!state.operator;
    else if (n === 2) ok = !!state.type;
    else if (n === 3) ok = !!state.tariff;
    else if (n === 4) ok = !!state.duration;
    else if (n === 5) ok = false;
    nxt.disabled = !ok;
    nxt.style.display = n === 5 ? 'none' : '';
    $('#wiz-back').style.display = n === 1 ? 'none' : '';
  }

  function pick(field, val) {
    state[field] = val;
    $$(`[data-pick="${field}"]`).forEach((b) => {
      b.classList.toggle('is-selected', b.dataset.val === val);
    });
    if (field === 'tariff' || field === 'type') {
      // reset duration so user re-confirms (price might differ)
      // but keep if user goes back-forward without changing
    }
    updateNextButton();
    if (window.sfx && window.sfx.click) try { window.sfx.click(); } catch {}
  }

  function renderDurationPrices() {
    if (!state.config || !state.type || !state.tariff) return;
    const cur = state.config.currency || 'AZN';
    ['1d', '7d', '30d'].forEach((d) => {
      const el = $('#dp-' + d);
      if (!el) return;
      const cell = priceFor(state.type, state.tariff, d);
      if (!cell || !cell.price) {
        el.innerHTML = '<span class="np">недоступно</span>';
        return;
      }
      let html = '';
      if (cell.old && cell.old > cell.price) {
        const off = Math.round((1 - cell.price / cell.old) * 100);
        html = `<span class="old">${fmtNum(cell.old)}</span> <span class="new">${fmtNum(cell.price)} ${cur}</span> <span class="off">−${off}%</span>`;
      } else {
        html = `<span class="new">${fmtNum(cell.price)} ${cur}</span>`;
      }
      el.innerHTML = html;
    });
  }

  function fmtPriceBlock(cell, cur) {
    if (!cell || !cell.price) return '<b>— ' + cur + '</b>';
    if (cell.old && cell.old > cell.price) {
      const off = Math.round((1 - cell.price / cell.old) * 100);
      return `<span class="sum-old">${fmtNum(cell.old)}</span><b>${fmtNum(cell.price)} ${cur}</b><span class="sum-off">−${off}%</span>`;
    }
    return `<b>${fmtNum(cell.price)} ${cur}</b>`;
  }

  function stockKey() {
    return `${state.operator}|${state.type}|${state.tariff}`;
  }

  function renderSummary() {
    $('#sum-operator').textContent = OP_LABELS[state.operator] || '—';
    $('#sum-type').textContent = TYPE_LABELS[state.type] || '—';
    $('#sum-tariff').textContent = TARIFF_LABELS[state.tariff] || '—';
    $('#sum-duration').textContent = DURATION_LABELS[state.duration] || '—';
    const cur = state.config?.currency || 'AZN';
    const cell = getCell();
    $('#sum-price-block').innerHTML = fmtPriceBlock(cell, cur);

    const inStock = (state.stock[stockKey()] || 0) > 0;
    const stockEl = $('#sum-stock');
    if (inStock) {
      stockEl.innerHTML = '<span class="stock-ok">✓ в наличии — доставка после подтверждения оплаты</span>';
    } else {
      stockEl.innerHTML = '<span class="stock-pre">⏳ под заказ — доставка ~30-60 мин после оплаты</span>';
    }
    updatePlaceOrderState();
  }

  function updatePlaceOrderState() {
    const btn = $('#place-order');
    const contactOk = $('#contact-input').value.trim().length >= 3;
    const cell = getCell();
    const ok = state.operator && state.type && state.tariff && state.duration
      && state.paymentMethod && contactOk && cell && cell.price > 0;
    btn.disabled = !ok;
  }

  async function placeOrder() {
    const btn = $('#place-order');
    btn.disabled = true;
    const errEl = $('#order-error');
    errEl.hidden = true;
    try {
      const r = await fetch('/api/shop/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator: state.operator,
          type: state.type,
          tariff: state.tariff,
          duration: state.duration,
          paymentMethod: state.paymentMethod,
          contact: $('#contact-input').value.trim(),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'order_failed');
      try { localStorage.setItem(`44day_order_${data.orderId}`, data.accessKey); } catch {}
      location.href = data.redirect;
    } catch (e) {
      errEl.hidden = false;
      errEl.textContent = 'Ошибка: ' + (e.message || 'не удалось оформить');
      btn.disabled = false;
    }
  }

  function init() {
    $$('[data-pick]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        pick(b.dataset.pick, b.dataset.val);
      });
    });
    $$('[data-pay]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        state.paymentMethod = b.dataset.pay;
        $$('[data-pay]').forEach((x) => x.classList.toggle('is-selected', x === b));
        updatePlaceOrderState();
      });
    });
    $('#contact-input').addEventListener('input', updatePlaceOrderState);
    $('#wiz-next').addEventListener('click', () => setStep(state.step + 1));
    $('#wiz-back').addEventListener('click', () => setStep(state.step - 1));
    $('#place-order').addEventListener('click', placeOrder);

    setStep(1);
    loadConfig();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
