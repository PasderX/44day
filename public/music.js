// ===== 44day_ — MP3 player =====
// Воспроизводит файлы из /public/music/ (список через /api/music)
(() => {
  const STATE_KEY = '44day:music:state';

  let tracks = [];
  let idx = 0;
  let audio = null;
  let isOpen = false;
  let panelEl = null;
  let triggerEl = null;

  // ---------- persistence ----------
  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        idx,
        volume: audio ? audio.volume : 0.6,
        time: audio ? audio.currentTime : 0,
        playing: audio ? !audio.paused : false,
      }));
    } catch (_) {}
  }
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); }
    catch (_) { return {}; }
  }

  // ---------- helpers ----------
  function fmtTime(t) {
    if (!isFinite(t) || t < 0) t = 0;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // ---------- DOM ----------
  function makeTrigger() {
    const wrap = document.getElementById('music-player-mount');
    if (!wrap) return;

    const btn = document.createElement('button');
    btn.id = 'mp-trigger';
    btn.className = 'mp-trigger';
    btn.setAttribute('data-tip', 'плеер');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>`;
    btn.addEventListener('click', (e) => { e.preventDefault(); togglePanel(); });
    wrap.appendChild(btn);
    triggerEl = btn;
    console.log('[music] trigger ready');
  }

  function makePanel() {
    const panel = document.createElement('div');
    panel.id = 'mp-panel';
    panel.className = 'mp-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="mp-head">
        <span class="mp-title-h">♪ player</span>
        <button class="mp-close" aria-label="close">×</button>
      </div>
      <div class="mp-now" id="mp-now">— нет треков —</div>
      <div class="mp-progress">
        <span class="mp-cur" id="mp-cur">0:00</span>
        <input type="range" id="mp-seek" min="0" max="100" value="0" step="0.1"/>
        <span class="mp-dur" id="mp-dur">0:00</span>
      </div>
      <div class="mp-controls">
        <button id="mp-prev" data-tip="назад"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg></button>
        <button id="mp-play" data-tip="play / pause"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
        <button id="mp-next" data-tip="вперёд"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 6v12l9-6z"/></svg></button>
        <div class="mp-vol">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          <input type="range" id="mp-vol" min="0" max="1" step="0.01" value="0.6"/>
        </div>
      </div>
      <ul class="mp-list" id="mp-list"></ul>
    `;
    document.body.appendChild(panel);
    panelEl = panel;

    panel.querySelector('.mp-close').addEventListener('click', () => togglePanel(false));
    panel.querySelector('#mp-prev').addEventListener('click', prev);
    panel.querySelector('#mp-next').addEventListener('click', next);
    panel.querySelector('#mp-play').addEventListener('click', toggle);
    panel.querySelector('#mp-vol').addEventListener('input', (e) => {
      if (audio) { audio.volume = parseFloat(e.target.value); saveState(); }
    });
    panel.querySelector('#mp-seek').addEventListener('input', (e) => {
      if (audio && isFinite(audio.duration)) {
        audio.currentTime = (parseFloat(e.target.value) / 100) * audio.duration;
      }
    });
  }

  function renderList() {
    const list = document.getElementById('mp-list');
    if (!list) return;
    if (!tracks.length) {
      list.innerHTML = `<li class="mp-empty">кинь .mp3 в <code>public/music/</code> и обнови</li>`;
      return;
    }
    list.innerHTML = tracks.map((t, i) => `
      <li class="mp-item ${i === idx ? 'is-active' : ''}" data-i="${i}">
        <span class="mp-i-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="mp-i-title">
          ${t.artist ? `<em>${esc(t.artist)}</em> · ` : ''}${esc(t.title)}
        </span>
      </li>
    `).join('');
    list.querySelectorAll('.mp-item').forEach((el) => {
      el.addEventListener('click', () => {
        idx = parseInt(el.dataset.i, 10);
        load(idx, true);
      });
    });
  }

  function updateNow() {
    const now = document.getElementById('mp-now');
    if (!now) return;
    if (!tracks[idx]) { now.textContent = '— нет треков —'; return; }
    const t = tracks[idx];
    now.innerHTML = `<span class="mp-now-art">${esc(t.artist || '')}</span><span class="mp-now-tt">${esc(t.title)}</span>`;
  }

  // ---------- audio ----------
  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'metadata';

    audio.addEventListener('timeupdate', () => {
      const cur = document.getElementById('mp-cur');
      const seek = document.getElementById('mp-seek');
      if (cur) cur.textContent = fmtTime(audio.currentTime);
      if (seek && isFinite(audio.duration) && audio.duration > 0) {
        seek.value = (audio.currentTime / audio.duration) * 100;
      }
    });
    audio.addEventListener('loadedmetadata', () => {
      const dur = document.getElementById('mp-dur');
      if (dur) dur.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener('ended', next);
    audio.addEventListener('play',  () => updatePlayBtn(true));
    audio.addEventListener('pause', () => updatePlayBtn(false));
    return audio;
  }

  function updatePlayBtn(playing) {
    const btn = document.getElementById('mp-play');
    if (!btn) return;
    btn.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    if (triggerEl) triggerEl.classList.toggle('is-playing', playing);
  }

  function load(i, autoplay) {
    if (!tracks.length) return;
    idx = ((i % tracks.length) + tracks.length) % tracks.length;
    const a = ensureAudio();
    a.src = tracks[idx].url;
    updateNow();
    renderList();
    saveState();
    if (autoplay) {
      a.play().catch(() => {/* user-interaction needed */});
    }
  }

  function toggle() {
    if (!tracks.length) return;
    const a = ensureAudio();
    if (!a.src) load(idx, true);
    else if (a.paused) a.play().catch(() => {});
    else a.pause();
    saveState();
  }
  function next() { load(idx + 1, true); }
  function prev() { load(idx - 1, true); }

  function togglePanel(force) {
    isOpen = (typeof force === 'boolean') ? force : !isOpen;
    console.log('[music] togglePanel', { isOpen, hasPanel: !!panelEl, tracks: tracks.length });
    if (!panelEl) {
      console.warn('[music] panelEl missing — recreating');
      try { makePanel(); } catch (e) { console.error('[music] makePanel error', e); return; }
    }
    panelEl.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) renderList();
  }

  // ---------- bootstrap ----------
  async function init() {
    try { makeTrigger(); } catch (e) { console.error('[music] makeTrigger error', e); }
    try { makePanel(); } catch (e) { console.error('[music] makePanel error', e); }
    try {
      const r = await fetch('/api/music').then((r) => r.json());
      tracks = r.tracks || [];
    } catch (_) { tracks = []; }
    const st = loadState();
    if (typeof st.idx === 'number' && tracks[st.idx]) idx = st.idx;
    if (tracks.length) {
      const a = ensureAudio();
      a.volume = (typeof st.volume === 'number') ? st.volume : 0.6;
      const volEl = document.getElementById('mp-vol');
      if (volEl) volEl.value = a.volume;
      a.src = tracks[idx].url;
      if (typeof st.time === 'number') {
        a.addEventListener('loadedmetadata', () => { try { a.currentTime = st.time; } catch (_) {} }, { once: true });
      }
    }
    updateNow();
    renderList();
    setInterval(saveState, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
