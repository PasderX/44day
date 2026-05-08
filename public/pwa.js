// ===== 44day_ — PWA registration + install prompt =====
(() => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    showInstallButton();
  });

  function showInstallButton() {
    if (document.getElementById('pwa-install')) return;
    const btn = document.createElement('button');
    btn.id = 'pwa-install';
    btn.className = 'pwa-install';
    btn.setAttribute('data-tip', 'установить как приложение');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>install</span>`;
    btn.addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') btn.remove();
      deferred = null;
    });
    document.body.appendChild(btn);
  }

  // hide button if already installed
  window.addEventListener('appinstalled', () => {
    const b = document.getElementById('pwa-install');
    if (b) b.remove();
  });
})();
