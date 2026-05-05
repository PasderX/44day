// ===== 44day_ — online counter via SSE =====
(() => {
  if (window.__onlineLoaded) return;
  window.__onlineLoaded = true;

  // inject badge
  const badge = document.createElement('div');
  badge.id = 'online-badge';
  badge.innerHTML = `
    <span class="ob-dot"></span>
    <span class="ob-num" id="ob-num">—</span>
    <span class="ob-lbl">online</span>`;
  document.body.appendChild(badge);

  const $num = badge.querySelector('#ob-num');
  let es = null;

  function connect() {
    try {
      es = new EventSource('/api/online');
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (typeof d.online === 'number') {
            $num.textContent = d.online;
            badge.classList.add('pulse');
            setTimeout(() => badge.classList.remove('pulse'), 320);
          }
        } catch {}
      };
      es.onerror = () => {
        try { es.close(); } catch {}
        setTimeout(connect, 4000);
      };
    } catch {}
  }
  // delay so it doesn't fight with initial page loads
  setTimeout(connect, 800);
})();
