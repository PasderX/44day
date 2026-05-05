// ===== sounds (WebAudio) =====
let _audioCtx = null;
let _audioReady = false;
let _soundsEnabled = true;
function audio() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  return _audioCtx;
}
// unlock AudioContext on first user gesture (autoplay policy)
function _unlockAudio() {
  const ctx = audio(); if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().then(() => { _audioReady = true; }).catch(() => {});
  else _audioReady = true;
  // play silent buffer to fully unlock on Safari/iOS
  try {
    const b = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = b; src.connect(ctx.destination); src.start(0);
  } catch {}
}
['click', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, _unlockAudio, { once: false, passive: true, capture: true }));

function beep({ freq = 880, dur = 0.08, type = 'square', vol = 0.07, slide = 0 } = {}) {
  if (!_soundsEnabled) return;
  const ctx = audio(); if (!ctx) return;
  if (ctx.state === 'suspended') { ctx.resume(); return; } // skip this beep, but unlock for next
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {}
}
function soundClick() { beep({ freq: 720, dur: 0.05, type: 'square', vol: 0.05 }); }
function soundStart() {
  beep({ freq: 520, dur: 0.07, type: 'sawtooth', vol: 0.06, slide: 400 });
  setTimeout(() => beep({ freq: 920, dur: 0.06, type: 'sawtooth', vol: 0.05, slide: 200 }), 70);
}
function soundDone() {
  beep({ freq: 660, dur: 0.06, type: 'triangle', vol: 0.05 });
  setTimeout(() => beep({ freq: 990, dur: 0.10, type: 'triangle', vol: 0.05 }), 80);
}
function soundBlip() { beep({ freq: 1200, dur: 0.025, type: 'square', vol: 0.025 }); }

// ===== theme switcher (dark / light) =====
function applyTheme(name) {
  const t = name === 'light' ? 'light' : 'dark';
  if (t === 'dark') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', 'light');
  localStorage.setItem('44day-theme', t);
  document.querySelectorAll('.theme-btn').forEach((b) => b.classList.toggle('active', b.dataset.theme === t));
  setTimeout(() => window.refreshMatrixColor && window.refreshMatrixColor(), 50);
}
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('44day-theme');
  // migrate old multi-themes to dark
  applyTheme(saved === 'light' ? 'light' : 'dark');
  document.querySelectorAll('.theme-btn').forEach((b) => {
    b.addEventListener('click', () => { soundClick(); applyTheme(b.dataset.theme); });
  });
});

// ===== language =====
const savedLang = localStorage.getItem('lang') || 'ru';
applyI18n(savedLang);
document.querySelectorAll('.lang-btn').forEach((b) => {
  if (b.dataset.lang === savedLang) b.classList.add('active'); else b.classList.remove('active');
  b.addEventListener('click', () => {
    document.querySelectorAll('.lang-btn').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    applyI18n(b.dataset.lang);
  });
});

// ===== splash =====
const splash = document.getElementById('splash');
const app = document.getElementById('app');
const enterBtn = document.getElementById('enter-btn');

const typedTarget = document.getElementById('typed-text');
const typedSeq = [
  '> connect crt.sh ......... [OK]',
  '> connect alienvault ...... [OK]',
  '> connect hackertarget .... [OK]',
  '> connect rapiddns ........ [OK]',
  '> SNI engine ready_',
];
let typedIdx = 0, charIdx = 0;
function typeNext() {
  if (typedIdx >= typedSeq.length) { typedIdx = 0; charIdx = 0; typedTarget.textContent = ''; setTimeout(typeNext, 1500); return; }
  const cur = typedSeq[typedIdx];
  if (charIdx <= cur.length) {
    typedTarget.textContent = cur.slice(0, charIdx++);
    setTimeout(typeNext, 28);
  } else {
    setTimeout(() => { typedIdx++; charIdx = 0; typedTarget.textContent = ''; typeNext(); }, 700);
  }
}
typeNext();

enterBtn.addEventListener('click', () => {
  audio(); // unlock audio context on first user gesture
  soundStart();
  splash.classList.add('fade-out');
  setTimeout(() => { splash.style.display = 'none'; app.classList.remove('hidden'); }, 580);
});

// ===== clock & uptime =====
const clockEl = document.getElementById('clock');
const uptimeEl = document.getElementById('uptime');
const sessionEl = document.getElementById('session-id');
const startTime = Date.now();
sessionEl.textContent = Math.random().toString(16).slice(2, 8).toUpperCase();
function pad(n) { return String(n).padStart(2, '0'); }
function tick() {
  const d = new Date();
  clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const up = Math.floor((Date.now() - startTime) / 1000);
  uptimeEl.textContent = `${pad(Math.floor(up / 3600))}:${pad(Math.floor(up / 60) % 60)}:${pad(up % 60)}`;
}
tick(); setInterval(tick, 1000);

// ===== tabs =====
document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => {
    soundClick();
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('panel-' + t.dataset.tab).classList.add('active');
  });
});

// language buttons sound
document.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', soundClick));

// ===== terminal helpers =====
function termWrite(termEl, line, cls = '') {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.innerHTML = line;
  termEl.appendChild(div);
  termEl.scrollTop = termEl.scrollHeight;
}
function termClear(termEl) { termEl.innerHTML = ''; }

// ===== SEARCH =====
const searchForm = document.getElementById('search-form');
const domainInput = document.getElementById('domain');
const searchBtn = document.getElementById('search-btn');
const terminal = document.getElementById('terminal');
const termBody = document.getElementById('term-body');
const searchResults = document.getElementById('search-results');
const resDomain = document.getElementById('res-domain');
const resMeta = document.getElementById('res-meta');
const searchBody = document.getElementById('search-body');
const checkAll = document.getElementById('check-all');
const filterSearch = document.getElementById('filter-search');

