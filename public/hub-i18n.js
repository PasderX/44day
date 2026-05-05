// ===== 44day_ — i18n (RU / AZ) =====
// принципы:
//   - НЕ переводим имена программ (HTTP Injector, Spotify, Termux, Adobe...)
//   - Переводим ТОЛЬКО UI: кнопки, секции, инструкции, описания, статьи
//   - Качественный, человеческий перевод. Без машинного.

(() => {
  const LS_KEY = '44day-lang';
  const dict = {
    ru: {
      // navigation
      'nav.tools':       'инструменты',
      'nav.favs':        'избранное',
      'nav.home':        'главная',
      'nav.admin':       'админка',

      // search
      'search.placeholder': 'поиск...',
      'search.empty':     'ничего не найдено',
      'search.hint':      'начните вводить чтобы искать',

      // home
      'home.categories':  'разделы',
      'home.recent':      'последние добавленные',
      'home.featured':    'рекомендуем',
      'home.trending':    'популярное сейчас',

      // common
      'btn.original':     'Оригинал',
      'btn.mod':          'Mod версия',
      'btn.read':         'читать',
      'btn.download':     'скачать',
      'btn.open':         'открыть',
      'btn.copy':         'копировать',
      'btn.copied':       'скопировано',
      'btn.back':         'назад',
      'btn.backHome':     '← на главную',
      'btn.save':         'сохранить',
      'btn.cancel':       'отмена',
      'btn.delete':       'удалить',
      'btn.edit':         'изменить',
      'btn.add':          'добавить',
      'btn.confirm':      'подтвердить',
      'btn.tryAgain':     'попробовать снова',

      // section page
      'sec.itemsCount':   'записей',
      'sec.totalDl':      'скачиваний',
      'sec.subAll':       'все',
      'sec.search':       'поиск в разделе...',
      'sec.sort':         'сортировка',
      'sec.sortPopular':  'по популярности',
      'sec.sortNew':      'по дате',
      'sec.sortRating':   'по рейтингу',
      'sec.sortAZ':       'по алфавиту',
      'sec.empty':        'здесь пока пусто',
      'sec.emptyHint':    'добавь первую запись через панель администратора',

      // article
      'art.readTime':     'мин чтения',
      'art.published':    'опубликовано',
      'art.updated':      'обновлено',
      'art.tags':         'тэги',
      'art.related':      'похожее',

      // states
      'state.loading':    'загружаем...',
      'state.error':      'ошибка',
      'state.tryAgain':   'попробуй ещё раз',
      'state.copied':     'скопировано в буфер',
      'state.saved':      'сохранено',

      // footer
      'foot.lang':        'язык',
      'foot.theme':       'тема',
    },

    az: {
      'nav.tools':        'alətlər',
      'nav.favs':         'seçilmişlər',
      'nav.home':         'ana səhifə',
      'nav.admin':        'admin',

      'search.placeholder': 'axtarış...',
      'search.empty':     'heç nə tapılmadı',
      'search.hint':      'axtarmaq üçün yazmağa başlayın',

      'home.categories':  'bölmələr',
      'home.recent':      'son əlavələr',
      'home.featured':    'tövsiyə olunur',
      'home.trending':    'indi populyar',

      'btn.original':     'Orijinal',
      'btn.mod':          'Mod versiyası',
      'btn.read':         'oxu',
      'btn.download':     'yüklə',
      'btn.open':         'aç',
      'btn.copy':         'köçür',
      'btn.copied':       'köçürüldü',
      'btn.back':         'geri',
      'btn.backHome':     '← ana səhifəyə',
      'btn.save':         'yadda saxla',
      'btn.cancel':       'ləğv et',
      'btn.delete':       'sil',
      'btn.edit':         'dəyişdir',
      'btn.add':          'əlavə et',
      'btn.confirm':      'təsdiqlə',
      'btn.tryAgain':     'yenidən cəhd et',

      'sec.itemsCount':   'qeyd',
      'sec.totalDl':      'yükləmə',
      'sec.subAll':       'hamısı',
      'sec.search':       'bölmədə axtarış...',
      'sec.sort':         'sıralama',
      'sec.sortPopular':  'populyarlığa görə',
      'sec.sortNew':      'tarixə görə',
      'sec.sortRating':   'reytinqə görə',
      'sec.sortAZ':       'əlifba sırası',
      'sec.empty':        'burada hələ heç nə yoxdur',
      'sec.emptyHint':    'admin paneldən ilk qeydi əlavə edin',

      'art.readTime':     'dəq oxu',
      'art.published':    'dərc edildi',
      'art.updated':      'yeniləndi',
      'art.tags':         'teqlər',
      'art.related':      'oxşar',

      'state.loading':    'yüklənir...',
      'state.error':      'xəta',
      'state.tryAgain':   'yenidən cəhd edin',
      'state.copied':     'mübadilə yaddaşına köçürüldü',
      'state.saved':      'yadda saxlanıldı',

      'foot.lang':        'dil',
      'foot.theme':       'görünüş',
    },
  };

  function getLang() {
    return localStorage.getItem(LS_KEY) || 'ru';
  }
  function setLang(lang) {
    if (!dict[lang]) lang = 'ru';
    localStorage.setItem(LS_KEY, lang);
    document.documentElement.lang = lang;
    applyDOM();
    document.dispatchEvent(new CustomEvent('lang-change', { detail: { lang } }));
  }
  function t(key) {
    const lang = getLang();
    return (dict[lang] && dict[lang][key]) || (dict.ru[lang] && dict.ru[key]) || key;
  }

  // выбор поля по языку: name vs name_az  (для items/categories)
  function tField(obj, base) {
    if (!obj) return '';
    const lang = getLang();
    if (lang === 'az') {
      const azKey = base + '_az';
      if (obj[azKey] && String(obj[azKey]).trim()) return obj[azKey];
    }
    return obj[base] || '';
  }

  function applyDOM() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      const val = t(k);
      if (val) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      const cfg = el.getAttribute('data-i18n-attr'); // "placeholder:search.placeholder"
      cfg.split(',').forEach((pair) => {
        const [attr, key] = pair.split(':');
        if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
      });
    });
    document.documentElement.lang = getLang();
  }

  // mount switcher
  function mountLangSwitcher(selector) {
    const root = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!root) return;
    const cur = getLang();
    root.innerHTML = `
      <div class="theme-switch" title="lang">
        <button class="theme-btn ${cur==='ru'?'is-active':''}" data-lang="ru" aria-label="ru" style="font-family:var(--font-mono);font-size:11px;font-weight:600">RU</button>
        <button class="theme-btn ${cur==='az'?'is-active':''}" data-lang="az" aria-label="az" style="font-family:var(--font-mono);font-size:11px;font-weight:600">AZ</button>
      </div>`;
    root.querySelectorAll('[data-lang]').forEach((b) => {
      b.addEventListener('click', () => {
        setLang(b.dataset.lang);
        root.querySelectorAll('[data-lang]').forEach((x) =>
          x.classList.toggle('is-active', x.dataset.lang === b.dataset.lang));
      });
    });
  }

  // initial DOM apply
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDOM);
  } else {
    applyDOM();
  }

  // expose
  window.t = t;
  window.tField = tField;
  window.getLang = getLang;
  window.setLang = setLang;
  window.mountLangSwitcher = mountLangSwitcher;
  // legacy compatibility (some old code calls window.icon(emoji))
  window.icon = (e) => e || '';
})();
