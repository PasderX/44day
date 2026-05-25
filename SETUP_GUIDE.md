# 🔧 Пошаговая настройка TerboXXX

## Шаг 1: Добавьте свои платежные ссылки

Откройте файл `src/lib/utils.ts` и найдите массив `services`.

Замените `'#'` на реальные ссылки для оплаты:

```typescript
export const services = [
  {
    id: 'internet',
    icon: '📡',
    price: '5-15',
    currency: 'AZN',
    link: 'https://your-payment-link.com/internet', // ← ЗДЕСЬ
    popular: true,
  },
  {
    id: 'smm',
    icon: '📈',
    price: '3-50',
    currency: 'AZN',
    link: 'https://your-payment-link.com/smm', // ← ЗДЕСЬ
    popular: true,
  },
  // ... и так далее для всех услуг
];
```

## Шаг 2: Настройте цены

В том же файле измените цены под ваши тарифы:

```typescript
{
  id: 'internet',
  price: '5-15',    // ← Измените на свою цену
  currency: 'AZN',  // Можно изменить на USD, EUR и т.д.
}
```

## Шаг 3: Добавьте контакты

Откройте `src/components/sections/Footer.tsx`:

```typescript
const socialLinks = [
  { 
    icon: Telegram, 
    href: 'https://t.me/ваш_username',  // ← Telegram
    label: 'Telegram' 
  },
  { 
    icon: Instagram, 
    href: 'https://instagram.com/ваш_аккаунт',  // ← Instagram
    label: 'Instagram' 
  },
  { 
    icon: Mail, 
    href: 'mailto:your@email.com',  // ← Email
    label: 'Email' 
  },
  { 
    icon: Phone, 
    href: 'tel:+994501234567',  // ← Телефон
    label: 'Phone' 
  },
];
```

## Шаг 4: Настройте тексты услуг (опционально)

Если хотите изменить описания услуг, откройте `src/lib/translations.ts`:

```typescript
smm: {
  title: 'SMM Xidmətləri',  // ← Название
  desc: 'Telegram, Instagram, TikTok təbliğatı',  // ← Описание
  feature1: 'Abunəçilər və bəyənmələr',  // ← Фичи
  feature2: 'Şərhlər və baxışlar',
  feature3: 'Canlı yayım tamaşaçıları',
},
```

## Шаг 5: Установка и запуск

```bash
# 1. Перейдите в папку проекта
cd terboxxx

# 2. Установите зависимости
npm install

# 3. Запустите локально
npm run dev

# 4. Откройте в браузере
http://localhost:3000
```

## Шаг 6: Деплой на Vercel (БЕСПЛАТНО)

1. Создайте аккаунт на https://vercel.com (войдите через GitHub)
2. Нажмите "New Project"
3. Импортируйте ваш GitHub репозиторий
4. Нажмите "Deploy"
5. Готово! Получите ссылку типа `terboxxx.vercel.app`

### Или деплой вручную:

```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите
vercel login

# Задеплойте
vercel --prod
```

## 🎨 Дополнительные настройки

### Изменить цвета неона

`tailwind.config.ts`:
```typescript
neon: {
  cyan: '#00fff9',    // Ваш цвет
  magenta: '#ff00ff',
  // ...
}
```

### Добавить новую услугу

1. Добавьте в `src/lib/utils.ts`:
```typescript
{
  id: 'newservice',
  icon: '🎯',
  price: '10-20',
  currency: 'AZN',
  link: 'https://your-link.com',
  popular: false,
}
```

2. Добавьте переводы в `src/lib/translations.ts`:
```typescript
newservice: {
  title: 'Новая услуга',
  desc: 'Описание',
  feature1: 'Фича 1',
  feature2: 'Фича 2',
  feature3: 'Фича 3',
},
```

## 🐛 Частые проблемы

**"Module not found"**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Анимации лагают**
- Проверьте производительность в браузере (F12 → Performance)
- Уменьшите количество floating particles в `Hero.tsx`

**Языки не работают**
- Проверьте консоль браузера (F12)
- Убедитесь, что localStorage доступен

## 📞 Нужна помощь?

Если что-то не работает - напишите мне, помогу настроить! 🚀

---

**Удачи с вашим проектом!** 🎉