let lastResults = [];
let lastDomain = '';

document.querySelectorAll('.chip').forEach((c) => {
  c.addEventListener('click', () => { domainInput.value = c.dataset.domain; searchForm.requestSubmit(); });
});

function renderSearch(rows) {
  searchBody.innerHTML = '';
  const frag = document.createDocumentFragment();
  rows.forEach((host, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="checkbox" class="row-check" value="${host}"/></td><td>${i+1}</td><td>${host}</td>`;
    frag.appendChild(tr);
  });
  searchBody.appendChild(frag);
}

filterSearch.addEventListener('input', () => {
  const q = filterSearch.value.trim().toLowerCase();
  renderSearch(q ? lastResults.filter((h) => h.includes(q)) : lastResults);
});
checkAll.addEventListener('change', () => {
  document.querySelectorAll('.row-check').forEach((c) => (c.checked = checkAll.checked));
});
document.getElementById('select-all').addEventListener('click', () => {
  checkAll.checked = !checkAll.checked;
  checkAll.dispatchEvent(new Event('change'));
});

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const domain = domainInput.value.trim().toLowerCase();
  if (!domain) return;

  soundStart();
  searchBtn.classList.add('loading');
  searchBtn.disabled = true;
  searchResults.classList.add('hidden');
  terminal.classList.remove('hidden');
  termClear(termBody);

  const stages = [
    { msg: `<span class="prompt">$</span> 44day --search ${domain}`, cls: 'hi' },
    { msg: `<span class="dim">[*]</span> initializing scanner...`, cls: '' },
    { msg: `<span class="info">[+]</span> connecting to crt.sh ...`, cls: '' },
    { msg: `<span class="info">[+]</span> connecting to alienvault otx ...`, cls: '' },
    { msg: `<span class="info">[+]</span> connecting to hackertarget ...`, cls: '' },
    { msg: `<span class="info">[+]</span> connecting to rapiddns ...`, cls: '' },
    { msg: `<span class="warn">[~]</span> aggregating & deduplicating ...`, cls: '' },
  ];
  for (const s of stages) { await new Promise((r) => setTimeout(r, 220)); termWrite(termBody, s.msg, s.cls); }

  try {
    const res = await fetch(`/api/search?domain=${encodeURIComponent(domain)}`);
    const data = await res.json();
    if (!res.ok) {
      termWrite(termBody, `<span class="err">[!] ${data.error || 'failed'}</span>`);
      return;
    }
    termWrite(termBody, `<span class="ok">[OK]</span> crt.sh: ${data.sources.crtsh}`);
    termWrite(termBody, `<span class="ok">[OK]</span> alienvault: ${data.sources.alienvault}`);
    termWrite(termBody, `<span class="ok">[OK]</span> hackertarget: ${data.sources.hackertarget}`);
    termWrite(termBody, `<span class="ok">[OK]</span> rapiddns: ${data.sources.rapiddns}`);
    termWrite(termBody, `<span class="hi">[✔]</span> total unique: <strong>${data.total}</strong>`);
    soundDone();

    lastResults = data.results;
    lastDomain = data.domain;
    if (!data.total) {
      termWrite(termBody, `<span class="warn">no subdomains found.</span>`);
      return;
    }
    resDomain.textContent = data.domain;
    resMeta.textContent = `total: ${data.total} · crt.sh: ${data.sources.crtsh} · alienvault: ${data.sources.alienvault} · hackertarget: ${data.sources.hackertarget} · rapiddns: ${data.sources.rapiddns}`;
    renderSearch(lastResults);
    searchResults.classList.remove('hidden');
  } catch (err) {
    termWrite(termBody, `<span class="err">[!] network error: ${err.message}</span>`);
  } finally {
    searchBtn.classList.remove('loading');
    searchBtn.disabled = false;
  }
});

document.getElementById('copy-search').addEventListener('click', () => {
  if (!lastResults.length) return;
  navigator.clipboard.writeText(lastResults.join('\n'));
});
document.getElementById('download-search').addEventListener('click', () => {
  if (!lastResults.length) return;
  const blob = new Blob([lastResults.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${lastDomain}-subdomains.txt`;
  a.click();
});
document.getElementById('send-to-test').addEventListener('click', () => {
  const checked = Array.from(document.querySelectorAll('.row-check:checked')).map((c) => c.value);
  const list = checked.length ? checked : lastResults;
  if (!list.length) return;
  document.getElementById('test-hosts').value = list.join('\n');
  document.querySelector('.tab[data-tab="test"]').click();
});

// ===== TEST =====
const testBtn = document.getElementById('test-btn');
const testHostsEl = document.getElementById('test-hosts');
const termHttp = document.getElementById('term-http');
const termWs = document.getElementById('term-ws');
const termSni = document.getElementById('term-sni');
const testTerminalEl = document.querySelector('.test-terminal');
const testResults = document.getElementById('test-results');
const testBody = document.getElementById('test-body');
const testMeta = document.getElementById('test-meta');
const progress = document.getElementById('test-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const testFilter = document.getElementById('test-filter');

let allTestRows = [];

// terminal view tabs
document.querySelectorAll('.term-tab').forEach((b) => {
  b.addEventListener('click', () => {
    soundClick();
    document.querySelectorAll('.term-tab').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    const v = b.dataset.stream;
    if (v === 'all') testTerminalEl.removeAttribute('data-view');
    else testTerminalEl.setAttribute('data-view', v);
  });
});

// score for sorting/highlight
function scoreRow(r) {
  // returns 0..100
  let s = 0;
  if (r.sni?.ok) s += 25;
  if (r.sni?.tls === 'TLSv1.3') s += 5;
  if (r.http?.ok) s += 10;
  if (r.http?.status === 200) s += 30;
  else if (r.http?.status === 101) s += 35;
  else if (r.http?.status >= 300 && r.http?.status < 400) s += 15;
  else if (r.http?.status >= 400 && r.http?.status < 500) s += 5;
  if (r.ws?.ok && r.ws?.upgrade) s += 20;
  if (r.http?.isCloudflare) s += 10;
  else if (r.http?.cdn) s += 5;
  return Math.max(0, Math.min(100, s));
}
function scoreTier(score) {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}
function rowClass(r) {
  const s = scoreRow(r);
  if (s >= 80) return 'row-working';
  if (s >= 50) return 'row-good';
  if (s <= 15) return 'row-bad';
  return '';
}

function badgeForStatus(s) {
  if (!s) return `<span class="badge b-no">—</span>`;
  if (s >= 200 && s < 300) return `<span class="badge b-200">${s}</span>`;
  if (s >= 300 && s < 400) return `<span class="badge b-3xx">${s}</span>`;
  if (s >= 400 && s < 500) return `<span class="badge b-4xx">${s}</span>`;
  if (s >= 500) return `<span class="badge b-5xx">${s}</span>`;
  return `<span class="badge b-no">${s}</span>`;
}
function badgeForWs(ws) {
  if (!ws) return `<span class="badge b-no">—</span>`;
  if (!ws.ok) return `<span class="badge b-no" title="${ws.error||''}">FAIL</span>`;
  if (ws.upgrade) return `<span class="badge b-ws">101 OK</span>`;
  return `<span class="badge b-3xx">${ws.status||'?'}</span>`;
}
function badgeForSni(sni) {
  if (!sni) return `<span class="badge b-no">—</span>`;
  if (!sni.ok) return `<span class="badge b-no" title="${sni.error||''}">FAIL</span>`;
  return `<span class="badge b-ok">${sni.tls||'OK'}</span>`;
}
function badgeForCdn(http) {
  if (!http || !http.ok) return `<span class="badge b-no">—</span>`;
  if (http.isCloudflare) return `<span class="badge b-cf">CLOUDFLARE</span>`;
  if (http.cdn) return `<span class="badge b-ok">${http.cdn.toUpperCase()}</span>`;
  return `<span class="badge b-no">—</span>`;
}

function renderTestRow(row, idx) {
  const tr = document.createElement('tr');
  const cls = rowClass(row);
  if (cls) tr.className = cls;
  const score = scoreRow(row);
  const tier = scoreTier(score);
  const isWorking = score >= 60;
  tr.innerHTML = `
    <td>${idx+1}</td>
    <td><strong>${row.host}</strong></td>
    <td>
      <div class="score-cell">
        <div class="score-bar"><div class="score-fill tier-${tier}" style="width:${score}%"></div></div>
        <span class="score-num tier-${tier}">${score}</span>
      </div>
    </td>
    <td>${row.http?.ok ? badgeForStatus(row.http.status) : `<span class="badge b-4xx" title="${row.http?.error||''}">ERR</span>`}</td>
    <td>${badgeForWs(row.ws)}</td>
    <td>${badgeForSni(row.sni)}</td>
    <td>${badgeForCdn(row.http)}</td>
    <td>
      <div class="row-actions">
        <button class="btn-mini" data-act="copy" data-host="${row.host}">COPY</button>
        <button class="btn-mini" data-act="deep" data-host="${row.host}" title="Deep Probe">DEEP</button>
        ${isWorking ? `<button class="btn-mini green" data-act="payload" data-host="${row.host}">PAYLOAD</button>` : ''}
      </div>
    </td>
  `;
  return tr;
}

function renderTestBody() {
  // sort: working first, by score desc
  const sorted = [...allTestRows].sort((a, b) => scoreRow(b) - scoreRow(a));
  const v = testFilter.value;
  const rows = sorted.filter((r) => {
    if (v === 'all') return true;
    if (v === 'cf') return r.http?.isCloudflare;
    if (v === 'ws') return r.ws?.ok && r.ws?.upgrade;
    if (v === '200') return r.http?.ok && r.http?.status === 200;
    if (v === '301') return r.http?.ok && r.http?.status >= 300 && r.http?.status < 400;
    if (v === 'working') return scoreRow(r) >= 60;
    return true;
  });
  testBody.innerHTML = '';
  rows.forEach((r, i) => testBody.appendChild(renderTestRow(r, i)));
  renderTop10(sorted);
}

testFilter.addEventListener('change', renderTestBody);

// row actions delegated
function handleRowAction(btn) {
  const host = btn.dataset.host;
  const act = btn.dataset.act;
  if (act === 'copy') {
    navigator.clipboard.writeText(host); soundClick();
    const orig = btn.textContent;
    btn.textContent = 'OK'; setTimeout(() => (btn.textContent = orig), 1100);
  } else if (act === 'payload') { soundClick(); openPayloadModal(host); }
  else if (act === 'deep') { soundClick(); openDeepModal(host); }
}
testBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (btn) handleRowAction(btn);
});

