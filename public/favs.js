// ===== 44Day Hub — Favorites (localStorage) =====
(function () {
  const KEY = '44day-favs';
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
  window.fav = {
    list() { return load(); },
    has(id) { return load().includes(id); },
    toggle(id) {
      let list = load();
      if (list.includes(id)) { list = list.filter((x) => x !== id); save(list); return false; }
      list.unshift(id); list = list.slice(0, 200); save(list); return true;
    },
    count() { return load().length; },
  };
})();
