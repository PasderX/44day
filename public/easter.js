// ===== 44Day Hub — Easter eggs =====
(function () {
  // ---- Console banner ----
  try {
    const big = `
   ▄▄▄▄    ▄▄▄    █████▄  ▄▄▄    ▄  ▄
   █  █▄▄ ▀▄ ▄▀   █  ▄ █ ▀▄ ▄▀   ▀▄ █
   █▄▄▄▄█  █▄█    █▄▄▄▄█  █▄█    ▄▀▄▀
                  44Day · HUB
`;
    const css1 = 'color:#3ddc84;font-family:monospace;font-size:14px;';
    const css2 = 'color:#a78bfa;font-family:monospace;';
    console.log('%c' + big, css1);
    console.log('%cYou found the dev console. Welcome, hacker.', css2);
    console.log('%cTip: press ` or Ctrl+K to open command palette.', css2);
    console.log('%cKonami code unlocks the matrix. ↑↑↓↓←→←→BA', css2);
  } catch {}

  // ---- Konami code ----
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let buf = [];
  document.addEventListener('keydown', (e) => {
    buf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (buf.length > KONAMI.length) buf.shift();
    if (buf.length === KONAMI.length && buf.every((k, i) => k === KONAMI[i])) {
      buf = [];
      triggerMatrix();
    }
  });

  function triggerMatrix() {
    document.body.classList.add('matrix-fullscreen');
    showToast('🔓 Konami unlocked. Welcome to the matrix.', 'ok');
    setTimeout(() => document.body.classList.remove('matrix-fullscreen'), 9000);
  }
  window.triggerMatrix = triggerMatrix;

  // ---- ?glitch=1 ----
  try {
    const url = new URL(location.href);
    if (url.searchParams.get('glitch') === '1') {
      document.body.classList.add('glitch');
    }
  } catch {}

  // ---- mini toast ----
  function showToast(msg, kind) {
    let t = document.getElementById('easter-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'easter-toast';
      t.className = 'easter-toast';
      document.body.appendChild(t);
    }
    t.className = 'easter-toast show ' + (kind || '');
    t.textContent = msg;
    clearTimeout(t._tid);
    t._tid = setTimeout(() => t.classList.remove('show'), 3500);
  }
  window.showToast = showToast;
})();
