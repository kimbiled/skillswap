# SkillSwap KZ

Лендинг пилота SkillSwap KZ — бесплатной доски обмена навыками для студентов Астаны.

Стек: React 19, TypeScript, Vite, Tailwind CSS 4, Ant Design 6.

## Запуск

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # проверка типов и сборка в dist/
npm run preview   # просмотр собранной версии
```

## Структура

- `src/data.ts` — все тексты страницы
- `src/sections/` — секции лендинга
- `src/components/` — навигация и «бумажные» элементы (листовки, отрывные листочки)
- `src/index.css` — токены Tailwind и стили листовок
- `src/theme.ts` — тема antd в той же палитре

Стили antd вынесены в CSS-слой `antd` между `base` и `utilities` Tailwind, поэтому утилиты Tailwind переопределяют antd без `!important`.

## Перед запуском в продакшн

- Укажите адрес приёма заявок в `FORM_ENDPOINT` в `src/sections/Join.tsx`. Пока он пустой, форма только показывает сообщение об успехе и никуда не отправляет данные.
- Замените `hello@skillswap.kz` на настоящую почту.
