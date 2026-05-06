// ===== 44day_ sudo — fake terminal overlay (hotkey: ` or ~) =====
(() => {
  if (window.__sudoLoaded) return;
  window.__sudoLoaded = true;

  const FS = {
    'readme.md':
      '# 44day_\n\n' +
      '> free-internet gang · hacker hub · AZ\n\n' +
      'pages:\n  - /section/android — Android tools\n  - /section/configs — injector configs\n  - /section/windows — Windows cracks\n  - /sni — SNI host finder\n  - /admin — admin panel\n\n' +
      'telegram: @baku_root',
    'about.txt':
      'site: 44day_\nauthor: baku_root\nstack: node.js + express + vanilla js\nmotto: "knowledge free, access free"',
    'secret.txt': 'the cake is a lie. try `hack` or `neo`.',
    '.hacker':    'no one can see you typing this. or can they?',
  };

  const COMMANDS = {
    help() {
      return [
        'available commands:',
        '  help            — this message',
        '  ls              — list files',
        '  cat <file>      — print file',
        '  whoami          — print current user',
        '  uname           — system info',
        '  date            — current date',
        '  echo <text>     — echo back',
        '  ps              — fake process list',
        '  ping <host>     — fake ping',
        '  cd <path>       — jump to /path (works with routes: /, /admin, /sni, /section/android)',
        '  hack [target]   — hack the planet',
        '  neo             — wake up',
        '  matrix          — enter the matrix',
        '  tg              — open telegram',
        '  clear           — clear screen',
        '  exit            — close terminal',
      ].join('\n');
    },
    ls() { return Object.keys(FS).sort().map(n => '  ' + n).join('\n') + '\n\n' + '4 files, 0 directories'; },
    cat(args) {
      const f = args[0];
      if (!f) return 'usage: cat <file>';
      if (FS[f] != null) return FS[f];
      return `cat: ${f}: No such file or directory`;
    },
    whoami() {
      push('resolving identity...', 'sys');
      fetch('/api/me', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (d.error) { push('lookup failed', 'err'); return; }
          const lines = [
            `ip:       ${d.ip}`,
            `isp:      ${d.isp || '—'}`,
            `org:      ${d.org || '—'}`,
            `asn:      ${d.asn || '—'}`,
            `geo:      ${d.flag} ${d.city || '—'}, ${d.country || '—'}`,
            `provider: ${d.provider || 'unknown'}`,
            '',
            `> elevated: no — try \`sudo su\``,
          ];
          lines.forEach((l) => push(l, 'out'));
        })
        .catch(() => push('lookup failed', 'err'));
      return null;
    },
    'sudo'(args) {
      if (args[0] === 'su') return 'password: ********\n[authenticating]\n[authenticated]\nroot@44day:~# have fun, hacker.';
      return 'sudo: ' + (args.join(' ') || '') + ': command not found';
    },
    uname() { return '44day-kernel 4.4.0-baku #1337 SMP x86_64 GNU/Linux'; },
    date() { return new Date().toString(); },
    echo(args) { return args.join(' '); },
    ps() {
      return [
        '  PID TTY          TIME CMD',
        '    1 ?        00:00:01 init',
        '   44 ?        00:44:00 44day',
        '  144 ?        00:00:07 music-player',
        '  322 ?        00:00:03 matrix',
        ' 1337 ?        00:13:37 hacker',
        ' 9999 ?        99:99:99 ¯\\_(ツ)_/¯',
      ].join('\n');
    },
    ping(args) {
      const host = args[0] || 'localhost';
      return [
        `PING ${host} (127.0.0.1) 56(84) bytes of data.`,
        `64 bytes from ${host}: icmp_seq=1 ttl=64 time=0.044 ms`,
        `64 bytes from ${host}: icmp_seq=2 ttl=64 time=0.044 ms`,
        `64 bytes from ${host}: icmp_seq=3 ttl=64 time=0.044 ms`,
        '',
        `--- ${host} ping statistics ---`,
        '3 packets transmitted, 3 received, 0% packet loss, time 2002ms',
        'rtt min/avg/max/mdev = 0.044/0.044/0.044/0.000 ms',
      ].join('\n');
    },
    cd(args) {
      const p = args[0] || '/';
      setTimeout(() => (location.href = p), 400);
      return `navigating to ${p}...`;
    },
    tg() {
      setTimeout(() => window.open('https://t.me/baku_root', '_blank'), 300);
      return 'opening telegram: @baku_root ...';
    },
    neo() {
      setTimeout(() => (location.href = '/'), 2500);
      return (
        'Wake up, Neo...\n' +
        'The Matrix has you...\n' +
        'Follow the white rabbit.\n\n' +
        '[follow the link] ████████████ 100%'
      );
    },
    matrix() {
      matrixMode();
      return 'entering the matrix... press ESC to exit';
    },
    hack(args) {
      const target = args.join(' ') || 'the-gibson.gov';
      hackAnimation(target);
      return null; // handled async
    },
    clear() { state.history.length = 0; render(); return null; },
    exit() { close(); return null; },
  };
  COMMANDS.man = COMMANDS.help;
  COMMANDS['?'] = COMMANDS.help;

  // ===== DOM =====
  const root = document.createElement('div');
  root.id = 'sudo-overlay';
  root.innerHTML = `
    <div class="sudo-term">
      <div class="sudo-bar">
        <span class="sudo-btn red"></span>
        <span class="sudo-btn yellow"></span>
        <span class="sudo-btn green"></span>
        <span class="sudo-title">guest@44day: ~ — bash</span>
        <button class="sudo-close" aria-label="close">×</button>
      </div>
      <div class="sudo-body" id="sudo-body"></div>
      <form class="sudo-inputline" id="sudo-form">
        <span class="sudo-prompt">guest@44day<span class="sudo-dim">:~$</span></span>
        <input class="sudo-input" id="sudo-input" autocomplete="off" spellcheck="false" autocapitalize="off"/>
      </form>
    </div>`;
  document.body.appendChild(root);

  const $body   = root.querySelector('#sudo-body');
  const $form   = root.querySelector('#sudo-form');
  const $input  = root.querySelector('#sudo-input');
  const $close  = root.querySelector('.sudo-close');

  const state = { history: [], cmdHist: [], cmdIdx: -1, open: false };

  function open() {
    state.open = true;
    root.classList.add('open');
    if (!state.history.length) {
      push('44day shell [bash 5.1] · type `help` for commands', 'sys');
      push('', 'sys');
    }
    setTimeout(() => $input.focus(), 30);
  }
  function close() { state.open = false; root.classList.remove('open'); }

  function push(text, cls = '') {
    state.history.push({ text, cls });
    render();
  }
  function render() {
    $body.innerHTML = state.history.map(h => {
      const safe = String(h.text == null ? '' : h.text).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      return `<div class="sudo-line ${h.cls}">${safe}</div>`;
    }).join('');
    $body.scrollTop = $body.scrollHeight;
  }

  function runCmd(line) {
    const trimmed = line.trim();
    if (!trimmed) { push(promptLine(''), 'prompt'); return; }
    state.cmdHist.push(trimmed);
    state.cmdIdx = state.cmdHist.length;
    push(promptLine(trimmed), 'prompt');
    const [cmd, ...args] = trimmed.split(/\s+/);
    const fn = COMMANDS[cmd];
    if (!fn) {
      push(`${cmd}: command not found. try \`help\`.`, 'err');
      return;
    }
    const out = fn(args);
    if (out != null) push(out, 'out');
  }
  function promptLine(cmd) {
    return `guest@44day:~$ ${cmd}`;
  }

  // ===== events =====
  $form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $input.value;
    $input.value = '';
    runCmd(v);
  });
  $input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (state.cmdIdx > 0) state.cmdIdx--;
      $input.value = state.cmdHist[state.cmdIdx] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (state.cmdIdx < state.cmdHist.length) state.cmdIdx++;
      $input.value = state.cmdHist[state.cmdIdx] || '';
    } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      push(promptLine($input.value) + '^C', 'prompt');
      $input.value = '';
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      COMMANDS.clear();
    }
  });
  $close.addEventListener('click', close);
  root.addEventListener('click', (e) => { if (e.target === root) close(); });

  document.addEventListener('keydown', (e) => {
    const inField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
    // open hotkey: ` or ~
    if (!state.open && (e.key === '`' || e.key === '~') && !inField && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      open();
    } else if (state.open && e.key === 'Escape') {
      close();
    }
  });

  // expose
  window.sudo = { open, close };

  // ===== hack animation =====
  function hackAnimation(target) {
    const steps = [
      `[*] Initializing exploit module against ${target}`,
      '[*] Scanning ports ...',
      '[+] Port 22 open (SSH)',
      '[+] Port 80 open (HTTP)',
      '[+] Port 443 open (HTTPS)',
      '[*] Fingerprinting services ...',
      '[+] Detected: nginx 1.18.0',
      '[*] Launching payload: reverse_tcp_shell.py',
      '[*] Brute-forcing credentials ...',
      '[##--------] 10%',
      '[####------] 40%',
      '[########--] 80%',
      '[##########] 100%',
      '[+] Access granted.',
      '[+] Uploading rootkit ...',
      '[+] Privilege escalated: root',
      '[+] ████████ YOU ARE IN ████████',
      '',
      'just kidding. this is fake. chill.',
    ];
    let i = 0;
    const timer = setInterval(() => {
      if (i >= steps.length) { clearInterval(timer); return; }
      push(steps[i++], 'out');
    }, 180);
  }

  // ===== matrix rain =====
  function matrixMode() {
    if (document.getElementById('mx-canvas')) return;
    const c = document.createElement('canvas');
    c.id = 'mx-canvas';
    Object.assign(c.style, {
      position: 'fixed', inset: 0, zIndex: 99998,
      pointerEvents: 'none',
    });
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const cols = Math.floor(c.width / 16);
    const drops = new Array(cols).fill(1);
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01';
    function draw() {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#00ff66';
      ctx.font = '16px monospace';
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * 16, drops[i] * 16);
        if (drops[i] * 16 > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    const id = setInterval(draw, 45);
    function stop() {
      clearInterval(id);
      c.remove();
      document.removeEventListener('keydown', kd);
      window.removeEventListener('resize', rs);
    }
    function kd(e) { if (e.key === 'Escape') stop(); }
    function rs() { c.width = innerWidth; c.height = innerHeight; }
    document.addEventListener('keydown', kd);
    window.addEventListener('resize', rs);
  }
})();