// === TOP-10 ===
const top10El = document.getElementById('top10');
const top10ListEl = document.getElementById('top10-list');
function renderTop10(sorted) {
  const top = sorted.filter((r) => scoreRow(r) >= 60).slice(0, 10);
  if (!top.length) { top10El.classList.add('hidden'); return; }
  top10El.classList.remove('hidden');
  top10ListEl.innerHTML = '';
  top.forEach((r, i) => {
    const score = scoreRow(r);
    const rankCls = i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : 'r0';
    const div = document.createElement('div');
    div.className = 'top10-item';
    div.innerHTML = `
      <div class="top10-rank ${rankCls}">${i+1}</div>
      <div class="top10-host" title="${r.host}">${r.host}</div>
      <div class="top10-score">${score}%</div>
      <div class="top10-actions">
        <button class="btn-mini" data-act="copy" data-host="${r.host}">COPY</button>
        <button class="btn-mini" data-act="deep" data-host="${r.host}">DEEP</button>
        <button class="btn-mini green" data-act="payload" data-host="${r.host}">USE</button>
      </div>
    `;
    top10ListEl.appendChild(div);
  });
}
top10ListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  e.stopPropagation();
  handleRowAction(btn);
});
document.getElementById('copy-top10').addEventListener('click', () => {
  const items = [...top10ListEl.querySelectorAll('.top10-host')].map((x) => x.textContent.trim());
  if (!items.length) return;
  navigator.clipboard.writeText(items.join('\n'));
  soundDone();
});

