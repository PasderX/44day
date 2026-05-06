// ===== 44day_ — replace native [title] with custom [data-tip] =====
// Браузерный native tooltip уродливый и медленный.
// Этот скрипт убирает все title="..." и заменяет на data-tip="..." (наш CSS-стиль).
(() => {
  const SKIP_TAGS = new Set(['IFRAME', 'IMG']); // у этих оставим title для accessibility

  function convert(root) {
    const all = (root || document).querySelectorAll('[title]');
    all.forEach((el) => {
      if (SKIP_TAGS.has(el.tagName)) return;
      const t = el.getAttribute('title');
      if (!t) return;
      // если уже есть data-tip — пропускаем
      if (!el.hasAttribute('data-tip')) el.setAttribute('data-tip', t);
      el.removeAttribute('title');
    });
  }

  function init() {
    convert(document.body);
    // следим за динамически добавленными элементами
    const obs = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes && m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (n.hasAttribute && n.hasAttribute('title')) convert(n.parentNode || n);
          if (n.querySelectorAll) convert(n);
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
