// ===== 44day_ — boot/intro animation (one-time per session) =====
(() => {
  const KEY = '44day:boot:seen';
  if (sessionStorage.getItem(KEY) === '1') return;
  if (location.pathname.startsWith('/admin')) return;

  const lines = [
    { t: 'OK', m: 'Loading 44day_ kernel v2.0...' },
    { t: 'OK', m: 'Mounting /sni hosts database...' },
    { t: 'OK', m: 'Initializing crypto modules [AES-256, RSA-4096]...' },
    { t: 'OK', m: 'Starting tunnel manager...' },
    { t: 'OK', m: 'Connecting to baku_root channel...' },
    { t: '..', m: 'Bypassing ISP filters...', delay: 280 },
    { t: 'OK', m: 'All systems operational.' },
  ];

  const overlay = document.createElement('div');
  overlay.id = 'boot-overlay';
  overlay.innerHTML = `
    <div class="boot-inner">
      <pre class="boot-ascii"> _  _  _   _                _____ 
| || || | | |   ___ ___ ___|___  |
| || || |_| |  | -_| .'| .'|   _/ 
|__||_||___,_|_|___|__,|__,|_|   
                       _____ ___  
                      |__   |  _| 
                       |   _|_| | 
                       |_|  |___| v2.0</pre>
      <div class="boot-prompt">root@44day:~# ./boot.sh</div>
      <div class="boot-log" id="boot-log"></div>
      <button class="boot-skip" id="boot-skip">[ press any key or click to skip ]</button>
    </div>`;
  document.body.appendChild(overlay);

  const log = overlay.querySelector('#boot-log');
  let i = 0;
  let killed = false;
  let timer = null;

  function step() {
    if (killed) return;
    if (i >= lines.length) return finish(500);
    const ln = lines[i++];
    const row = document.createElement('div');
    row.className = 'b-row';
    const tagCls = ln.t === 'OK' ? 'ok' : ln.t === '..' ? 'pend' : 'err';
    row.innerHTML = `<span class="b-tag ${tagCls}">[ ${ln.t} ]</span> <span class="b-msg"></span><span class="b-cur">_</span>`;
    log.appendChild(row);
    typeMsg(row.querySelector('.b-msg'), row.querySelector('.b-cur'), ln.m, () => {
      timer = setTimeout(step, ln.delay || 90);
    });
  }
  function typeMsg(el, cur, text, done) {
    let k = 0;
    const id = setInterval(() => {
      if (killed) { clearInterval(id); return; }
      el.textContent += text[k++];
      if (k >= text.length) { clearInterval(id); cur.remove(); done && done(); }
    }, 12);
  }
  function finish(delay) {
    setTimeout(() => {
      overlay.classList.add('out');
      setTimeout(() => overlay.remove(), 350);
    }, delay || 0);
  }
  function skip() {
    if (killed) return;
    killed = true;
    if (timer) clearTimeout(timer);
    overlay.classList.add('out');
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.querySelector('#boot-skip').addEventListener('click', skip);
  document.addEventListener('keydown', skip, { once: true });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) skip(); });

  sessionStorage.setItem(KEY, '1');
  setTimeout(step, 250);
})();
