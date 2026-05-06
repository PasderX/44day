// ===== 44day_ — retro UI sounds (Web Audio, no files) =====
(() => {
  const KEY = '44day:sound:on';
  let enabled = localStorage.getItem(KEY) !== '0';
  let ctx = null;

  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (_) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, vol) {
    if (!enabled) return;
    const a = ac(); if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(vol || 0.06, a.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }

  const SFX = {
    click: () => tone(880, 0.04, 'square', 0.05),
    tick:  () => tone(1200, 0.025, 'square', 0.03),
    beep:  () => tone(660, 0.08, 'sine', 0.07),
    pop:   () => { tone(700, 0.05, 'triangle', 0.06); setTimeout(() => tone(1100, 0.05, 'triangle', 0.05), 40); },
    err:   () => { tone(220, 0.12, 'sawtooth', 0.06); setTimeout(() => tone(180, 0.18, 'sawtooth', 0.05), 60); },
  };

  window.snd = (name) => { try { (SFX[name] || (() => {}))(); } catch (_) {} };

  // hover-tick on rail buttons & topbar
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest && e.target.closest('.rail-btn, .theme-btn, .lang-btn, .search-trigger, .mp-trigger, .aa-btn');
    if (t && !t.dataset.sndHover) { t.dataset.sndHover = '1'; window.snd('tick'); }
  });
  document.addEventListener('mouseout', (e) => {
    const t = e.target.closest && e.target.closest('.rail-btn, .theme-btn, .lang-btn, .search-trigger, .mp-trigger, .aa-btn');
    if (t) delete t.dataset.sndHover;
  });
  // click feedback
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('.rail-btn, .theme-btn, .lang-btn, .search-trigger, .mp-trigger, .item-row, .cat-row, .read-btn');
    if (t) window.snd('click');
  });

  // mute toggle button — injected next to theme switch
  function injectToggle() {
    const ts = document.querySelector('.theme-switch');
    if (!ts || document.getElementById('snd-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'snd-toggle';
    btn.className = 'theme-btn snd-toggle';
    btn.setAttribute('data-tip', enabled ? 'sound on' : 'sound off');
    btn.innerHTML = svgFor(enabled);
    btn.addEventListener('click', () => {
      enabled = !enabled;
      localStorage.setItem(KEY, enabled ? '1' : '0');
      btn.innerHTML = svgFor(enabled);
      btn.setAttribute('data-tip', enabled ? 'sound on' : 'sound off');
      btn.classList.toggle('is-muted', !enabled);
      if (enabled) window.snd('beep');
    });
    btn.classList.toggle('is-muted', !enabled);
    ts.parentNode.insertBefore(btn, ts.nextSibling);
  }
  function svgFor(on) {
    return on
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }
})();
