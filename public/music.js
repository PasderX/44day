// ===== 44day_ — music player (mounts into topbar) =====
(() => {
  const STATIONS = [
    { id: 'nightride',  name: 'Nightride FM',          tag: 'synthwave',  url: 'https://stream.nightride.fm/nightride.mp3' },
    { id: 'chillsynth', name: 'ChillSynth FM',         tag: 'chill',      url: 'https://stream.nightride.fm/chillsynth.mp3' },
    { id: 'darksynth',  name: 'DarkSynth FM',          tag: 'darksynth',  url: 'https://stream.nightride.fm/darksynth.mp3' },
    { id: 'spacesynth', name: 'SpaceSynth FM',         tag: 'space',      url: 'https://stream.nightride.fm/spacesynth.mp3' },
    { id: 'defcon',     name: 'SomaFM · DEF CON Radio', tag: 'hacker',     url: 'https://ice1.somafm.com/defcon-128-mp3' },
    { id: 'dronezone',  name: 'SomaFM · Drone Zone',   tag: 'ambient',    url: 'https://ice1.somafm.com/dronezone-128-mp3' },
    { id: 'beat',       name: 'SomaFM · Beat Blender', tag: 'downtempo',  url: 'https://ice1.somafm.com/beatblender-128-mp3' },
    { id: 'groove',     name: 'SomaFM · Groove Salad', tag: 'chillout',   url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
    { id: 'cliq',       name: 'SomaFM · cliqhop idm',  tag: 'idm',        url: 'https://ice1.somafm.com/cliqhop-128-mp3' },
    { id: 'covers',     name: 'SomaFM · Covers',       tag: 'covers',     url: 'https://ice1.somafm.com/covers-128-mp3' },
  ];

  const LS_STATION = '44day-mp-station';
  const LS_VOL     = '44day-mp-vol';

  // mount target: #music-player-mount (in topbar) or body fallback
  const mount = document.getElementById('music-player-mount') || document.body;
  const inTopbar = mount.id === 'music-player-mount';

  const root = document.createElement('div');
  root.id = 'music-player';
  if (inTopbar) root.classList.add('in-topbar');
  root.innerHTML = `
    <button class="mp-toggle" id="mp-toggle" title="music (M)" aria-label="music">
      <svg class="mp-ico-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      <svg class="mp-ico-pause" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
      <div class="mp-eq"><span></span><span></span><span></span><span></span></div>
    </button>
    <div class="mp-panel" role="dialog" aria-label="music player">
      <div class="mp-head">
        <span class="mp-now" id="mp-now">— select station —</span>
      </div>
      <div class="mp-stations" id="mp-stations"></div>
      <div class="mp-controls">
        <button class="mp-btn" id="mp-prev" title="prev [">‹</button>
        <button class="mp-btn" id="mp-next" title="next ]">›</button>
        <input type="range" class="mp-vol" id="mp-vol" min="0" max="100" value="55"/>
        <span class="mp-vol-val" id="mp-vol-val">55</span>
      </div>
    </div>
    <audio id="mp-audio" preload="none" crossorigin="anonymous"></audio>
  `;
  mount.appendChild(root);

  const $toggle    = root.querySelector('#mp-toggle');
  const $panel     = root.querySelector('.mp-panel');
  const $now       = root.querySelector('#mp-now');
  const $stations  = root.querySelector('#mp-stations');
  const $audio     = root.querySelector('#mp-audio');
  const $vol       = root.querySelector('#mp-vol');
  const $volVal    = root.querySelector('#mp-vol-val');
  const $prev      = root.querySelector('#mp-prev');
  const $next      = root.querySelector('#mp-next');

  let curIdx = -1;
  let isPlaying = false;
  let panelOpen = false;

  function renderStations() {
    $stations.innerHTML = STATIONS.map((s, i) => `
      <button class="mp-station ${i === curIdx ? 'is-active' : ''}" data-i="${i}">
        <span class="mp-st-dot"></span>
        <span class="mp-st-name">${s.name}</span>
        <span class="mp-tag">${s.tag}</span>
      </button>`).join('');
    $stations.querySelectorAll('.mp-station').forEach((b) => {
      b.addEventListener('click', () => playIdx(parseInt(b.dataset.i, 10)));
    });
  }

  function playIdx(i) {
    if (i < 0 || i >= STATIONS.length) return;
    curIdx = i;
    const st = STATIONS[i];
    localStorage.setItem(LS_STATION, st.id);
    $audio.src = st.url;
    $now.textContent = `loading… ${st.name}`;
    $audio.play().then(() => {
      isPlaying = true;
      $toggle.classList.add('is-playing');
      $now.textContent = `▶ ${st.name}`;
    }).catch((err) => {
      console.warn('music play failed:', err);
      $now.textContent = `× cannot play ${st.name}`;
      isPlaying = false;
      $toggle.classList.remove('is-playing');
    });
    renderStations();
  }
  function stop() {
    $audio.pause();
    isPlaying = false;
    $toggle.classList.remove('is-playing');
    if (curIdx >= 0) $now.textContent = `❚❚ ${STATIONS[curIdx].name}`;
  }
  function togglePlay() {
    if (isPlaying) { stop(); }
    else if (curIdx >= 0) { playIdx(curIdx); }
    else { playIdx(0); }
  }
  function openPanel()  { panelOpen = true;  root.classList.add('open'); }
  function closePanel() { panelOpen = false; root.classList.remove('open'); }
  function togglePanel() { panelOpen ? closePanel() : openPanel(); }

  // click toggle: short click → toggle play. but if nothing playing yet → open panel.
  $toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (curIdx < 0) {
      togglePanel();
    } else {
      togglePlay();
    }
  });
  // long-press / right-click → open panel
  $toggle.addEventListener('contextmenu', (e) => { e.preventDefault(); togglePanel(); });

  // dedicated panel-open: clicking "now playing" text opens panel too
  $now.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });

  $prev.addEventListener('click', (e) => { e.stopPropagation(); playIdx((curIdx - 1 + STATIONS.length) % STATIONS.length); });
  $next.addEventListener('click', (e) => { e.stopPropagation(); playIdx((curIdx + 1) % STATIONS.length); });

  $vol.addEventListener('input', () => {
    $audio.volume = $vol.value / 100;
    $volVal.textContent = $vol.value;
    localStorage.setItem(LS_VOL, $vol.value);
  });
  $audio.addEventListener('ended', stop);
  $audio.addEventListener('error', () => {
    $now.textContent = `× stream error`;
    isPlaying = false;
    $toggle.classList.remove('is-playing');
  });
  $panel.addEventListener('click', (e) => e.stopPropagation());

  // close panel on outside click
  document.addEventListener('click', () => { if (panelOpen) closePanel(); });

  // hotkeys
  document.addEventListener('keydown', (e) => {
    const inField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
    if (inField) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); togglePanel(); }
    else if (e.key === '[') { e.preventDefault(); $prev.click(); }
    else if (e.key === ']') { e.preventDefault(); $next.click(); }
    else if (e.key === 'Escape' && panelOpen) { closePanel(); }
  });

  // ===== init =====
  const savedVol = parseInt(localStorage.getItem(LS_VOL) || '55', 10);
  $vol.value = savedVol;
  $volVal.textContent = savedVol;
  $audio.volume = savedVol / 100;

  const savedId = localStorage.getItem(LS_STATION);
  if (savedId) {
    const idx = STATIONS.findIndex((s) => s.id === savedId);
    if (idx >= 0) {
      curIdx = idx;
      $now.textContent = STATIONS[idx].name;
    }
  }
  renderStations();
})();