// === PAYLOAD MODAL ===
const payloadModal = document.getElementById('payload-modal');
const modalHostEl = document.getElementById('modal-host');
const pfSni = document.getElementById('pf-sni');
const pfMode = document.getElementById('pf-mode');
const pfPort = document.getElementById('pf-port');
const pfPayload = document.getElementById('pf-payload');
const pfNote = document.getElementById('pf-note');
let currentPayloadHost = '';
let currentApp = 'hi';

const PAYLOADS = {
  hi: { // HTTP Injector
    mode: 'SSL/TLS (SNI)', port: '443',
    payload: (h) => `GET / HTTP/1.1[crlf]Host: ${h}[crlf]Upgrade: websocket[crlf]Connection: Keep-Alive[crlf][crlf]`,
    note: 'Settings → SSH/Proxy → Payload Generator. Вставь URL = host, Method = CONNECT/GET, SNI = тот же host, SSL/TLS = ON. SSH-сервер — твой VPS на 22/443.',
  },
  ha: { // HA Tunnel
    mode: 'SSL/TLS', port: '443',
    payload: (h) => `[real_raw_payload]\nGET wss://${h} HTTP/1.1[crlf]Host: ${h}[crlf]Upgrade: websocket[crlf][crlf]`,
    note: 'Custom Payload → Connection Type: SSL/TLS. SNI/SNI Host → этот host. Proxy/Server = твой SSH/UDP сервер. Выбирай хосты с WS 101 или 200 OK.',
  },
  hc: { // HTTP Custom
    mode: 'SSL/TLS (SNI)', port: '443',
    payload: (h) => `GET / HTTP/1.1[crlf]Host: ${h}[crlf][crlf]`,
    note: 'Payload Generator → вставь строку выше. SNI → тот же host. SSL/TLS → ON. Server → твой VPS.',
  },
  dt: { // DarkTunnel
    mode: 'SSL/TLS', port: '443',
    payload: (h) => `(empty / direct)`,
    note: 'Mode = SSL/TLS. SNI Host = этот host. Payload оставь пустым или Direct. Лучше работает с WebSocket-хостами.',
  },
  tls: { // TLS Tunnel
    mode: 'TLS', port: '443',
    payload: (h) => `(empty)`,
    note: 'TLS Mode. SNI = этот host. Server = твой VPS. Никакого payload не нужно.',
  },
};

function openPayloadModal(host) {
  currentPayloadHost = host;
  modalHostEl.textContent = host;
  setPayloadApp(currentApp);
  payloadModal.classList.remove('hidden');
}
function closePayloadModal() {
  payloadModal.classList.add('hidden');
}
function setPayloadApp(app) {
  currentApp = app;
  document.querySelectorAll('.ptab').forEach((b) => b.classList.toggle('active', b.dataset.app === app));
  const def = PAYLOADS[app];
  pfSni.textContent = currentPayloadHost;
  pfMode.textContent = def.mode;
  pfPort.textContent = def.port;
  pfPayload.textContent = def.payload(currentPayloadHost);
  pfNote.textContent = def.note;
}

document.querySelectorAll('.ptab').forEach((b) => b.addEventListener('click', () => { soundClick(); setPayloadApp(b.dataset.app); }));
payloadModal.addEventListener('click', (e) => { if (e.target.dataset.close) closePayloadModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !payloadModal.classList.contains('hidden')) closePayloadModal(); });
payloadModal.querySelectorAll('button[data-copy]').forEach((b) => b.addEventListener('click', () => {
  const txt = document.getElementById(b.dataset.copy).textContent;
  navigator.clipboard.writeText(txt); soundClick();
  b.textContent = 'OK'; setTimeout(() => (b.textContent = 'copy'), 1100);
}));
document.getElementById('copy-all-payload').addEventListener('click', (e) => {
  const def = PAYLOADS[currentApp];
  // Compact, clipboard-friendly: just the values, one per line, no banner
  const txt = `SNI: ${currentPayloadHost}\nPort: ${def.port}\nMode: ${def.mode}\nPayload: ${def.payload(currentPayloadHost)}`;
  navigator.clipboard.writeText(txt); soundDone();
  const btn = e.currentTarget;
  const orig = btn.textContent;
  btn.textContent = 'СКОПИРОВАНО ✓';
  setTimeout(() => (btn.textContent = orig), 1400);
});

