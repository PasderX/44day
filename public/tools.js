// ===== Security Tools — all client-side =====
(function () {
  // theme
  function applyTheme(name) {
    const t = name === 'light' ? 'light' : 'dark';
    if (t === 'dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('44day-theme', t);
    document.querySelectorAll('.theme-btn').forEach((b) => b.classList.toggle('active', b.dataset.theme === t));
    setTimeout(() => window.refreshMatrixColor && window.refreshMatrixColor(), 50);
  }
  applyTheme(localStorage.getItem('44day-theme') || 'dark');
  document.querySelectorAll('.theme-btn').forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
  window.mountLangSwitcher && window.mountLangSwitcher('#topbar-right');

  // tabs
  const tabs = document.querySelectorAll('.tt-btn');
  const panels = document.querySelectorAll('.tool-panel');
  tabs.forEach((b) => {
    b.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.toggle('active', x === b));
      panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === b.dataset.tab));
    });
  });

  // copy helper
  document.addEventListener('click', (e) => {
    const cp = e.target.closest('.copy-btn');
    if (!cp) return;
    const id = cp.dataset.copy;
    const el = document.getElementById(id);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent).then(() => {
      cp.textContent = 'copied!';
      setTimeout(() => { cp.textContent = 'copy'; }, 1200);
    });
  });

  // ============ HASH ============
  const hashInput = document.getElementById('hash-input');
  async function digest(algo, text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest(algo, enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hashTimer;
  hashInput.addEventListener('input', () => {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(async () => {
      const t = hashInput.value;
      if (!t) { ['h-sha1', 'h-sha256', 'h-sha384', 'h-sha512'].forEach((id) => document.getElementById(id).textContent = '—'); return; }
      const [s1, s256, s384, s512] = await Promise.all([
        digest('SHA-1', t), digest('SHA-256', t), digest('SHA-384', t), digest('SHA-512', t),
      ]);
      document.getElementById('h-sha1').textContent = s1;
      document.getElementById('h-sha256').textContent = s256;
      document.getElementById('h-sha384').textContent = s384;
      document.getElementById('h-sha512').textContent = s512;
    }, 150);
  });

  // ============ BASE64 ============
  const b64Text = document.getElementById('b64-text');
  const b64Encoded = document.getElementById('b64-encoded');
  document.getElementById('b64-encode').addEventListener('click', () => {
    try { b64Encoded.value = btoa(unescape(encodeURIComponent(b64Text.value))); }
    catch (e) { b64Encoded.value = 'Error: ' + e.message; }
  });
  document.getElementById('b64-decode').addEventListener('click', () => {
    try { b64Text.value = decodeURIComponent(escape(atob(b64Encoded.value))); }
    catch (e) { b64Text.value = 'Error: invalid base64'; }
  });

  // ============ URL ============
  const urlText = document.getElementById('url-text');
  const urlEncoded = document.getElementById('url-encoded');
  document.getElementById('url-encode').addEventListener('click', () => {
    urlEncoded.value = encodeURIComponent(urlText.value);
  });
  document.getElementById('url-decode').addEventListener('click', () => {
    try { urlText.value = decodeURIComponent(urlEncoded.value); }
    catch { urlText.value = 'Error'; }
  });

  // ============ JWT ============
  const jwtInput = document.getElementById('jwt-input');
  jwtInput.addEventListener('input', () => {
    const parts = jwtInput.value.trim().split('.');
    const decode = (s) => {
      try {
        const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
        const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
        return JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(b64)))), null, 2);
      } catch { return '— invalid —'; }
    };
    document.getElementById('jwt-header').textContent = parts[0] ? decode(parts[0]) : '—';
    document.getElementById('jwt-payload').textContent = parts[1] ? decode(parts[1]) : '—';
    document.getElementById('jwt-sig').textContent = parts[2] || '—';
  });

  // ============ PASSWORD STRENGTH ============
  const passInput = document.getElementById('pass-input');
  passInput.addEventListener('input', () => {
    const p = passInput.value;
    const len = p.length;
    document.getElementById('pass-len').textContent = len;
    const has = {
      lower: /[a-zа-я]/.test(p),
      upper: /[A-ZА-Я]/.test(p),
      digit: /\d/.test(p),
      sym: /[^A-Za-zА-Яа-я0-9]/.test(p),
    };
    let pool = 0;
    if (has.lower) pool += 26;
    if (has.upper) pool += 26;
    if (has.digit) pool += 10;
    if (has.sym) pool += 33;
    const ent = pool ? Math.round(len * Math.log2(pool)) : 0;
    document.getElementById('pass-ent').textContent = ent;

    let cls = 'очень слабый', color = '#ef4444', pct = 10;
    if (ent >= 28) { cls = 'слабый'; color = '#f97316'; pct = 30; }
    if (ent >= 50) { cls = 'средний'; color = '#fbbf24'; pct = 55; }
    if (ent >= 70) { cls = 'хороший'; color = '#84cc16'; pct = 80; }
    if (ent >= 100) { cls = 'отличный'; color = '#22c55e'; pct = 100; }
    if (!len) { cls = '—'; pct = 0; color = '#444'; }
    document.getElementById('pass-class').textContent = cls;
    const bar = document.getElementById('pass-bar');
    bar.style.width = pct + '%';
    bar.style.background = color;

    // crack time at 1e10 guesses/sec
    const seconds = Math.pow(2, ent) / 1e10;
    document.getElementById('pass-time').textContent = humanTime(seconds);

    const checks = [
      { ok: len >= 12, label: 'минимум 12 символов' },
      { ok: has.lower, label: 'строчные буквы' },
      { ok: has.upper, label: 'ЗАГЛАВНЫЕ буквы' },
      { ok: has.digit, label: 'цифры' },
      { ok: has.sym, label: 'спец. символы' },
      { ok: !/(.)\1{2,}/.test(p), label: 'нет повторов (aaa)' },
      { ok: !/(qwerty|password|123456|admin)/i.test(p), label: 'не из чёрного списка' },
      { ok: ent >= 70, label: 'энтропия ≥ 70 bits' },
    ];
    document.getElementById('pass-checks').innerHTML = checks.map((c) =>
      `<li class="${c.ok ? 'ok' : ''}">${c.label}</li>`).join('');
  });

  function humanTime(sec) {
    if (!isFinite(sec) || sec < 0.001) return 'мгновенно';
    if (sec < 60) return Math.round(sec) + ' сек';
    if (sec < 3600) return Math.round(sec / 60) + ' мин';
    if (sec < 86400) return Math.round(sec / 3600) + ' часов';
    if (sec < 31536000) return Math.round(sec / 86400) + ' дней';
    if (sec < 31536000 * 1000) return Math.round(sec / 31536000) + ' лет';
    if (sec < 31536000 * 1e6) return Math.round(sec / 31536000 / 1e3) + ' тыс. лет';
    if (sec < 31536000 * 1e9) return Math.round(sec / 31536000 / 1e6) + ' млн лет';
    return '∞';
  }

  // ============ PASSWORD GENERATOR ============
  const genLen = document.getElementById('gen-len');
  const genLenVal = document.getElementById('gen-len-val');
  genLen.addEventListener('input', () => { genLenVal.textContent = genLen.value; rollPass(); });
  ['gen-up', 'gen-low', 'gen-num', 'gen-sym'].forEach((id) => document.getElementById(id).addEventListener('change', rollPass));
  function rollPass() {
    const len = +genLen.value;
    let pool = '';
    if (document.getElementById('gen-up').checked) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (document.getElementById('gen-low').checked) pool += 'abcdefghijklmnopqrstuvwxyz';
    if (document.getElementById('gen-num').checked) pool += '0123456789';
    if (document.getElementById('gen-sym').checked) pool += '!@#$%^&*()-_=+[]{};:,.<>?/';
    if (!pool) { document.getElementById('gen-out').value = '— select at least one —'; return; }
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    let out = '';
    for (let i = 0; i < len; i++) out += pool[buf[i] % pool.length];
    document.getElementById('gen-out').value = out;
  }
  document.getElementById('gen-roll').addEventListener('click', rollPass);
  document.getElementById('gen-copy').addEventListener('click', () => {
    const out = document.getElementById('gen-out');
    navigator.clipboard.writeText(out.value);
    const btn = document.getElementById('gen-copy');
    btn.textContent = 'copied!'; setTimeout(() => { btn.textContent = 'copy'; }, 1200);
  });
  rollPass();

  // ============ QR ============
  const qrInput = document.getElementById('qr-input');
  const qrOut = document.getElementById('qr-out');
  let qrTimer;
  qrInput.addEventListener('input', () => {
    clearTimeout(qrTimer);
    qrTimer = setTimeout(() => {
      const v = qrInput.value.trim();
      if (!v) { qrOut.innerHTML = ''; return; }
      const url = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(v);
      qrOut.innerHTML = `<img src="${url}" alt="QR" width="240" height="240"/>`;
    }, 350);
  });

  // ============ FINGERPRINT ============
  (async function fp() {
    const tbl = document.getElementById('fp-table');
    const data = {
      'User Agent': navigator.userAgent,
      'Platform': navigator.platform,
      'Languages': (navigator.languages || []).join(', '),
      'Screen': `${screen.width}×${screen.height} (${screen.colorDepth}-bit)`,
      'Window': `${innerWidth}×${innerHeight}`,
      'Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      'CPU Cores': navigator.hardwareConcurrency || '?',
      'RAM (GB approx)': navigator.deviceMemory || '?',
      'Touch': ('ontouchstart' in window) ? 'yes' : 'no',
      'Online': navigator.onLine ? 'yes' : 'no',
      'Cookies enabled': navigator.cookieEnabled ? 'yes' : 'no',
      'Do Not Track': navigator.doNotTrack || 'unset',
    };
    // canvas fingerprint
    try {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 50;
      const ctx = c.getContext('2d');
      ctx.textBaseline = 'top'; ctx.font = '14px Arial';
      ctx.fillStyle = '#f60'; ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069'; ctx.fillText('44Day Hub 🛡️', 2, 15);
      const dataUrl = c.toDataURL();
      const enc = new TextEncoder().encode(dataUrl);
      const hash = await crypto.subtle.digest('SHA-256', enc);
      const hex = Array.from(new Uint8Array(hash)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
      data['Canvas FP'] = hex;
    } catch {}
    // IP via free service
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      const j = await r.json();
      data['Public IP'] = j.ip;
    } catch { data['Public IP'] = '— blocked —'; }

    tbl.innerHTML = Object.entries(data).map(([k, v]) =>
      `<tr><td>${k}</td><td>${String(v).replace(/[<>]/g, '')}</td></tr>`).join('');
  })();

  // scroll-top
  const st = document.getElementById('scroll-top');
  if (st) {
    window.addEventListener('scroll', () => st.classList.toggle('show', scrollY > 300));
    st.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  }
})();
