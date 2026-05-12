// ===== 44day_ — online counter via SSE =====
// DISABLED by user request — keep the file as a no-op so old script tags don't 404.
(() => { return; })();
(() => {
  if (window.__onlineLoaded) return;
  window.__onlineLoaded = true;

  // inject badge
  const badge = document.createElement('div');
  badge.id = 'online-badge';
  badge.setAttribute('data-tip', 'онлайн на сайте сейчас');
  badge.innerHTML = `
    <span class="ob-dot"></span>
    <span class="ob-stack">
      <span class="ob-num" id="ob-num">—</span>
      <span class="ob-lbl">online</span>
    </span>
    <span class="ob-spark" id="ob-spark"></span>`;
  document.body.appendChild(badge);

  const $num = badge.querySelector('#ob-num');
  const $spark = badge.querySelector('#ob-spark');
  const history = [];
  const MAX = 12;

  function pushSpark(n) {
    history.push(n);
    if (history.length > MAX) history.shift();
    const max = Math.max(2, ...history);
    $spark.innerHTML = history.map((v) => {
      const h = Math.max(3, Math.round((v / max) * 16));
      return `<i style="height:${h}px"></i>`;
    }).join('');
  }
  let es = null;

  function connect() {
    try {
      es = new EventSource('/api/online');
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (typeof d.online === 'number') {
            const prev = parseInt($num.textContent, 10);
            $num.textContent = d.online;
            badge.classList.add('pulse');
            badge.classList.toggle('up', d.online > prev);
            badge.classList.toggle('down', d.online < prev);
            setTimeout(() => badge.classList.remove('pulse', 'up', 'down'), 320);
            pushSpark(d.online);
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