function termHttpLine(r) {
  if (!r.http) return;
  if (!r.http.ok) return termWrite(termHttp, `<span class="err">[FAIL]</span> ${r.host} <span class="dim">${r.http.error||''}</span>`);
  const s = r.http.status;
  let cls = 'ok';
  if (s >= 400) cls = 'err';
  else if (s >= 300) cls = 'warn';
  const cf = r.http.isCloudflare ? ' <span class="info">[CF]</span>' : '';
  termWrite(termHttp, `<span class="${cls}">[${s}]</span> ${r.host}${cf} <span class="dim">${r.http.ms}ms</span>`);
}
function termWsLine(r) {
  if (!r.ws) return;
  if (!r.ws.ok) return termWrite(termWs, `<span class="err">[FAIL]</span> ${r.host} <span class="dim">${r.ws.error||''}</span>`);
  if (r.ws.upgrade) return termWrite(termWs, `<span class="info">[101]</span> ${r.host} <span class="ok">UPGRADE</span> <span class="dim">${r.ws.ms}ms</span>`);
  termWrite(termWs, `<span class="warn">[${r.ws.status||'?'}]</span> ${r.host} <span class="dim">no upgrade</span>`);
}
function termSniLine(r) {
  if (!r.sni) return;
  if (!r.sni.ok) return termWrite(termSni, `<span class="err">[FAIL]</span> ${r.host} <span class="dim">${r.sni.error||''}</span>`);
  const cn = r.sni.cert?.subject || '';
  termWrite(termSni, `<span class="ok">[${r.sni.tls}]</span> ${r.host} <span class="dim">${r.sni.alpn||''}${cn?' • '+cn:''}</span>`);
}

testBtn.addEventListener('click', async () => {
  const hosts = testHostsEl.value.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!hosts.length) return;
  soundStart();

  testBtn.classList.add('loading');
  testBtn.disabled = true;
  testResults.classList.add('hidden');
  termClear(termHttp); termClear(termWs); termClear(termSni);
  testBody.innerHTML = '';
  allTestRows = [];
  progress.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressText.textContent = `0 / ${hosts.length}`;

  termWrite(termHttp, `<span class="prompt">$</span> probe (${hosts.length})`, 'hi');
  termWrite(termWs, `<span class="prompt">$</span> probe (${hosts.length})`, 'hi');
  termWrite(termSni, `<span class="prompt">$</span> probe (${hosts.length})`, 'hi');

  // Init session via POST (avoids URL length limits with 700+ hosts)
  let sessionId;
  try {
    const initRes = await fetch('/api/test-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hosts,
        http: document.getElementById('t-http').checked,
        ws: document.getElementById('t-ws').checked,
        sni: document.getElementById('t-sni').checked,
        concurrency: parseInt(document.getElementById('concurrency').value) || 12,
      }),
    });
    const j = await initRes.json();
    if (!initRes.ok) throw new Error(j.error || 'init_failed');
    sessionId = j.id;
    if (j.total < hosts.length) {
      termWrite(termHttp, `<span class="warn">[~]</span> ${hosts.length - j.total} hosts dropped (invalid). queued: ${j.total}`);
    }
  } catch (err) {
    termWrite(termHttp, `<span class="err">[!] init failed: ${err.message}</span>`);
    testBtn.classList.remove('loading'); testBtn.disabled = false;
    return;
  }

  const es = new EventSource('/api/test-stream?id=' + encodeURIComponent(sessionId));
  es.addEventListener('start', () => {
    termWrite(termHttp, `<span class="info">[+]</span> scanning...`);
    termWrite(termWs, `<span class="info">[+]</span> scanning...`);
    termWrite(termSni, `<span class="info">[+]</span> scanning...`);
  });
  es.addEventListener('result', (e) => {
    const r = JSON.parse(e.data);
    allTestRows.push(r);
    termHttpLine(r); termWsLine(r); termSniLine(r);
    progressFill.style.width = (r.progress / r.total * 100) + '%';
    progressText.textContent = `${r.progress} / ${r.total}`;
    if (scoreRow(r) >= 80) soundBlip();
    renderTestBody();
    if (testResults.classList.contains('hidden')) testResults.classList.remove('hidden');
  });
  es.addEventListener('done', (e) => {
    const d = JSON.parse(e.data);
    const working = allTestRows.filter((r) => scoreRow(r) >= 80).length;
    termWrite(termHttp, `<span class="hi">[✔]</span> done. ${d.total} tested.`);
    termWrite(termWs, `<span class="hi">[✔]</span> done.`);
    termWrite(termSni, `<span class="hi">[✔]</span> done.`);
    testBtn.classList.remove('loading');
    testBtn.disabled = false;
    testMeta.textContent = `tested: ${d.total} · working: ${working} · cloudflare: ${allTestRows.filter(r=>r.http?.isCloudflare).length} · ws101: ${allTestRows.filter(r=>r.ws?.upgrade).length}`;
    soundDone();
    es.close();
  });
  es.onerror = () => {
    termWrite(termHttp, `<span class="err">[!] stream error</span>`);
    testBtn.classList.remove('loading'); testBtn.disabled = false;
    es.close();
  };
});

