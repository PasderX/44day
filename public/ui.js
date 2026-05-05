// ===== 44day_ — global UI helpers (theme, scroll-top, search-trigger, prompt) =====
(() => {
  // ---------- Theme ----------
  function applyTheme(name) {
    const t = name === 'light' ? 'light' : 'dark';
    if (t === 'dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('44day-theme', t);
    document.querySelectorAll('.theme-btn').forEach((b) =>
      b.classList.toggle('is-active', b.dataset.theme === t)
    );
  }
  applyTheme(localStorage.getItem('44day-theme') || 'dark');
  document.querySelectorAll('.theme-btn').forEach((b) =>
    b.addEventListener('click', () => applyTheme(b.dataset.theme))
  );

  // ---------- Lang switcher (uses hub-i18n if present) ----------
  if (window.mountLangSwitcher) window.mountLangSwitcher('#lang-switch');

  // ---------- Search-trigger → opens command palette ----------
  const st = document.getElementById('search-trigger');
  if (st) {
    st.addEventListener('click', () => window.openCmd && window.openCmd());
    // localized placeholder
    const stText = document.getElementById('st-text');
    if (stText && window.t) {
      const update = () => { stText.textContent = window.t('search.placeholder') || 'search'; };
      update();
      document.addEventListener('lang-change', update);
    }
  }

  // ---------- Scroll-to-top ----------
  const top = document.getElementById('scroll-top');
  if (top) {
    const onScroll = () => top.classList.toggle('show', scrollY > 280);
    window.addEventListener('scroll', onScroll, { passive: true });
    top.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ---------- Dynamic prompt-cmd per page + typing animation ----------
  const promptEl = document.getElementById('prompt-cmd');
  if (promptEl) {
    const path = location.pathname;
    let cmd = 'ls categories/';
    if (path === '/' || path === '/index.html') cmd = 'ls categories/';
    else if (path.startsWith('/section/')) cmd = `cd ${path.replace('/section/', '')}/ && ls`;
    else if (path.startsWith('/article/')) cmd = `cat ${path.replace('/article/', '')}.md`;
    else if (path === '/tools') cmd = 'ls tools/';
    else if (path === '/favorites') cmd = 'cat ~/.44day/favorites';
    else if (path === '/admin') cmd = 'sudo -i';

    // typing animation (once per session, respecting reduced-motion)
    const seenKey = '44day-typed-' + path;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || sessionStorage.getItem(seenKey)) {
      promptEl.textContent = cmd;
    } else {
      sessionStorage.setItem(seenKey, '1');
      promptEl.textContent = '';
      promptEl.classList.add('typing-caret');
      let i = 0;
      const tick = () => {
        if (i <= cmd.length) {
          promptEl.textContent = cmd.slice(0, i++);
          setTimeout(tick, 36 + Math.random() * 40);
        } else {
          setTimeout(() => promptEl.classList.remove('typing-caret'), 1200);
        }
      };
      setTimeout(tick, 150);
    }
  }

  // ---------- Brand-prompt path on internal pages ----------
  const brandPath = document.querySelector('.brand .b-path');
  if (brandPath) {
    // not used on home; section/article scripts will set it
  }
})();
