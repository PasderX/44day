# Subdomain Finder

Веб-приложение для поиска поддоменов. Использует публичные источники:
- **crt.sh** — журналы Certificate Transparency
- **HackerTarget** — публичный hostsearch API
- Опционально резолвит IP-адреса найденных хостов через DNS

## Возможности
- Современный UI (Inter + JetBrains Mono, тёмная тема, glassmorphism)
- Объединение и дедупликация результатов из нескольких источников
- Опциональный DNS-резолвинг (A/AAAA)
- Фильтрация по подстроке, копирование, экспорт в .txt
- Валидация домена, таймауты на запросы

## Запуск
```bash
npm install
npm start
```
Откройте http://localhost:3000

## API
`GET /api/search?domain=example.com&resolve=1`

Ответ:
```json
{
  "domain": "example.com",
  "total": 42,
  "sources": { "crtsh": 40, "hackertarget": 10 },
  "results": [{ "subdomain": "www.example.com", "ips": ["93.184.216.34"] }]
}
```

## Этика
Используйте только для доменов, которыми владеете, или с явного разрешения. Все источники — публичные.