// === EXPORTS ===
function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
document.getElementById('export-test').addEventListener('click', () => {
  if (!allTestRows.length) return;
  const fmt = document.getElementById('export-format').value;
  const sorted = [...allTestRows].sort((a, b) => scoreRow(b) - scoreRow(a));
  const working = sorted.filter((r) => scoreRow(r) >= 60);
  const ts = Date.now();
  soundDone();

  if (fmt === 'json') {
    const out = sorted.map((r) => ({ ...r, score: scoreRow(r) }));
    return download(`44day-test-${ts}.json`, JSON.stringify(out, null, 2), 'application/json');
  }
  if (fmt === 'txt') {
    return download(`44day-hosts-${ts}.txt`, working.map((r) => r.host).join('\n'));
  }
  if (fmt === 'payloads') {
    const lines = [];
    lines.push('# 44Day SNI hosts + ready payloads');
    lines.push(`# generated: ${new Date().toISOString()}`);
    lines.push(`# total working: ${working.length}\n`);
    working.forEach((r, i) => {
      const s = scoreRow(r);
      lines.push(`### ${i+1}. ${r.host}  [score:${s}]  http:${r.http?.status||'-'} ws:${r.ws?.upgrade?'101':(r.ws?.status||'-')} sni:${r.sni?.tls||'-'}${r.http?.isCloudflare?' CF':''}`);
      lines.push(`SNI: ${r.host}`);
      lines.push(`Port: 443`);
      lines.push(`Mode: SSL/TLS`);
      lines.push(`Payload: GET / HTTP/1.1[crlf]Host: ${r.host}[crlf]Upgrade: websocket[crlf][crlf]`);
      lines.push('');
    });
    return download(`44day-payloads-${ts}.txt`, lines.join('\n'));
  }
  if (fmt === 'hat') {
    // HA Tunnel-friendly text config (.hat is proprietary; we export readable .txt named .hat)
    const lines = [];
    lines.push('# 44Day HA Tunnel preset');
    lines.push(`# hosts: ${working.length}`);
    working.forEach((r) => {
      lines.push(`[host]`);
      lines.push(`name = ${r.host}`);
      lines.push(`sni = ${r.host}`);
      lines.push(`port = 443`);
      lines.push(`type = SSL/TLS`);
      lines.push(`payload = GET wss://${r.host} HTTP/1.1[crlf]Host: ${r.host}[crlf]Upgrade: websocket[crlf][crlf]`);
      lines.push('');
    });
    return download(`44day-hatunnel-${ts}.hat`, lines.join('\n'));
  }
  if (fmt === 'ehi') {
    // HTTP Injector-friendly readable preset (real .ehi is encrypted; we provide importable text + JSON)
    const data = {
      app: 'HTTP Injector',
      generated: new Date().toISOString(),
      proxy_type: 'SSH',
      ssl_settings: { sni_enabled: true, port: 443 },
      hosts: working.map((r) => ({
        sni: r.host,
        port: 443,
        payload: `GET / HTTP/1.1[crlf]Host: ${r.host}[crlf]Upgrade: websocket[crlf]Connection: Keep-Alive[crlf][crlf]`,
        score: scoreRow(r),
        cloudflare: !!r.http?.isCloudflare,
      })),
    };
    return download(`44day-injector-${ts}.ehi.json`, JSON.stringify(data, null, 2), 'application/json');
  }
});

// ====================== DEEP PROBE TAB ======================
const deepPanelEl = document.getElementById('deep-panel');
const deepLoadingEl = document.getElementById('deep-loading');
const deepContentEl = document.getElementById('deep-content');
const deepInputEl = document.getElementById('deep-input');
const deepBtn = document.getElementById('deep-btn');

function switchToTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${name}`));
}

async function runDeepProbe(host) {
  if (!host) return;
  deepPanelEl.classList.remove('hidden');
  deepLoadingEl.classList.remove('hidden');
  deepContentEl.classList.add('hidden');
  deepContentEl.innerHTML = '';
  deepBtn.classList.add('loading'); deepBtn.disabled = true;
  // smooth scroll to panel
  setTimeout(() => deepPanelEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

  try {
    const r = await fetch(`/api/deep?host=${encodeURIComponent(host)}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'failed');
    data.host = host;
    renderDeepReport(data);
    soundDone();
  } catch (e) {
    deepContentEl.innerHTML = `<div class="warn-card"><strong>Ошибка:</strong> ${e.message}</div>`;
    deepLoadingEl.classList.add('hidden');
    deepContentEl.classList.remove('hidden');
  } finally {
    deepBtn.classList.remove('loading'); deepBtn.disabled = false;
  }
}

// open from row button — switch tab + run
function openDeepModal(host) {
  deepInputEl.value = host;
  switchToTab('deep');
  runDeepProbe(host);
}

document.getElementById('deep-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const host = deepInputEl.value.trim().toLowerCase();
  if (!host) return;
  soundStart();
  runDeepProbe(host);
});
document.querySelectorAll('[data-deep]').forEach((b) => b.addEventListener('click', () => {
  deepInputEl.value = b.dataset.deep;
  soundClick();
  runDeepProbe(b.dataset.deep);
}));

function deepScore(d) {
  let s = 0;
  const tags = [];
  if (d.tls?.ok) { s += 15; if (d.tls.tls === 'TLSv1.3') { s += 5; tags.push({ t: 'TLS 1.3', cls: 'pos' }); } }
  if (d.http2?.h2) { s += 10; tags.push({ t: 'HTTP/2', cls: 'pos' }); }
  if (d.sniRouting?.sniRouted) { s += 15; tags.push({ t: 'SNI ROUTING', cls: 'pos' }); }
  if (d.domainFronting?.works) { s += 20; tags.push({ t: 'DOMAIN FRONTING', cls: 'pos' }); }
  if (d.replay?.stability >= 100) { s += 10; tags.push({ t: 'STABLE', cls: 'pos' }); }
  else if (d.replay?.stability >= 66) { s += 5; tags.push({ t: 'MOSTLY STABLE', cls: 'neu' }); }
  else if (d.replay?.stability < 50) tags.push({ t: 'UNSTABLE', cls: 'neg' });
  if (d.ping?.success >= 3 && d.ping.avg < 100) { s += 5; tags.push({ t: 'LOW LATENCY', cls: 'pos' }); }
  else if (d.ping?.avg && d.ping.avg > 300) tags.push({ t: 'HIGH LATENCY', cls: 'neg' });
  if (d.ech?.supported) { s += 10; tags.push({ t: 'ECH', cls: 'pos' }); }
  if (d.dns?.ipv6Reachable) { s += 3; tags.push({ t: 'IPv6', cls: 'pos' }); }
  const asnOrg = (d.asn?.asname || d.asn?.org || '').toLowerCase();
  if (/cloudflare|google|amazon|microsoft|fastly|akamai/.test(asnOrg)) { s += 7; tags.push({ t: 'MAJOR CDN', cls: 'pos' }); }
  if (d.tls?.cert?.san?.length >= 10) { s += 5; tags.push({ t: `${d.tls.cert.san.length} SAN`, cls: 'pos' }); }
  return { score: Math.max(0, Math.min(100, s)), tags };
}

