// ===== 44day_ — music player (YouTube · NCS playlists) =====
// Использует YouTube IFrame API для проигрывания готовых NCS плейлистов.
// NCS = No Copyright Sounds — бесплатно, легально, идеально под "хакерскую" атмосферу.
(() => {
  // Известные публичные NCS плейлисты на YouTube
  const PLAYLISTS = [
    { id: 'PLRBp0Fe2GpgmsW46rJyudVFlY6IYjFBIK', name: 'NCS · Best of',          tag: 'best' },
    { id: 'PLRBp0Fe2GpgnIh0AiYKh7o7HnYAej-5ph', name: 'NCS · House',            tag: 'house' },
    { id: 'PLRBp0Fe2Gpgn3XFmFjRsjr0ppHRR9Ja7t', name: 'NCS · Trap',             tag: 'trap' },
    { id: 'PLRBp0Fe2GpgmW1FrdpgQ7nEjcmuWHmphb', name: 'NCS · Drum & Bass',      tag: 'd&b' },
    { id: 'PLRBp0Fe2Gpgkv-pxNiPvpqxJhZIVbtqLB', name: 'NCS · Dubstep',          tag: 'dub' },
    { id: 'PLRBp0Fe2GpgnZOm5rCopMAOYhZCPoUyJ5', name: 'NCS · Hard Dance',       tag: 'hard' },
    { id: 'PLRBp0Fe2GpgnIj3HMSwK1dT6fEWbuLpp1', name: 'NCS · Future Bass',      tag: 'fbass' },
    { id: 'PLRBp0Fe2GpglqzC9X-tkeKt2pCPgiYvAJ', name: 'NCS · Dance',            tag: 'dance' },
  ];

  const LS_PL  = '44day-mp-pl';
  const LS_VOL = '44day-mp-vol';

  const mount = document.getElementById('music-player-mount') || document.body;
  const inTopbar = mount.id === 'music-player-mount';

  const root = document.createElement('div');
  root.id = 'music-player';
  root.classList.add('yt');
  if (inTopbar) root.classList.add('in-topbar');
  root.innerHTML = `
    <button class="mp-toggle" id="mp-toggle" data-tip="music (M)" aria-label="music">
      <svg class="mp-ico-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      <svg class="mp-ico-pause" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
      <div class="mp-eq"><span></span><span></span><span></span><span></span></div>
    </button>
    <div class="mp-panel" role="dialog" aria-label="music player">
      <div class="mp-head">
        <span class="mp-now" id="mp-now">▶ NCS · No Copyright Sounds</span>
      </div>
      <div class="mp-yt-host"><div id="mp-yt"></div></div>
      <div class="mp-track-title" id="mp-track">— select playlist —</div>
      <div class="mp-pl-list" id="mp-pl-list"></div>
      <div class="mp-controls">
        <button class="mp-btn" id="mp-prev" data-tip="prev track [">‹‹</button>
        <button class="mp-btn" id="mp-pp"   data-tip="play/pause">▶</button>
        <button class="mp-btn" id="mp-next" data-tip="next track ]">››</button>
        <input type="range" class="mp-vol" id="mp-vol" min="0" max="100" value="55"/>
        <span class="mp-vol-val" id="mp-vol-val">55</span>
      </div>
    </div>
  `;
  mount.appendChild(root);

  const $toggle = root.querySelector('#mp-toggle');
  const $panel  = root.querySelector('.mp-panel');
  const $now    = root.querySelector('#mp-now');
  const $list   = root.querySelector('#mp-pl-list');
  const $vol    = root.querySelector('#mp-vol');
  const $volVal = root.querySelector('#mp-vol-val');
  const $prev   = root.querySelector('#mp-prev');
  const $next   = root.querySelector('#mp-next');
  const $pp     = root.querySelector('#mp-pp');
  const $track  = root.querySelector('#mp-track');

  let curIdx = -1;
  let panelOpen = false;
  let player = null;
  let isPlaying = false;
  let pendingPL = null; // wait until API ready

  // ---- Load YouTube IFrame API once ----
  if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('mp-yt', {
      height: '100%',
      width: '100%',
      playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0, playsinline: 1 },
      events: {
        onReady: () => {
          player.setVolume(parseInt($vol.value, 10));
          if (pendingPL != null) loadPL(pendingPL);
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            isPlaying = true; $pp.textContent = '❚❚';
            $toggle.classList.add('is-playing');
            updateTrackTitle();
          } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
            isPlaying = false; $pp.textContent = '▶';
            $toggle.classList.remove('is-playing');
          } else if (e.data === YT.PlayerState.BUFFERING) {
            updateTrackTitle();
          }
        },
      },
    });
  };

  function updateTrackTitle() {
    try {
      const data = player && player.getVideoData && player.getVideoData();
      if (data && data.title) $track.textContent = '♪ ' + data.title;
    } catch (_) {}
  }

  function renderList() {
    $list.innerHTML = PLAYLISTS.map((p, i) => `
      <button class="mp-station ${i === curIdx ? 'is-active' : ''}" data-i="${i}">
        <span class="mp-st-name">${p.name}</span>
        <span class="mp-tag">${p.tag}</span>
      </button>`).join('');
    $list.querySelectorAll('.mp-station').forEach((b) => {
      b.addEventListener('click', () => loadPL(parseInt(b.dataset.i, 10)));
    });
  }

  function loadPL(i) {
    if (i < 0 || i >= PLAYLISTS.length) return;
    curIdx = i;
    const pl = PLAYLISTS[i];
    localStorage.setItem(LS_PL, pl.id);
    $now.textContent = '▶ ' + pl.name;
    $track.textContent = 'loading…';
    if (!player || !player.loadPlaylist) {
      pendingPL = i;
      renderList();
      return;
    }
    player.loadPlaylist({ list: pl.id, listType: 'playlist', index: 0, suggestedQuality: 'small' });
    renderList();
  }

  function play() { if (player && player.playVideo) player.playVideo(); }
  function pause() { if (player && player.pauseVideo) player.pauseVideo(); }
  function togglePlay() {
    if (!player) return;
    if (curIdx < 0) { loadPL(0); return; }
    isPlaying ? pause() : play();
  }
  function nextTrack() { if (player && player.nextVideo) player.nextVideo(); }
  function prevTrack() { if (player && player.previousVideo) player.previousVideo(); }

  function openPanel()  { panelOpen = true;  root.classList.add('open'); }
  function closePanel() { panelOpen = false; root.classList.remove('open'); }
  function togglePanel() { panelOpen ? closePanel() : openPanel(); }

  $toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (curIdx < 0) togglePanel();
    else togglePlay();
  });
  $toggle.addEventListener('contextmenu', (e) => { e.preventDefault(); togglePanel(); });
  $now.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
  $pp.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
  $prev.addEventListener('click', (e) => { e.stopPropagation(); prevTrack(); });
  $next.addEventListener('click', (e) => { e.stopPropagation(); nextTrack(); });

  $vol.addEventListener('input', () => {
    const v = parseInt($vol.value, 10);
    $volVal.textContent = v;
    localStorage.setItem(LS_VOL, v);
    if (player && player.setVolume) player.setVolume(v);
  });

  $panel.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => { if (panelOpen) closePanel(); });

  document.addEventListener('keydown', (e) => {
    const inField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
    if (inField) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); togglePanel(); }
    else if (e.key === '[') { e.preventDefault(); prevTrack(); }
    else if (e.key === ']') { e.preventDefault(); nextTrack(); }
    else if (e.key === 'Escape' && panelOpen) { closePanel(); }
  });

  // ===== init =====
  const savedVol = parseInt(localStorage.getItem(LS_VOL) || '55', 10);
  $vol.value = savedVol;
  $volVal.textContent = savedVol;

  const savedPLId = localStorage.getItem(LS_PL);
  if (savedPLId) {
    const idx = PLAYLISTS.findIndex((p) => p.id === savedPLId);
    if (idx >= 0) curIdx = idx;
  }
  renderList();
})();
