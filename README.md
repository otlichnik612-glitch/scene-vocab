# Scene Vocab

Генератор постов по фильмам и сериалам для Instagram и Lavatop.

Введите английское название фильма — получите связанный комплект:

1. Instagram — Top 7 advanced vocabulary
2. Заголовок Lavatop — Top 10 extra advanced
3. Описание Lavatop
4. Публикация Lavatop — пункты 8–17 и клише с почтой

Есть кнопки **Generate All**, **Copy** и **Случайный фильм**.

## Запуск

Нужны Node.js 22 и переменная `XAI_API_KEY`.

```bash
npm install
XAI_API_KEY=your_key npm run dev
```

## Netlify

Сайт собирается на Netlify (`netlify.toml`). В настройках сайта задайте секрет `XAI_API_KEY`.

## Стек

- TanStack Start + React 19
- Tailwind v4
- xAI Grok для генерации текстов
- Netlify Functions для фоновой генерации