function deepTier(s) { return s >= 80 ? 5 : s >= 60 ? 4 : s >= 40 ? 3 : s >= 20 ? 2 : 1; }

function verdict(label, cls) { return `<span class="deep-section-verdict ${cls}">${label}</span>`; }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function fmtDate(d) { if (!d) return '<span class="neu">—</span>'; try { return new Date(d).toISOString().slice(0, 10); } catch { return d; } }

function renderDeepReport(d) {
  const { score, tags } = deepScore(d);
  const tier = deepTier(score);
  const verdictText = score >= 80 ? 'ОТЛИЧНЫЙ КАНДИДАТ' : score >= 60 ? 'ХОРОШИЙ ШАНС' : score >= 40 ? 'СРЕДНИЙ ШАНС' : score >= 20 ? 'СЛАБЫЙ ШАНС' : 'НЕ РЕКОМЕНДУЕТСЯ';

  const sections = [];

  // Summary
  sections.push(`
    <div class="deep-summary">
      <div class="deep-summary-title">DEEP SCORE / ВЕРДИКТ</div>
      <div class="deep-score-big">
        <div class="deep-score-num tier-${tier}">${score}</div>
        <div class="deep-score-label">/ 100 · ${verdictText}</div>
      </div>
      <div class="deep-tags">
        ${tags.length ? tags.map((t) => `<span class="deep-tag ${t.cls}">${t.t}</span>`).join('') : '<span class="deep-tag neu">NO SIGNALS</span>'}
      </div>
    </div>
  `);

  // 1. DNS
  const dns = d.dns || {};
  sections.push(`
    <div class="deep-section">
      <div class="deep-section-head">
        <div class="deep-section-icon">D</div>
        <div class="deep-section-title">DNS Resolution</div>
        ${verdict(dns.ipv4?.length ? 'OK' : 'FAIL', dns.ipv4?.length ? 'dv-good' : 'dv-bad')}
      </div>
      <dl class="deep-grid">
        <dt>IPv4</dt><dd>${dns.ipv4?.length ? dns.ipv4.map((x) => `<code>${x}</code>`).join(' ') : '<span class="neg">none</span>'}</dd>
        <dt>IPv6</dt><dd>${dns.ipv6?.length ? dns.ipv6.map((x) => `<code>${x}</code>`).join(' ') : '<span class="neu">none</span>'}</dd>
        <dt>CNAME</dt><dd>${dns.cname ? `<code>${dns.cname}</code>` : '<span class="neu">—</span>'}</dd>
      </dl>
    </div>
  `);

  // 2. TCP Ping
  const ping = d.ping || {};
  const pingV = ping.success === ping.attempts ? ['STABLE', 'dv-good'] : ping.success > 0 ? ['PARTIAL', 'dv-mid'] : ['DEAD', 'dv-bad'];
  sections.push(`
    <div class="deep-section">
      <div class="deep-section-head">
        <div class="deep-section-icon">P</div>
        <div class="deep-section-title">TCP Ping :443</div>
        ${verdict(pingV[0], pingV[1])}
      </div>
      <dl class="deep-grid">
        <dt>Stability</dt><dd>${ping.success}/${ping.attempts} (${ping.stability}%)</dd>
        <dt>Latency (min/avg/max)</dt><dd>${ping.min ?? '—'} / ${ping.avg ?? '—'} / ${ping.max ?? '—'} ms</dd>
      </dl>
    </div>
  `);

  // 3. TLS
  const tls = d.tls || {};
  if (tls.ok) {
    const cert = tls.cert || {};
    const sanHtml = cert.san?.length
      ? `<div class="san-list">${cert.san.slice(0, 80).map((x) => `<span>${escapeHtml(x)}</span>`).join('')}</div>`
      : '<span class="neu">none</span>';
    sections.push(`
      <div class="deep-section">
        <div class="deep-section-head">
          <div class="deep-section-icon">T</div>
          <div class="deep-section-title">TLS Handshake</div>
          ${verdict(tls.tls === 'TLSv1.3' ? 'TLS 1.3' : tls.tls, tls.tls === 'TLSv1.3' ? 'dv-good' : 'dv-info')}
        </div>
        <dl class="deep-grid">
          <dt>Protocol</dt><dd><code>${tls.tls}</code></dd>
          <dt>Cipher</dt><dd>${tls.cipher ? `<code>${tls.cipher.name}</code>` : '<span class="neu">—</span>'}</dd>
          <dt>ALPN</dt><dd>${tls.alpn ? `<code>${tls.alpn}</code>` : '<span class="neu">—</span>'}</dd>
          <dt>Fingerprint</dt><dd><code>${tls.fingerprint || '—'}</code></dd>
          <dt>Cert CN</dt><dd>${escapeHtml(cert.subject || '—')}</dd>
          <dt>Issuer</dt><dd>${escapeHtml(cert.issuer || '—')}</dd>
          <dt>Valid until</dt><dd>${fmtDate(cert.valid_to)}</dd>
          <dt>Chain depth</dt><dd>${tls.chain?.length || 1}</dd>
          <dt>SAN (${cert.san?.length || 0})</dt><dd>${sanHtml}</dd>
        </dl>
      </div>
    `);
  } else {
    sections.push(`<div class="deep-section"><div class="deep-section-head"><div class="deep-section-icon">T</div><div class="deep-section-title">TLS Handshake</div>${verdict('FAIL', 'dv-bad')}</div><div class="muted">Error: ${tls.error || 'unknown'}</div></div>`);
  }

  // 4. HTTP/2
  const h2 = d.http2 || {};
  sections.push(`
    <div class="deep-section">
      <div class="deep-section-head">
        <div class="deep-section-icon">2</div>
        <div class="deep-section-title">HTTP/2 (ALPN h2)</div>
        ${verdict(h2.h2 ? 'SUPPORTED' : 'NO', h2.h2 ? 'dv-good' : 'dv-mid')}
      </div>
      <dl class="deep-grid">
        <dt>Negotiated</dt><dd>${h2.h2 ? '<span class="pos">h2 (HTTP/2)</span>' : `<span class="neu">${h2.alpn || 'http/1.1'}</span>`}</dd>
      </dl>
    </div>
  `);

  // 5. SNI Routing
  const sr = d.sniRouting || {};
  sections.push(`
    <div class="deep-section">
      <div class="deep-section-head">
        <div class="deep-section-icon">S</div>
        <div class="deep-section-title">SNI Routing</div>
        ${verdict(sr.sniRouted ? 'YES' : 'NO', sr.sniRouted ? 'dv-good' : 'dv-mid')}
      </div>
      <dl class="deep-grid">
        <dt>With SNI</dt><dd>${escapeHtml(sr.withSni || '—')}</dd>
        <dt>Without SNI</dt><dd>${escapeHtml(sr.withoutSni || '—')}</dd>
        <dt>Verdict</dt><dd>${sr.sniRouted ? '<span class="pos">Сервер использует SNI-маршрутизацию (хорошо для bypass)</span>' : '<span class="neu">Один сертификат для всех — без SNI-роутинга</span>'}</dd>
      </dl>
    </div>
  `);

  // 6. Domain Fronting
  const df = d.domainFronting || {};
  sections.push(`
    <div class="deep-section">
      <div class="deep-section-head">
        <div class="deep-section-icon">F</div>
        <div class="deep-section-title">Domain Fronting</div>
        ${verdict(df.works ? 'WORKS' : df.ok ? 'BLOCKED' : 'FAIL', df.works ? 'dv-good' : df.ok ? 'dv-mid' : 'dv-bad')}
      </div>
      <dl class="deep-grid">
        <dt>Test</dt><dd>SNI=${escapeHtml(d.host)}, Host: www.facebook.com</dd>
        <dt>Status</dt><dd>${df.status ? `<code>${df.status}</code>` : '<span class="neu">—</span>'}</dd>
        <dt>Verdict</dt><dd>${df.works ? '<span class="pos">Сервер пересылает по Host-заголовку — fronting возможен</span>' : '<span class="neu">Сервер требует совпадения SNI и Host (нормально для большинства)</span>'}</dd>
      </dl>
    </div>
  `);

  // 7. Replay
  const rep = d.replay || {};
  sections.push(`
    <div class="deep-section">
      <div class="deep-section-head">
        <div class="deep-section-icon">R</div>
        <div class="deep-section-title">Replay Stability</div>
        ${verdict(rep.stability + '%', rep.stability >= 100 ? 'dv-good' : rep.stability >= 66 ? 'dv-mid' : 'dv-bad')}
      </div>
      <dl class="deep-grid">
        <dt>Success</dt><dd>${rep.success}/${rep.attempts}</dd>
        <dt>Samples (ms)</dt><dd>${(rep.samples || []).map((s) => `<code class="${s.ok ? 'pos' : 'neg'}">${s.ok ? s.ms : 'FAIL'}</code>`).join(' ')}</dd>
      </dl>
    </div>
  `);

  // 8. ASN
  const asn = d.asn || {};
  if (asn) {
    const asnOrg = (asn.asname || asn.org || '').toLowerCase();
    const isMajor = /cloudflare|google|amazon|microsoft|fastly|akamai/.test(asnOrg);
    sections.push(`
      <div class="deep-section">
        <div class="deep-section-head">
          <div class="deep-section-icon">A</div>
          <div class="deep-section-title">ASN / GeoIP</div>
          ${verdict(isMajor ? 'MAJOR CDN' : 'OK', isMajor ? 'dv-good' : 'dv-info')}
        </div>
        <dl class="deep-grid">
          <dt>ASN</dt><dd><code>${escapeHtml(asn.asn || '—')}</code></dd>
          <dt>ISP / Org</dt><dd>${escapeHtml(asn.isp || asn.org || '—')}</dd>
          <dt>Country</dt><dd>${escapeHtml(asn.country || '—')} ${asn.cc ? `(${asn.cc})` : ''}</dd>
          <dt>City</dt><dd>${escapeHtml(asn.city || '—')}, ${escapeHtml(asn.region || '—')}</dd>
        </dl>
      </div>
    `);
  }

  // 9. ECH
  const ech = d.ech || {};
  sections.push(`
    <div class="deep-section">
      <div class="deep-section-head">
        <div class="deep-section-icon">E</div>
        <div class="deep-section-title">ECH (Encrypted ClientHello)</div>
        ${verdict(ech.supported ? 'SUPPORTED' : 'NO', ech.supported ? 'dv-good' : 'dv-mid')}
      </div>
      <dl class="deep-grid">
        <dt>HTTPS RR</dt><dd>${ech.hasHttpsRR ? '<span class="pos">found</span>' : '<span class="neu">none</span>'}</dd>
        <dt>ECH</dt><dd>${ech.supported ? '<span class="pos">enabled</span>' : '<span class="neu">disabled</span>'}</dd>
        <dt>ALPN hint</dt><dd>${ech.alpn?.length ? ech.alpn.map((x) => `<code>${x}</code>`).join(' ') : '<span class="neu">—</span>'}</dd>
      </dl>
    </div>
  `);

  deepContentEl.innerHTML = sections.join('');
  deepLoadingEl.classList.add('hidden');
  deepContentEl.classList.remove('hidden');
}
