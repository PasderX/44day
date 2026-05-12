// ===== 44day_ — Order page: payment + delivery =====
(() => {
  const $ = (s) => document.querySelector(s);
  const TYPE_LABELS = {
    sni: 'SNI хост',
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
  const STATUS_PILL = {
    pending_payment: { txt: 'ожидает оплаты', cls: 'pending' },
    paid_pending_review: { txt: 'проверяем оплату', cls: 'review' },
    delivered: { txt: 'доставлено ✓', cls: 'done' },
    cancelled: { txt: 'отменён', cls: 'cancelled' },
  };

  function toast(msg, kind) {
    const stack = $('#toast-stack') || document.body;
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '') + ' show';
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
  }

  function getOrderId() {
    const m = location.pathname.match(/\/shop\/order\/([^\/?#]+)/);
    return m ? m[1] : null;
  }
  function getKey(id) {
    const u = new URL(location.href);
    let key = u.searchParams.get('key');
    if (!key) {
      try { key = localStorage.getItem(`44day_order_${id}`); } catch {}
    }
    return key;
  }

  function fmtNum(n) {
    return Number(n).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  let pollTimer = null;

  async function loadOrder() {
    const id = getOrderId();
    if (!id) { showError('некорректная ссылка'); return; }
    const key = getKey(id);
    if (!key) { showError('не найден ключ доступа — открой ссылку из своей истории'); return; }
    try {
      const r = await fetch(`/api/shop/order/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`);
      const data = await r.json();
      if (!r.ok) {
        showError(data.error === 'bad_key' ? 'ключ доступа неверный' : 'заказ не найден');
        return;
      }
      render(data);
    } catch (e) {
      showError('не удалось загрузить заказ');
    }
  }

  function showError(msg) {
    $('#ord-loading').textContent = '⚠ ' + msg;
  }

  function render(data) {
    $('#ord-loading').hidden = true;
    $('#ord-content').hidden = false;
    $('#ord-id-cmd').textContent = data.id.slice(0, 14) + '…';
    $('#ord-id').textContent = data.id;

    const pill = STATUS_PILL[data.status] || { txt: data.status, cls: '' };
    const pillEl = $('#ord-status-pill');
    pillEl.textContent = pill.txt;
    pillEl.className = 'ord-status-pill ' + pill.cls;

    $('#o-operator').textContent = OP_LABELS[data.operator] || data.operator;
    $('#o-type').textContent = TYPE_LABELS[data.type] || data.type;
    $('#o-tariff').textContent = TARIFF_LABELS[data.tariff] || data.tariff;
    $('#o-duration').textContent = DURATION_LABELS[data.duration] || data.duration;
    $('#o-contact').textContent = data.contact || '—';
    $('#o-price').textContent = `${fmtNum(data.price)} ${data.currency}`;

    const tg = data.contactTelegram || '@baku_root';
    const tgUrl = tg.startsWith('@') ? `https://t.me/${tg.slice(1)}` : tg;
    $('#rv-tg').textContent = tg;
    $('#rv-tg').href = tgUrl;
    $('#cn-tg').textContent = tg;
    $('#cn-tg').href = tgUrl;

    // hide all sections first
    $('#pay-section').hidden = true;
    $('#review-section').hidden = true;
    $('#delivered-section').hidden = true;
    $('#cancelled-section').hidden = true;

    if (data.status === 'pending_payment') {
      renderPayment(data);
      $('#pay-section').hidden = false;
    } else if (data.status === 'paid_pending_review') {
      $('#review-section').hidden = false;
      schedulePoll();
    } else if (data.status === 'delivered') {
      renderDelivered(data);
      $('#delivered-section').hidden = false;
      stopPoll();
    } else if (data.status === 'cancelled') {
      $('#cancelled-section').hidden = false;
      stopPoll();
    }
  }

  function renderPayment(d) {
    const pi = d.paymentInfo || {};
    if (pi.method === 'usdt') {
      $('#pay-usdt').hidden = false;
      $('#pay-m10').hidden = true;
      $('#pay-usdt-amt').textContent = fmtNum(pi.amountUSDT);
      $('#pay-usdt-azn').textContent = fmtNum(pi.amountAZN);
      $('#pay-usdt-addr').textContent = pi.address || '(адрес не задан админом — спроси в Telegram)';
    } else {
      $('#pay-m10').hidden = false;
      $('#pay-usdt').hidden = true;
      $('#pay-m10-amt').textContent = fmtNum(pi.amountAZN);
      $('#pay-m10-phone').textContent = pi.phone || '(номер не задан админом — спроси в Telegram)';
      if (pi.name) {
        $('#pay-m10-name').textContent = pi.name;
        $('#pay-m10-name-row').hidden = false;
      } else {
        $('#pay-m10-name-row').hidden = true;
      }
    }
  }

  function renderDelivered(d) {
    const dl = d.delivered || {};
    $('#dlv-type-name').textContent = TYPE_LABELS[d.type] || d.type;
    $('#dlv-title').textContent = dl.title || (TYPE_LABELS[d.type] + ' для ' + (OP_LABELS[d.operator] || d.operator));
    $('#dlv-payload').textContent = dl.payload || '(пусто)';

    const dlBtn = $('#dlv-download');
    if (dl.payloadFilename) {
      // payload may be base64 — convert to blob URL for download
      try {
        const filename = dl.payloadFilename;
        let blob;
        // assume base64 if no whitespace and looks like base64
        const looksB64 = /^[A-Za-z0-9+/=\r\n]+$/.test(dl.payload || '') && (dl.payload || '').length > 80;
        if (looksB64) {
          const bin = atob((dl.payload || '').replace(/\s+/g, ''));
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          blob = new Blob([arr], { type: 'application/octet-stream' });
        } else {
          blob = new Blob([dl.payload || ''], { type: 'text/plain' });
        }
        dlBtn.href = URL.createObjectURL(blob);
        dlBtn.download = filename;
        dlBtn.textContent = 'скачать ' + filename;
        dlBtn.hidden = false;
      } catch (e) {
        dlBtn.hidden = true;
      }
    } else {
      dlBtn.hidden = true;
    }

    if (dl.note) {
      const noteEl = $('#dlv-note');
      noteEl.textContent = dl.note;
      noteEl.hidden = false;
    }
  }

  async function markPaid() {
    const id = getOrderId();
    const key = getKey(id);
    const note = $('#pay-note').value.trim();
    const btn = $('#btn-paid');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'отправляем…';
    try {
      const r = await fetch(`/api/shop/order/${encodeURIComponent(id)}/paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, note }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'failed');
      toast('платёж зафиксирован — ждём подтверждения админом', 'ok');
      await loadOrder();
    } catch (e) {
      toast('ошибка: ' + e.message, 'err');
      btn.disabled = false;
      btn.querySelector('span').textContent = '✓ Я оплатил';
    }
  }

  function schedulePoll() {
    stopPoll();
    pollTimer = setInterval(loadOrder, 15000); // 15s polling
  }
  function stopPoll() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function bindCopyButtons() {
    document.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-copy]');
      if (!b) return;
      const target = document.querySelector(b.dataset.copy);
      if (!target) return;
      const txt = target.textContent;
      navigator.clipboard.writeText(txt).then(() => toast('скопировано', 'ok'),
        () => toast('не удалось скопировать', 'err'));
    });
  }

  function init() {
    bindCopyButtons();
    $('#btn-paid').addEventListener('click', markPaid);
    loadOrder();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
